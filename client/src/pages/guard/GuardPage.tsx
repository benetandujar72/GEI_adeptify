import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useGuards, useAssignGuard, useAutoAssignGuards } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Shield, 
  Users, 
  Calendar,
  Clock,
  MapPin,
  User,
  Settings,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  availability: string[];
  guardCount: number;
  maxGuards: number;
}

interface GuardDuty {
  id: string;
  date: string;
  timeSlot: string;
  location: string;
  teacher: Teacher;
  status: 'assigned' | 'completed' | 'cancelled';
  type: 'recess' | 'lunch' | 'entrance' | 'exit' | 'special';
  notes?: string;
}

const GuardPage: React.FC = () => {
  const [guards, setGuards] = useState<GuardDuty[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredGuards, setFilteredGuards] = useState<GuardDuty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { success, error } = useToastHelpers();
  const guardsQuery = useGuards();
  const assignGuard = useAssignGuard();
  const autoAssignGuards = useAutoAssignGuards();

  // Cargar datos de guardias
  useEffect(() => {
    const loadGuardData = async () => {
      try {
        const response = await guardsQuery.execute();
        if (response?.success && response.data) {
          setGuards(response.data.guards || []);
          setTeachers(response.data.teachers || []);
          setFilteredGuards(response.data.guards || []);
        }
      } catch (err) {
        error('Error al cargar datos de guardias', 'No se pudieron cargar los datos');
      }
    };

    loadGuardData();
  }, []);

  // Filtrar guardias
  useEffect(() => {
    let filtered = guards;

    if (searchTerm) {
      filtered = filtered.filter(guard => 
        guard.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guard.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guard.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(guard => guard.status === selectedFilter);
    }

    setFilteredGuards(filtered);
  }, [guards, searchTerm, selectedFilter]);

  const handleAssignGuard = async (guardData: any) => {
    try {
      const response = await assignGuard.execute(guardData);
      if (response?.success) {
        success('Guardia asignada', 'La guardia se ha asignado correctamente');
        setIsAssignModalOpen(false);
        // Recargar datos
        const updatedResponse = await guardsQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setGuards(updatedResponse.data.guards || []);
        }
      } else {
        error('Error al asignar guardia', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al asignar guardia', 'Ha ocurrido un error inesperado');
    }
  };

  const handleAutoAssign = async () => {
    try {
      const response = await autoAssignGuards.execute({
        startDate: selectedDate,
        endDate: selectedDate
      });
      
      if (response?.success) {
        success('Guardias asignadas automáticamente', 'Las guardias se han asignado correctamente');
        // Recargar datos
        const updatedResponse = await guardsQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setGuards(updatedResponse.data.guards || []);
        }
      } else {
        error('Error en asignación automática', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error en asignación automática', 'Ha ocurrido un error inesperado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Asignada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recess': return 'Recreo';
      case 'lunch': return 'Comida';
      case 'entrance': return 'Entrada';
      case 'exit': return 'Salida';
      case 'special': return 'Especial';
      default: return 'Otro';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recess': return <Clock className="h-4 w-4" />;
      case 'lunch': return <Users className="h-4 w-4" />;
      case 'entrance': return <TrendingUp className="h-4 w-4" />;
      case 'exit': return <TrendingUp className="h-4 w-4 transform rotate-180" />;
      case 'special': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const stats = {
    totalGuards: guards.length,
    assigned: guards.filter(g => g.status === 'assigned').length,
    completed: guards.filter(g => g.status === 'completed').length,
    todayGuards: guards.filter(g => g.date === selectedDate).length,
    availableTeachers: teachers.filter(t => t.guardCount < t.maxGuards).length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Guardias
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Asigna y gestiona las guardias del personal docente
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleAutoAssign}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Asignación Automática
          </Button>
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar configuración */}}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar Guardia
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Guardias
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalGuards}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Asignadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.assigned}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hoy
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.todayGuards}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Disponibles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.availableTeachers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por profesor, ubicación o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Todos los estados</option>
                <option value="assigned">Asignadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guards List */}
      <Card>
        <CardHeader>
          <CardTitle>Guardias</CardTitle>
          <CardDescription>
            {filteredGuards.length} guardia{filteredGuards.length !== 1 ? 's' : ''} encontrada{filteredGuards.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGuards.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay guardias
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No se encontraron guardias con los filtros aplicados'
                  : 'Asigna la primera guardia para comenzar'
                }
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button onClick={() => setIsAssignModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Guardia
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGuards.map((guard) => (
                <div
                  key={guard.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      {getTypeIcon(guard.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {guard.teacher.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {guard.location}
                        </span>
                        <span>•</span>
                        <span>{getTypeLabel(guard.type)}</span>
                        <span>•</span>
                        <span>{new Date(guard.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{guard.timeSlot}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guard.status)}`}>
                          {getStatusLabel(guard.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {guard.teacher.guardCount}/{guard.teacher.maxGuards} guardias
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Ver detalles */}}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Editar */}}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Cancelar */}}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Guard Modal */}
      {isAssignModalOpen && (
        <AssignGuardModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSubmit={handleAssignGuard}
          teachers={teachers}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

// Modal para asignar guardia
interface AssignGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  teachers: Teacher[];
  selectedDate: string;
}

const AssignGuardModal: React.FC<AssignGuardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  teachers,
  selectedDate
}) => {
  const [formData, setFormData] = useState({
    date: selectedDate,
    timeSlot: '',
    location: '',
    teacherId: '',
    type: 'recess' as 'recess' | 'lunch' | 'entrance' | 'exit' | 'special',
    notes: ''
  });

  const availableTeachers = teachers.filter(t => t.guardCount < t.maxGuards);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Asignar Guardia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Horario</label>
            <select
              value={formData.timeSlot}
              onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              required
            >
              <option value="">Seleccionar horario</option>
              <option value="08:00-08:30">08:00-08:30 (Entrada)</option>
              <option value="10:30-11:00">10:30-11:00 (Recreo)</option>
              <option value="12:30-13:30">12:30-13:30 (Comida)</option>
              <option value="15:00-15:30">15:00-15:30 (Recreo)</option>
              <option value="17:00-17:30">17:00-17:30 (Salida)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ubicación</label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              required
            >
              <option value="">Seleccionar ubicación</option>
              <option value="Patio Principal">Patio Principal</option>
              <option value="Entrada Principal">Entrada Principal</option>
              <option value="Comedor">Comedor</option>
              <option value="Biblioteca">Biblioteca</option>
              <option value="Gimnasio">Gimnasio</option>
              <option value="Laboratorio">Laboratorio</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Profesor</label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              required
            >
              <option value="">Seleccionar profesor</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.guardCount}/{teacher.maxGuards})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="recess">Recreo</option>
              <option value="lunch">Comida</option>
              <option value="entrance">Entrada</option>
              <option value="exit">Salida</option>
              <option value="special">Especial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Asignar Guardia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuardPage; 