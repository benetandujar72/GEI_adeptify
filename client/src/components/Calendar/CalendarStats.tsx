import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, Clock, MapPin, Users, X, Download } from 'lucide-react';
import type { CalendarEvent } from '@/types/calendar';

interface CalendarStatsProps {
  events: CalendarEvent[];
  onClose: () => void;
  onGenerateReport: () => void;
}

export function CalendarStats({ events, onClose, onGenerateReport }: CalendarStatsProps) {
  // Calcular estadísticas
  const stats = {
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byMonth: {} as Record<string, number>,
    upcomingEvents: events.filter(e => e.startDate > new Date()).length,
    pastEvents: events.filter(e => e.endDate < new Date()).length,
    allDayEvents: events.filter(e => e.isAllDay).length,
    eventsWithLocation: events.filter(e => e.location).length,
    eventsWithDescription: events.filter(e => e.description).length,
    eventsWithReminders: events.filter(e => e.reminders && e.reminders.length > 0).length
  };

  // Agrupar por tipo
  events.forEach(event => {
    stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
    
    const monthKey = event.startDate.toISOString().slice(0, 7); // YYYY-MM
    stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
  });

  // Obtener nombres de tipos
  const getTypeName = (type: string): string => {
    const names = {
      activity: 'Actividades',
      guard: 'Guardias',
      meeting: 'Reuniones',
      exam: 'Exámenes',
      holiday: 'Vacaciones',
      custom: 'Personalizados'
    };
    return names[type as keyof typeof names] || type;
  };

  // Obtener nombres de fuentes
  const getSourceName = (source: string): string => {
    const names = {
      internal: 'Internos',
      google: 'Google Calendar',
      outlook: 'Outlook'
    };
    return names[source as keyof typeof names] || source;
  };

  // Formatear mes
  const formatMonth = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  };

  // Obtener eventos próximos (próximos 7 días)
  const upcomingEvents = events
    .filter(e => e.startDate > new Date() && e.startDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estadísticas del Calendario
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Reporte
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
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Estadísticas generales */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total de eventos</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Próximos eventos</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.upcomingEvents}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Con ubicación</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.eventsWithLocation}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Todo el día</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.allDayEvents}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eventos por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eventos por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byType)
                  .sort(([,a], [,b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getTypeName(type)}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Eventos por fuente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eventos por fuente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.bySource)
                  .sort(([,a], [,b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getSourceName(source)}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Eventos próximos */}
        {upcomingEvents.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Próximos eventos (7 días)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {event.startDate.toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {event.location && (
                        <div className="text-sm text-gray-500">
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                    <Badge className={event.isAllDay ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                      {event.isAllDay ? 'Todo el día' : 'Con hora'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Eventos por mes */}
        {Object.keys(stats.byMonth).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Eventos por mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([monthKey, count]) => (
                    <div key={monthKey} className="flex items-center justify-between">
                      <span className="font-medium">{formatMonth(monthKey)}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
} 