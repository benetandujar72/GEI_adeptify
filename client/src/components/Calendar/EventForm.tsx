import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, MapPin, Users, Bell, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent, EventFormData } from '@/types/calendar';

interface EventFormProps {
  event?: CalendarEvent | null;
  onSave: (eventData: Omit<CalendarEvent, 'id'>) => void;
  onCancel: () => void;
}

export function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hora después
    location: '',
    type: 'activity',
    isAllDay: false,
    reminders: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { toast } = useToast();

  // Inicializar formulario con datos del evento si existe
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location || '',
        type: event.type,
        isAllDay: event.isAllDay,
        reminders: event.reminders || []
      });
    }
  }, [event]);

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (formData.startDate < new Date()) {
      newErrors.startDate = 'No se pueden crear eventos en el pasado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejadores de cambios
  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const date = new Date(value);
    handleInputChange(field, date);

    // Ajustar automáticamente la fecha de fin si es menor que la de inicio
    if (field === 'startDate' && date >= formData.endDate) {
      const newEndDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hora después
      handleInputChange('endDate', newEndDate);
    }
  };

  const handleTimeChange = (field: 'startDate' | 'endDate', value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date(formData[field]);
    date.setHours(hours, minutes, 0, 0);
    handleInputChange(field, date);
  };

  const handleAllDayChange = (checked: boolean) => {
    handleInputChange('isAllDay', checked);
    
    if (checked) {
      // Si es todo el día, ajustar las fechas
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(formData.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      handleInputChange('startDate', startDate);
      handleInputChange('endDate', endDate);
    }
  };

  const addReminder = () => {
    const newReminder = {
      type: 'email' as const,
      minutes: 60
    };
    
    handleInputChange('reminders', [...formData.reminders, newReminder]);
  };

  const removeReminder = (index: number) => {
    const newReminders = formData.reminders.filter((_, i) => i !== index);
    handleInputChange('reminders', newReminders);
  };

  const updateReminder = (index: number, field: 'type' | 'minutes', value: any) => {
    const newReminders = [...formData.reminders];
    newReminders[index] = {
      ...newReminders[index],
      [field]: value
    };
    handleInputChange('reminders', newReminders);
  };

  // Guardar evento
  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Error de validación',
        description: 'Por favor, corrige los errores en el formulario',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      const eventData: Omit<CalendarEvent, 'id'> = {
        ...formData,
        source: 'internal',
        attendees: [],
        metadata: {}
      };

      await onSave(eventData);
      
      toast({
        title: 'Éxito',
        description: event ? 'Evento actualizado correctamente' : 'Evento creado correctamente'
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar el evento',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha para input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 10);
  };

  // Formatear hora para input
  const formatTimeForInput = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Título del evento"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descripción del evento"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ubicación del evento"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Tipo de evento</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Actividad</SelectItem>
                  <SelectItem value="guard">Guardia</SelectItem>
                  <SelectItem value="meeting">Reunión</SelectItem>
                  <SelectItem value="exam">Examen</SelectItem>
                  <SelectItem value="holiday">Vacaciones</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas y horas */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={formData.isAllDay}
                onCheckedChange={handleAllDayChange}
              />
              <Label htmlFor="allDay">Todo el día</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha de inicio *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="startDate"
                      type="date"
                      value={formatDateForInput(formData.startDate)}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      className={`pl-10 ${errors.startDate ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {!formData.isAllDay && (
                    <div className="relative w-32">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={formatTimeForInput(formData.startDate)}
                        onChange={(e) => handleTimeChange('startDate', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </div>
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">Fecha de fin *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="endDate"
                      type="date"
                      value={formatDateForInput(formData.endDate)}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      className={`pl-10 ${errors.endDate ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {!formData.isAllDay && (
                    <div className="relative w-32">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={formatTimeForInput(formData.endDate)}
                        onChange={(e) => handleTimeChange('endDate', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  )}
                </div>
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} opciones avanzadas
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Recordatorios
                </Label>
                <div className="space-y-2 mt-2">
                  {formData.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={reminder.type}
                        onValueChange={(value) => updateReminder(index, 'type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        type="number"
                        value={reminder.minutes}
                        onChange={(e) => updateReminder(index, 'minutes', parseInt(e.target.value))}
                        className="w-24"
                        min="0"
                        max="10080"
                      />
                      
                      <span className="text-sm text-gray-500">minutos antes</span>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeReminder(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReminder}
                  >
                    Agregar recordatorio
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Guardando...' : (event ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 