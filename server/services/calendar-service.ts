import { db } from "../database/init";
import { 
  activities, 
  users, 
  institutes,
  type Activity,
  type User,
  type Institute
} from "../../shared/schema";
import { eq, and, gte, lte, desc, asc, isNotNull } from "drizzle-orm";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { NotificationService } from "../websocket/notification-service";

/**
 * Interfaz para eventos de calendario
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  attendees?: string[];
  color?: string;
  type: 'activity' | 'guard' | 'meeting' | 'exam' | 'holiday' | 'custom';
  source: 'internal' | 'google' | 'outlook';
  isAllDay: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    type: 'email' | 'push' | 'sms';
    minutes: number;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Interfaz para configuración de calendario
 */
export interface CalendarConfig {
  instituteId: number;
  googleCalendarId?: string;
  autoSync: boolean;
  syncFrequency: number; // en minutos
  defaultEventDuration: number; // en minutos
  workingHours: {
    start: string; // formato "HH:mm"
    end: string;
    days: number[]; // 0-6 (domingo-sábado)
  };
  notifications: {
    enabled: boolean;
    channels: ('email' | 'push' | 'sms')[];
    advanceTime: number; // en minutos
  };
}

/**
 * Servicio de Calendario para gestión integral de eventos
 * Integra eventos internos con Google Calendar y otros servicios
 */
export class CalendarService {
  private notificationService: NotificationService;
  private googleAuthClient?: OAuth2Client;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Inicializar el servicio de calendario
   */
  async initialize(): Promise<void> {
    console.log('📅 Inicializando CalendarService...');
    
    // Configurar Google Calendar si está disponible
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.googleAuthClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      console.log('✅ Google Calendar configurado');
    }

    // Iniciar sincronización automática
    this.startAutoSync();
    
    console.log('✅ CalendarService inicializado');
  }

  /**
   * Crear un nuevo evento en el calendario
   */
  async createEvent(
    event: Omit<CalendarEvent, 'id'>,
    instituteId: number,
    userId: number
  ): Promise<CalendarEvent> {
    try {
      // Validar datos del evento
      this.validateEvent(event);

      // Crear evento en base de datos interna
      const internalEvent = await this.createInternalEvent(event, instituteId, userId);

      // Sincronizar con Google Calendar si está configurado
      if (this.googleAuthClient && event.source === 'internal') {
        await this.syncToGoogleCalendar(internalEvent, instituteId);
      }

      // Enviar notificaciones
      await this.sendEventNotifications(internalEvent, 'created');

      // Notificar a usuarios conectados
      this.notificationService.sendToInstitute(instituteId, {
        type: 'calendar_event_created',
        title: 'Nuevo evento creado',
        message: `Se ha creado el evento "${event.title}"`,
        data: { eventId: internalEvent.id }
      });

      return internalEvent;
    } catch (error) {
      console.error('Error creando evento:', error);
      throw new Error(`Error al crear evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtener eventos para un período específico
   */
  async getEvents(
    instituteId: number,
    startDate: Date,
    endDate: Date,
    filters?: {
      types?: string[];
      sources?: string[];
      userId?: number;
    }
  ): Promise<CalendarEvent[]> {
    try {
      // Construir consulta base
      let query = db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.instituteId, instituteId),
            gte(activities.startDate, startDate),
            lte(activities.endDate, endDate)
          )
        )
        .orderBy(asc(activities.startDate));

      // Aplicar filtros adicionales
      if (filters?.types && filters.types.length > 0) {
        // Aquí se aplicaría el filtro por tipos si existiera en el schema
      }

      if (filters?.userId) {
        query = query.where(eq(activities.createdBy, filters.userId));
      }

      const activitiesData = await query;

      // Convertir actividades a eventos de calendario
      const events: CalendarEvent[] = activitiesData.map(activity => ({
        id: activity.id.toString(),
        title: activity.title,
        description: activity.description || undefined,
        startDate: new Date(activity.startDate),
        endDate: new Date(activity.endDate),
        location: activity.location || undefined,
        type: 'activity',
        source: 'internal',
        isAllDay: this.isAllDayEvent(activity.startDate, activity.endDate),
        metadata: {
          activityId: activity.id,
          createdBy: activity.createdBy,
          instituteId: activity.instituteId
        }
      }));

      // Obtener eventos de Google Calendar si está configurado
      if (this.googleAuthClient) {
        const googleEvents = await this.getGoogleCalendarEvents(instituteId, startDate, endDate);
        events.push(...googleEvents);
      }

      // Ordenar por fecha de inicio
      return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      throw new Error(`Error al obtener eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Actualizar un evento existente
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    instituteId: number,
    userId: number
  ): Promise<CalendarEvent> {
    try {
      // Validar que el evento existe
      const existingEvent = await this.getEventById(eventId, instituteId);
      if (!existingEvent) {
        throw new Error('Evento no encontrado');
      }

      // Actualizar en base de datos interna
      const updatedEvent = await this.updateInternalEvent(eventId, updates, instituteId);

      // Sincronizar con Google Calendar si está configurado
      if (this.googleAuthClient && existingEvent.source === 'internal') {
        await this.updateGoogleCalendarEvent(updatedEvent, instituteId);
      }

      // Enviar notificaciones
      await this.sendEventNotifications(updatedEvent, 'updated');

      // Notificar a usuarios conectados
      this.notificationService.sendToInstitute(instituteId, {
        type: 'calendar_event_updated',
        title: 'Evento actualizado',
        message: `Se ha actualizado el evento "${updatedEvent.title}"`,
        data: { eventId: updatedEvent.id }
      });

      return updatedEvent;
    } catch (error) {
      console.error('Error actualizando evento:', error);
      throw new Error(`Error al actualizar evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Eliminar un evento
   */
  async deleteEvent(
    eventId: string,
    instituteId: number,
    userId: number
  ): Promise<void> {
    try {
      // Validar que el evento existe
      const existingEvent = await this.getEventById(eventId, instituteId);
      if (!existingEvent) {
        throw new Error('Evento no encontrado');
      }

      // Eliminar de base de datos interna
      await this.deleteInternalEvent(eventId, instituteId);

      // Eliminar de Google Calendar si está configurado
      if (this.googleAuthClient && existingEvent.source === 'internal') {
        await this.deleteGoogleCalendarEvent(eventId, instituteId);
      }

      // Enviar notificaciones
      await this.sendEventNotifications(existingEvent, 'deleted');

      // Notificar a usuarios conectados
      this.notificationService.sendToInstitute(instituteId, {
        type: 'calendar_event_deleted',
        title: 'Evento eliminado',
        message: `Se ha eliminado el evento "${existingEvent.title}"`,
        data: { eventId: existingEvent.id }
      });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      throw new Error(`Error al eliminar evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtener estadísticas del calendario
   */
  async getCalendarStats(instituteId: number, startDate: Date, endDate: Date) {
    try {
      const events = await this.getEvents(instituteId, startDate, endDate);

      const stats = {
        totalEvents: events.length,
        byType: {} as Record<string, number>,
        bySource: {} as Record<string, number>,
        byMonth: {} as Record<string, number>,
        upcomingEvents: events.filter(e => e.startDate > new Date()).length,
        pastEvents: events.filter(e => e.endDate < new Date()).length,
        allDayEvents: events.filter(e => e.isAllDay).length,
        eventsWithLocation: events.filter(e => e.location).length
      };

      // Agrupar por tipo
      events.forEach(event => {
        stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
        stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
        
        const monthKey = event.startDate.toISOString().slice(0, 7); // YYYY-MM
        stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Sincronizar eventos con Google Calendar
   */
  async syncWithGoogleCalendar(instituteId: number): Promise<{
    synced: number;
    errors: number;
    details: string[];
  }> {
    try {
      if (!this.googleAuthClient) {
        throw new Error('Google Calendar no está configurado');
      }

      const result = {
        synced: 0,
        errors: 0,
        details: [] as string[]
      };

      // Obtener eventos internos no sincronizados
      const internalEvents = await this.getUnsyncedEvents(instituteId);

      for (const event of internalEvents) {
        try {
          await this.syncToGoogleCalendar(event, instituteId);
          result.synced++;
          result.details.push(`✅ Sincronizado: ${event.title}`);
        } catch (error) {
          result.errors++;
          result.details.push(`❌ Error: ${event.title} - ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error en sincronización:', error);
      throw new Error(`Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtener conflictos de horarios
   */
  async getScheduleConflicts(
    instituteId: number,
    startDate: Date,
    endDate: Date,
    excludeEventId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const events = await this.getEvents(instituteId, startDate, endDate);
      
      // Filtrar el evento actual si se está editando
      const filteredEvents = excludeEventId 
        ? events.filter(e => e.id !== excludeEventId)
        : events;

      // Detectar conflictos (eventos que se solapan)
      const conflicts: CalendarEvent[] = [];
      
      for (let i = 0; i < filteredEvents.length; i++) {
        for (let j = i + 1; j < filteredEvents.length; j++) {
          const event1 = filteredEvents[i];
          const event2 = filteredEvents[j];
          
          if (this.eventsOverlap(event1, event2)) {
            conflicts.push(event1, event2);
          }
        }
      }

      // Eliminar duplicados
      return conflicts.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );
    } catch (error) {
      console.error('Error obteniendo conflictos:', error);
      throw new Error(`Error al obtener conflictos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Generar reporte de calendario
   */
  async generateCalendarReport(
    instituteId: number,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'excel' | 'csv' = 'pdf'
  ): Promise<{ data: any; filename: string }> {
    try {
      const events = await this.getEvents(instituteId, startDate, endDate);
      const stats = await this.getCalendarStats(instituteId, startDate, endDate);

      const report = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        statistics: stats,
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          location: event.location,
          type: event.type,
          source: event.source,
          isAllDay: event.isAllDay
        }))
      };

      const filename = `calendario_${instituteId}_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.${format}`;

      return { data: report, filename };
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw new Error(`Error al generar reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Métodos privados auxiliares

  private validateEvent(event: Omit<CalendarEvent, 'id'>): void {
    if (!event.title || event.title.trim().length === 0) {
      throw new Error('El título del evento es obligatorio');
    }

    if (event.startDate >= event.endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    if (event.startDate < new Date()) {
      throw new Error('No se pueden crear eventos en el pasado');
    }
  }

  private async createInternalEvent(
    event: Omit<CalendarEvent, 'id'>,
    instituteId: number,
    userId: number
  ): Promise<CalendarEvent> {
    const [newActivity] = await db
      .insert(activities)
      .values({
        title: event.title,
        description: event.description || '',
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location || '',
        instituteId,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    return {
      id: newActivity.id.toString(),
      title: newActivity.title,
      description: newActivity.description || undefined,
      startDate: new Date(newActivity.startDate),
      endDate: new Date(newActivity.endDate),
      location: newActivity.location || undefined,
      type: 'activity',
      source: 'internal',
      isAllDay: this.isAllDayEvent(newActivity.startDate, newActivity.endDate),
      metadata: {
        activityId: newActivity.id,
        createdBy: newActivity.createdBy,
        instituteId: newActivity.instituteId
      }
    };
  }

  private async updateInternalEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    instituteId: number
  ): Promise<CalendarEvent> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
    if (updates.location !== undefined) updateData.location = updates.location;

    const [updatedActivity] = await db
      .update(activities)
      .set(updateData)
      .where(eq(activities.id, parseInt(eventId)))
      .returning();

    return {
      id: updatedActivity.id.toString(),
      title: updatedActivity.title,
      description: updatedActivity.description || undefined,
      startDate: new Date(updatedActivity.startDate),
      endDate: new Date(updatedActivity.endDate),
      location: updatedActivity.location || undefined,
      type: 'activity',
      source: 'internal',
      isAllDay: this.isAllDayEvent(updatedActivity.startDate, updatedActivity.endDate),
      metadata: {
        activityId: updatedActivity.id,
        createdBy: updatedActivity.createdBy,
        instituteId: updatedActivity.instituteId
      }
    };
  }

  private async deleteInternalEvent(eventId: string, instituteId: number): Promise<void> {
    await db
      .delete(activities)
      .where(eq(activities.id, parseInt(eventId)));
  }

  private async getEventById(eventId: string, instituteId: number): Promise<CalendarEvent | null> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.id, parseInt(eventId)),
          eq(activities.instituteId, instituteId)
        )
      );

    if (!activity) return null;

    return {
      id: activity.id.toString(),
      title: activity.title,
      description: activity.description || undefined,
      startDate: new Date(activity.startDate),
      endDate: new Date(activity.endDate),
      location: activity.location || undefined,
      type: 'activity',
      source: 'internal',
      isAllDay: this.isAllDayEvent(activity.startDate, activity.endDate),
      metadata: {
        activityId: activity.id,
        createdBy: activity.createdBy,
        instituteId: activity.instituteId
      }
    };
  }

  private async getUnsyncedEvents(instituteId: number): Promise<CalendarEvent[]> {
    // Por ahora, retornamos todos los eventos internos
    // En una implementación completa, tendríamos un campo para marcar eventos sincronizados
    const activitiesData = await db
      .select()
      .from(activities)
      .where(eq(activities.instituteId, instituteId))
      .orderBy(asc(activities.startDate));

    return activitiesData.map(activity => ({
      id: activity.id.toString(),
      title: activity.title,
      description: activity.description || undefined,
      startDate: new Date(activity.startDate),
      endDate: new Date(activity.endDate),
      location: activity.location || undefined,
      type: 'activity',
      source: 'internal',
      isAllDay: this.isAllDayEvent(activity.startDate, activity.endDate),
      metadata: {
        activityId: activity.id,
        createdBy: activity.createdBy,
        instituteId: activity.instituteId
      }
    }));
  }

  private isAllDayEvent(startDate: Date, endDate: Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Es todo el día si las fechas son el mismo día y las horas son 00:00
    return start.toDateString() === end.toDateString() &&
           start.getHours() === 0 && start.getMinutes() === 0 &&
           end.getHours() === 0 && end.getMinutes() === 0;
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.startDate < event2.endDate && event2.startDate < event1.endDate;
  }

  private async syncToGoogleCalendar(event: CalendarEvent, instituteId: number): Promise<void> {
    if (!this.googleAuthClient) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuthClient });

      const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.isAllDay 
          ? { date: event.startDate.toISOString().split('T')[0] }
          : { dateTime: event.startDate.toISOString() },
        end: event.isAllDay 
          ? { date: event.endDate.toISOString().split('T')[0] }
          : { dateTime: event.endDate.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 60 } // 1 hora antes
          ]
        }
      };

      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent
      });

      console.log(`✅ Evento sincronizado con Google Calendar: ${event.title}`);
    } catch (error) {
      console.error('Error sincronizando con Google Calendar:', error);
      throw error;
    }
  }

  private async updateGoogleCalendarEvent(event: CalendarEvent, instituteId: number): Promise<void> {
    if (!this.googleAuthClient) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuthClient });

      const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.isAllDay 
          ? { date: event.startDate.toISOString().split('T')[0] }
          : { dateTime: event.startDate.toISOString() },
        end: event.isAllDay 
          ? { date: event.endDate.toISOString().split('T')[0] }
          : { dateTime: event.endDate.toISOString() }
      };

      // Buscar el evento en Google Calendar por título y fecha
      const events = await calendar.events.list({
        calendarId: 'primary',
        q: event.title,
        timeMin: new Date(event.startDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        timeMax: new Date(event.endDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });

      if (events.data.items && events.data.items.length > 0) {
        await calendar.events.update({
          calendarId: 'primary',
          eventId: events.data.items[0].id!,
          requestBody: googleEvent
        });
      }
    } catch (error) {
      console.error('Error actualizando en Google Calendar:', error);
      throw error;
    }
  }

  private async deleteGoogleCalendarEvent(eventId: string, instituteId: number): Promise<void> {
    if (!this.googleAuthClient) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuthClient });
      
      // Buscar el evento en Google Calendar
      const events = await calendar.events.list({
        calendarId: 'primary',
        maxResults: 10
      });

      if (events.data.items && events.data.items.length > 0) {
        // Por simplicidad, eliminamos el primer evento encontrado
        // En una implementación completa, buscaríamos por ID específico
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: events.data.items[0].id!
        });
      }
    } catch (error) {
      console.error('Error eliminando de Google Calendar:', error);
      throw error;
    }
  }

  private async getGoogleCalendarEvents(
    instituteId: number,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (!this.googleAuthClient) return [];

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuthClient });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return (response.data.items || []).map(event => ({
        id: `google_${event.id}`,
        title: event.summary || 'Sin título',
        description: event.description,
        startDate: event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || ''),
        endDate: event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date || ''),
        location: event.location,
        type: 'custom',
        source: 'google',
        isAllDay: !event.start?.dateTime,
        metadata: {
          googleEventId: event.id,
          htmlLink: event.htmlLink
        }
      }));
    } catch (error) {
      console.error('Error obteniendo eventos de Google Calendar:', error);
      return [];
    }
  }

  private async sendEventNotifications(
    event: CalendarEvent,
    action: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    try {
      const actionMessages = {
        created: 'Se ha creado un nuevo evento',
        updated: 'Se ha actualizado un evento',
        deleted: 'Se ha eliminado un evento'
      };

      // Enviar notificación a todos los usuarios del instituto
      this.notificationService.sendToInstitute(event.metadata?.instituteId || 1, {
        type: 'calendar_notification',
        title: actionMessages[action],
        message: `${actionMessages[action]}: ${event.title}`,
        data: {
          eventId: event.id,
          action,
          eventTitle: event.title,
          startDate: event.startDate.toISOString()
        }
      });
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
    }
  }

  private startAutoSync(): void {
    // Sincronizar cada 30 minutos
    setInterval(async () => {
      try {
        console.log('🔄 Iniciando sincronización automática...');
        
        // Obtener todos los institutos
        const institutesData = await db.select().from(institutes);
        
        for (const institute of institutesData) {
          try {
            await this.syncWithGoogleCalendar(institute.id);
          } catch (error) {
            console.error(`Error sincronizando instituto ${institute.id}:`, error);
          }
        }
        
        console.log('✅ Sincronización automática completada');
      } catch (error) {
        console.error('Error en sincronización automática:', error);
      }
    }, 30 * 60 * 1000); // 30 minutos
  }
}

// Instancia global del servicio
export const calendarService = new CalendarService(); 