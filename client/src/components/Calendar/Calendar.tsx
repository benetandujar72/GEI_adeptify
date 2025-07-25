import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as FullCalendar } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Settings, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/useApi';
import { EventForm } from './EventForm';
import { EventDetails } from './EventDetails';
import { CalendarStats } from './CalendarStats';
import { CalendarFilters } from './CalendarFilters';
import type { CalendarEvent } from '@/types/calendar';

interface CalendarProps {
  className?: string;
}

export function Calendar({ className }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    sources: [] as string[],
    userId: undefined as number | undefined
  });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { toast } = useToast();
  const api = useApi();

  // Obtener eventos del calendario
  const fetchEvents = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/events', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...filters
        }
      });

      if (response.success) {
        setEvents(response.data);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los eventos',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los eventos del calendario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [api, filters, toast]);

  // Cargar eventos iniciales
  useEffect(() => {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    fetchEvents(startDate, endDate);
  }, [fetchEvents, currentDate]);

  // Convertir eventos al formato de FullCalendar
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.isAllDay,
    description: event.description,
    location: event.location,
    backgroundColor: getEventColor(event.type),
    borderColor: getEventColor(event.type),
    textColor: '#ffffff',
    extendedProps: {
      type: event.type,
      source: event.source,
      metadata: event.metadata
    }
  }));

  // Función para obtener color según tipo de evento
  function getEventColor(type: string): string {
    const colors = {
      activity: '#3b82f6', // blue
      guard: '#ef4444', // red
      meeting: '#10b981', // green
      exam: '#f59e0b', // amber
      holiday: '#8b5cf6', // purple
      custom: '#6b7280' // gray
    };
    return colors[type as keyof typeof colors] || colors.custom;
  }

  // Manejadores de eventos del calendario
  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent({
      id: '',
      title: '',
      description: '',
      startDate: selectInfo.start,
      endDate: selectInfo.end,
      type: 'activity',
      source: 'internal',
      isAllDay: selectInfo.allDay
    });
    setShowEventForm(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setShowEventDetails(true);
    }
  };

  const handleEventDrop = async (dropInfo: any) => {
    try {
      const event = events.find(e => e.id === dropInfo.event.id);
      if (!event) return;

      const updates = {
        startDate: dropInfo.event.start,
        endDate: dropInfo.event.end,
        isAllDay: dropInfo.event.allDay
      };

      const response = await api.put(`/calendar/events/${event.id}`, updates);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: 'Evento actualizado correctamente'
        });
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el evento',
          variant: 'destructive'
        });
        // Revertir el cambio
        dropInfo.revert();
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar el evento',
        variant: 'destructive'
      });
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    try {
      const event = events.find(e => e.id === resizeInfo.event.id);
      if (!event) return;

      const updates = {
        startDate: resizeInfo.event.start,
        endDate: resizeInfo.event.end
      };

      const response = await api.put(`/calendar/events/${event.id}`, updates);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: 'Evento actualizado correctamente'
        });
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el evento',
          variant: 'destructive'
        });
        resizeInfo.revert();
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar el evento',
        variant: 'destructive'
      });
      resizeInfo.revert();
    }
  };

  // Manejadores de formularios
  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      const response = await api.post('/calendar/events', eventData);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: 'Evento creado correctamente'
        });
        
        setShowEventForm(false);
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear el evento',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Error al crear el evento',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}`, updates);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: 'Evento actualizado correctamente'
        });
        
        setShowEventDetails(false);
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el evento',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar el evento',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await api.delete(`/calendar/events/${eventId}`);

      if (response.success) {
        toast({
          title: 'Éxito',
          description: 'Evento eliminado correctamente'
        });
        
        setShowEventDetails(false);
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el evento',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el evento',
        variant: 'destructive'
      });
    }
  };

  // Sincronizar con Google Calendar
  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await api.post('/calendar/sync');

      if (response.success) {
        toast({
          title: 'Sincronización completada',
          description: `${response.data.synced} eventos sincronizados, ${response.data.errors} errores`
        });
        
        // Actualizar eventos
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(startDate, endDate);
      } else {
        toast({
          title: 'Error',
          description: 'Error en la sincronización',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Error',
        description: 'Error al sincronizar el calendario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte
  const handleGenerateReport = async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await api.post('/calendar/report', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: 'pdf'
      });

      if (response.success) {
        toast({
          title: 'Reporte generado',
          description: 'El reporte se ha generado correctamente'
        });
        
        // Aquí se podría descargar el archivo
        console.log('Report data:', response.data);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo generar el reporte',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Error al generar el reporte',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario Académico
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {events.length} eventos
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                size="sm"
                onClick={() => setShowEventForm(true)}
              >
                <Plus className="h-4 w-4" />
                Nuevo Evento
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          {showFilters && (
            <div className="mb-4">
              <CalendarFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}
          
          {/* Estadísticas */}
          {showStats && (
            <div className="mb-4">
              <CalendarStats
                events={events}
                onClose={() => setShowStats(false)}
                onGenerateReport={handleGenerateReport}
              />
            </div>
          )}
          
          {/* Calendario */}
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              initialView={currentView}
              locale={esLocale}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              events={calendarEvents}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              height="auto"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={true}
              slotDuration="00:30:00"
              slotLabelInterval="01:00"
              nowIndicator={true}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5], // Lunes a viernes
                startTime: '08:00',
                endTime: '18:00'
              }}
              eventDisplay="block"
              eventColor="#3b82f6"
              eventTextColor="#ffffff"
              eventBorderColor="#1e40af"
              dayCellContent={(arg) => (
                <div className="fc-daygrid-day-number">
                  {arg.dayNumberText}
                </div>
              )}
              eventContent={(arg) => (
                <div className="fc-event-main-content">
                  <div className="font-medium">{arg.event.title}</div>
                  {arg.event.extendedProps.location && (
                    <div className="text-xs opacity-75">
                      📍 {arg.event.extendedProps.location}
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formulario de evento */}
      {showEventForm && (
        <EventForm
          event={selectedEvent}
          onSave={handleCreateEvent}
          onCancel={() => setShowEventForm(false)}
        />
      )}

      {/* Detalles del evento */}
      {showEventDetails && selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setShowEventDetails(false)}
        />
      )}
    </div>
  );
} 