import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, X, Calendar, Clock } from 'lucide-react';
import type { CalendarFilters } from '@/types/calendar';

interface CalendarFiltersProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  onClose: () => void;
}

export function CalendarFilters({ filters, onFiltersChange, onClose }: CalendarFiltersProps) {
  const [localFilters, setLocalFilters] = useState<CalendarFilters>(filters);

  // Tipos de eventos disponibles
  const eventTypes = [
    { value: 'activity', label: 'Actividades' },
    { value: 'guard', label: 'Guardias' },
    { value: 'meeting', label: 'Reuniones' },
    { value: 'exam', label: 'Exámenes' },
    { value: 'holiday', label: 'Vacaciones' },
    { value: 'custom', label: 'Personalizados' }
  ];

  // Fuentes disponibles
  const sources = [
    { value: 'internal', label: 'Internos' },
    { value: 'google', label: 'Google Calendar' },
    { value: 'outlook', label: 'Outlook' }
  ];

  // Manejar cambios en filtros
  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...localFilters.types, type]
      : localFilters.types.filter(t => t !== type);
    
    setLocalFilters(prev => ({
      ...prev,
      types: newTypes
    }));
  };

  const handleSourceChange = (source: string, checked: boolean) => {
    const newSources = checked
      ? [...localFilters.sources, source]
      : localFilters.sources.filter(s => s !== source);
    
    setLocalFilters(prev => ({
      ...prev,
      sources: newSources
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const newDateRange = {
      ...localFilters.dateRange,
      [field]: value ? new Date(value) : undefined
    };
    
    setLocalFilters(prev => ({
      ...prev,
      dateRange: newDateRange.start && newDateRange.end ? newDateRange : undefined
    }));
  };

  const handleUserIdChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      userId: value ? parseInt(value) : undefined
    }));
  };

  // Aplicar filtros
  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  // Limpiar filtros
  const clearFilters = () => {
    const clearedFilters: CalendarFilters = {
      types: [],
      sources: [],
      userId: undefined,
      dateRange: undefined
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  // Contar filtros activos
  const activeFiltersCount = 
    localFilters.types.length + 
    localFilters.sources.length + 
    (localFilters.userId ? 1 : 0) + 
    (localFilters.dateRange ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros del Calendario
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Filtros por tipo de evento */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Tipo de evento
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {eventTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={localFilters.types.includes(type.value)}
                    onCheckedChange={(checked) => handleTypeChange(type.value, checked as boolean)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros por fuente */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Fuente del evento
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {sources.map((source) => (
                <div key={source.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source.value}`}
                    checked={localFilters.sources.includes(source.value)}
                    onCheckedChange={(checked) => handleSourceChange(source.value, checked as boolean)}
                  />
                  <Label htmlFor={`source-${source.value}`} className="text-sm">
                    {source.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtro por usuario */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Usuario creador
            </Label>
            <Select
              value={localFilters.userId?.toString() || ''}
              onValueChange={handleUserIdChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los usuarios</SelectItem>
                <SelectItem value="1">Usuario 1</SelectItem>
                <SelectItem value="2">Usuario 2</SelectItem>
                <SelectItem value="3">Usuario 3</SelectItem>
                {/* Aquí se podrían cargar los usuarios dinámicamente */}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por rango de fechas */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Rango de fechas
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date-start" className="text-sm">
                  Fecha de inicio
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="date-start"
                    type="date"
                    value={localFilters.dateRange?.start?.toISOString().slice(0, 10) || ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="date-end" className="text-sm">
                  Fecha de fin
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="date-end"
                    type="date"
                    value={localFilters.dateRange?.end?.toISOString().slice(0, 10) || ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros rápidos */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Filtros rápidos
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  setLocalFilters(prev => ({
                    ...prev,
                    dateRange: { start: today, end: nextWeek }
                  }));
                }}
              >
                <Clock className="h-4 w-4 mr-2" />
                Próxima semana
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                  setLocalFilters(prev => ({
                    ...prev,
                    dateRange: { start: today, end: nextMonth }
                  }));
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Próximo mes
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalFilters(prev => ({
                    ...prev,
                    types: ['activity', 'meeting']
                  }));
                }}
              >
                Solo actividades y reuniones
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalFilters(prev => ({
                    ...prev,
                    sources: ['internal']
                  }));
                }}
              >
                Solo eventos internos
              </Button>
            </div>
          </div>

          {/* Resumen de filtros activos */}
          {activeFiltersCount > 0 && (
            <div className="border-t pt-4">
              <Label className="text-base font-medium mb-3 block">
                Filtros activos
              </Label>
              <div className="flex flex-wrap gap-2">
                {localFilters.types.map((type) => (
                  <Badge key={`type-${type}`} variant="secondary" className="text-xs">
                    Tipo: {eventTypes.find(t => t.value === type)?.label}
                    <button
                      onClick={() => handleTypeChange(type, false)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                {localFilters.sources.map((source) => (
                  <Badge key={`source-${source}`} variant="secondary" className="text-xs">
                    Fuente: {sources.find(s => s.value === source)?.label}
                    <button
                      onClick={() => handleSourceChange(source, false)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                {localFilters.dateRange && (
                  <Badge variant="secondary" className="text-xs">
                    Rango: {localFilters.dateRange.start?.toLocaleDateString()} - {localFilters.dateRange.end?.toLocaleDateString()}
                    <button
                      onClick={() => setLocalFilters(prev => ({ ...prev, dateRange: undefined }))}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
            >
              Limpiar filtros
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={applyFilters}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 