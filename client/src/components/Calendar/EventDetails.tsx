import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Bell, Edit, Trash2, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventForm } from './EventForm';
import type { CalendarEvent } from '@/types/calendar';

interface EventDetailsProps {
  event: CalendarEvent;
  onUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

export function EventDetails({ event, onUpdate, onDelete, onClose }: EventDetailsProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // Formatear fecha y hora
  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Formatear solo fecha
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  // Formatear solo hora
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Obtener color del tipo de evento
  const getEventTypeColor = (type: string): string => {
    const colors = {
      activity: 'bg-blue-100 text-blue-800',
      guard: 'bg-red-100 text-red-800',
      meeting: 'bg-green-100 text-green-800',
      exam: 'bg-amber-100 text-amber-800',
      holiday: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  // Obtener nombre del tipo de evento
  const getEventTypeName = (type: string): string => {
    const names = {
      activity: 'Actividad',
      guard: 'Guardia',
      meeting: 'Reunión',
      exam: 'Examen',
      holiday: 'Vacaciones',
      custom: 'Personalizado'
    };
    return names[type as keyof typeof names] || 'Personalizado';
  };

  // Obtener nombre de la fuente
  const getSourceName = (source: string): string => {
    const names = {
      internal: 'Interno',
      google: 'Google Calendar',
      outlook: 'Outlook'
    };
    return names[source as keyof typeof names] || source;
  };

  // Manejar eliminación
  const handleDelete = async () => {
    try {
      setLoading(true);
      await onDelete(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el evento',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar actualización
  const handleUpdate = async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      await onUpdate(event.id, eventData);
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar el evento',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detalles del Evento
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditForm(true)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{event.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getEventTypeColor(event.type)}>
                    {getEventTypeName(event.type)}
                  </Badge>
                  <Badge variant="outline">
                    {getSourceName(event.source)}
                  </Badge>
                  {event.isAllDay && (
                    <Badge variant="secondary">Todo el día</Badge>
                  )}
                </div>
              </div>

              {event.description && (
                <div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {/* Fechas y horas */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Fecha y hora</p>
                  {event.isAllDay ? (
                    <p className="text-gray-600 dark:text-gray-300">
                      {formatDate(event.startDate)}
                      {event.startDate.toDateString() !== event.endDate.toDateString() && (
                        <> - {formatDate(event.endDate)}</>
                      )}
                    </p>
                  ) : (
                    <div className="text-gray-600 dark:text-gray-300">
                      <p>Inicio: {formatDateTime(event.startDate)}</p>
                      <p>Fin: {formatDateTime(event.endDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Ubicación</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {event.location}
                    </p>
                  </div>
                </div>
              )}

              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Participantes</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.attendees.map((attendee, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {attendee}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {event.reminders && event.reminders.length > 0 && (
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Recordatorios</p>
                    <div className="space-y-1 mt-1">
                      {event.reminders.map((reminder, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                          {reminder.type === 'email' && '📧'}
                          {reminder.type === 'push' && '🔔'}
                          {reminder.type === 'sms' && '📱'}
                          {' '}
                          {reminder.minutes} minutos antes
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadatos */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Información adicional</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-300">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enlaces externos */}
            {event.source === 'google' && event.metadata?.htmlLink && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(event.metadata.htmlLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver en Google Calendar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulario de edición */}
      {showEditForm && (
        <EventForm
          event={event}
          onSave={handleUpdate}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* Confirmación de eliminación */}
      {showDeleteConfirm && (
        <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p>
                ¿Estás seguro de que quieres eliminar el evento "{event.title}"?
                Esta acción no se puede deshacer.
              </p>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 