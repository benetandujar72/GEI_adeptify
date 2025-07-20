import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useResources, useBookResource, useResourceBookings } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarDays,
  Clock3,
  User,
  Settings,
  Download,
  Upload
} from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: 'classroom' | 'laboratory' | 'gym' | 'library' | 'auditorium' | 'office' | 'other';
  capacity: number;
  location: string;
  description: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  equipment: string[];
  features: string[];
  image?: string;
}

interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  date: string;
  purpose: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  attendees?: number;
  notes?: string;
}

const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { success, error } = useToastHelpers();
  const resourcesQuery = useResources();
  const bookResource = useBookResource();
  const resourceBookings = useResourceBookings();

  // Cargar recursos y reservas
  useEffect(() => {
    const loadData = async () => {
      try {
        const resourcesResponse = await resourcesQuery.execute();
        if (resourcesResponse?.success && resourcesResponse.data) {
          setResources(resourcesResponse.data.resources || []);
          setFilteredResources(resourcesResponse.data.resources || []);
        }

        const bookingsResponse = await resourceBookings.execute();
        if (bookingsResponse?.success && bookingsResponse.data) {
          setBookings(bookingsResponse.data);
        }
      } catch (err) {
        error('Error al cargar datos', 'No se pudieron cargar los recursos y reservas');
      }
    };

    loadData();
  }, []);

  // Filtrar recursos
  useEffect(() => {
    let filtered = resources;

    if (searchTerm) {
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(resource => resource.status === selectedFilter);
    }

    setFilteredResources(filtered);
  }, [resources, searchTerm, selectedFilter]);

  const handleBookResource = async (bookingData: any) => {
    try {
      const response = await bookResource.execute(bookingData);
      if (response?.success) {
        success('Recurso reservado', 'El recurso se ha reservado correctamente');
        setIsBookModalOpen(false);
        // Recargar reservas
        const updatedResponse = await resourceBookings.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setBookings(updatedResponse.data);
        }
      } else {
        error('Error al reservar recurso', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al reservar recurso', 'Ha ocurrido un error inesperado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'occupied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'reserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'occupied': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      case 'reserved': return 'Reservado';
      default: return 'Desconocido';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'classroom': return 'Aula';
      case 'laboratory': return 'Laboratorio';
      case 'gym': return 'Gimnasio';
      case 'library': return 'Biblioteca';
      case 'auditorium': return 'Auditorio';
      case 'office': return 'Oficina';
      case 'other': return 'Otro';
      default: return 'Desconocido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'classroom': return <Building className="h-5 w-5" />;
      case 'laboratory': return <Settings className="h-5 w-5" />;
      case 'gym': return <Users className="h-5 w-5" />;
      case 'library': return <BookOpen className="h-5 w-5" />;
      case 'auditorium': return <Users className="h-5 w-5" />;
      case 'office': return <Building className="h-5 w-5" />;
      default: return <Building className="h-5 w-5" />;
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };

  const stats = {
    totalResources: resources.length,
    availableResources: resources.filter(r => r.status === 'available').length,
    totalBookings: bookings.length,
    todayBookings: bookings.filter(b => b.date === selectedDate).length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalCapacity: resources.reduce((acc, resource) => acc + resource.capacity, 0)
  };

  const todayBookings = bookings.filter(b => b.date === selectedDate);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Recursos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Reserva y gestiona espacios y recursos del instituto
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar calendario */}}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Vista Calendario
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCreateResourceModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Recurso
          </Button>
          <Button
            onClick={() => setIsBookModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Reservar Recurso
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Recursos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalResources}
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
                  Disponibles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.availableResources}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Reservas Hoy
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.todayBookings}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Capacidad Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCapacity}
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
                  placeholder="Buscar recursos..."
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
                <option value="available">Disponible</option>
                <option value="occupied">Ocupado</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="reserved">Reservado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Disponibles</CardTitle>
          <CardDescription>
            {filteredResources.length} recurso{filteredResources.length !== 1 ? 's' : ''} encontrado{filteredResources.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay recursos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No se encontraron recursos con los filtros aplicados'
                  : 'Agrega el primer recurso para comenzar'
                }
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button onClick={() => setIsCreateResourceModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Recurso
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          {getTypeIcon(resource.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{resource.name}</CardTitle>
                          <CardDescription>{getTypeLabel(resource.type)}</CardDescription>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resource.status)}`}>
                        {getStatusLabel(resource.status)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{resource.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>Capacidad: {resource.capacity} personas</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {resource.description}
                    </p>
                    {resource.equipment && resource.equipment.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Equipamiento:</p>
                        <div className="flex flex-wrap gap-1">
                          {resource.equipment.slice(0, 3).map((item, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {item}
                            </span>
                          ))}
                          {resource.equipment.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              +{resource.equipment.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedResource(resource);
                          setIsBookModalOpen(true);
                        }}
                        disabled={resource.status !== 'available'}
                        className="flex-1"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Reservar
                      </Button>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Reservas de Hoy</CardTitle>
          <CardDescription>
            {todayBookings.length} reserva{todayBookings.length !== 1 ? 's' : ''} programada{todayBookings.length !== 1 ? 's' : ''} para hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No hay reservas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {booking.resourceName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {booking.userName} • {booking.purpose}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(booking.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusColor(booking.status)}`}>
                      {getBookingStatusLabel(booking.status)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Ver detalles */}}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Resource Modal */}
      {isBookModalOpen && (
        <BookResourceModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          onSubmit={handleBookResource}
          resources={resources.filter(r => r.status === 'available')}
          selectedResource={selectedResource}
        />
      )}

      {/* Create Resource Modal */}
      {isCreateResourceModalOpen && (
        <CreateResourceModal
          isOpen={isCreateResourceModalOpen}
          onClose={() => setIsCreateResourceModalOpen(false)}
          onSubmit={() => {/* TODO: Implementar creación */}}
        />
      )}
    </div>
  );
};

// Modal para reservar recurso
interface BookResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  resources: Resource[];
  selectedResource?: Resource | null;
}

const BookResourceModal: React.FC<BookResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  resources,
  selectedResource
}) => {
  const [formData, setFormData] = useState({
    resourceId: selectedResource?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: 1,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Reservar Recurso</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recurso</label>
            <select
              value={formData.resourceId}
              onChange={(e) => setFormData({...formData, resourceId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              required
            >
              <option value="">Seleccionar recurso</option>
              {resources.map(resource => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} - {resource.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hora Inicio</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hora Fin</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Propósito</label>
            <Input
              value={formData.purpose}
              onChange={(e) => setFormData({...formData, purpose: e.target.value})}
              placeholder="Clase, reunión, evento..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número de Asistentes</label>
            <Input
              type="number"
              min="1"
              value={formData.attendees}
              onChange={(e) => setFormData({...formData, attendees: parseInt(e.target.value)})}
              required
            />
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
              Reservar Recurso
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para crear recurso
interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Recurso</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Funcionalidad en desarrollo...
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage; 