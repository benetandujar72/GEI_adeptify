import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useUsers, useInstitutes, useSystemConfig, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Users, 
  Building, 
  Settings, 
  Shield, 
  BarChart3, 
  Activity,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Building2,
  Cog,
  Database,
  Server,
  Globe,
  Lock,
  Bell,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'institute_admin' | 'teacher' | 'student';
  institute?: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
}

interface Institute {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  admin: string;
  status: 'active' | 'inactive';
  modules: string[];
  academicYears: number;
  totalUsers: number;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalInstitutes: number;
  activeModules: number;
  systemUptime: number;
  databaseSize: string;
  lastBackup: string;
  activeSessions: number;
  errorRate: number;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'institutes' | 'system'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateInstituteModalOpen, setIsCreateInstituteModalOpen] = useState(false);

  const { success, error } = useToastHelpers();
  const usersQuery = useUsers();
  const institutesQuery = useInstitutes();
  const systemConfigQuery = useSystemConfig();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar usuarios
        const usersResponse = await usersQuery.execute();
        if (usersResponse?.success && usersResponse.data) {
          setUsers(usersResponse.data);
        }

        // Cargar institutos
        const institutesResponse = await institutesQuery.execute();
        if (institutesResponse?.success && institutesResponse.data) {
          setInstitutes(institutesResponse.data);
        }

        // Cargar estadísticas del sistema
        const systemResponse = await systemConfigQuery.execute();
        if (systemResponse?.success && systemResponse.data) {
          setSystemStats(systemResponse.data.stats);
        }
      } catch (err) {
        error('Error al cargar datos', 'No se pudieron cargar los datos del panel de administración');
      }
    };

    loadData();
  }, []);

  const handleCreateUser = async (userData: any) => {
    try {
      const response = await createUser.execute(userData);
      if (response?.success) {
        success('Usuario creado', 'El usuario se ha creado correctamente');
        setIsCreateUserModalOpen(false);
        // Recargar usuarios
        const updatedResponse = await usersQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setUsers(updatedResponse.data);
        }
      } else {
        error('Error al crear usuario', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al crear usuario', 'Ha ocurrido un error inesperado');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const response = await deleteUser.execute(userId);
      if (response?.success) {
        success('Usuario eliminado', 'El usuario se ha eliminado correctamente');
        setUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        error('Error al eliminar usuario', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al eliminar usuario', 'Ha ocurrido un error inesperado');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Administrador';
      case 'institute_admin': return 'Administrador de Instituto';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      default: return 'Desconocido';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'institute_admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'teacher': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'student': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (selectedFilter !== 'all') {
      return user.role === selectedFilter;
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Panel de Administración
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestión completa del sistema para super administradores
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar backup */}}
          >
            <Database className="h-4 w-4 mr-2" />
            Backup
          </Button>
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar logs */}}
          >
            <Activity className="h-4 w-4 mr-2" />
            Logs
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Vista General', icon: BarChart3 },
            { id: 'users', label: 'Usuarios', icon: Users },
            { id: 'institutes', label: 'Institutos', icon: Building },
            { id: 'system', label: 'Sistema', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Stats */}
          {systemStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Usuarios
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {systemStats.totalUsers.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Institutos
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {systemStats.totalInstitutes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Uptime
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {systemStats.systemUptime}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Base de Datos
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {systemStats.databaseSize}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Nuevo usuario registrado', user: 'María García', time: '2 minutos', type: 'success' },
                  { action: 'Instituto creado', user: 'Admin', time: '15 minutos', type: 'info' },
                  { action: 'Error de conexión', user: 'Sistema', time: '1 hora', type: 'error' },
                  { action: 'Backup completado', user: 'Sistema', time: '2 horas', type: 'success' },
                  { action: 'Módulo desactivado', user: 'Juan Pérez', time: '3 horas', type: 'warning' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'error' ? 'bg-red-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">por {activity.user} • {activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Users Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Administra todos los usuarios del sistema
              </p>
            </div>
            <Button onClick={() => setIsCreateUserModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar usuarios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="all">Todos los roles</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="institute_admin">Admin Instituto</option>
                  <option value="teacher">Profesor</option>
                  <option value="student">Estudiante</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {user.status === 'active' ? 'Activo' : user.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
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
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'institutes' && (
        <div className="space-y-6">
          {/* Institutes Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-xl font-semibold">Gestión de Institutos</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Administra todos los institutos del sistema
              </p>
            </div>
            <Button onClick={() => setIsCreateInstituteModalOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Nuevo Instituto
            </Button>
          </div>

          {/* Institutes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutes.map((institute) => (
              <Card key={institute.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>{institute.name}</span>
                  </CardTitle>
                  <CardDescription>
                    Código: {institute.code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p><strong>Email:</strong> {institute.email}</p>
                    <p><strong>Teléfono:</strong> {institute.phone}</p>
                    <p><strong>Usuarios:</strong> {institute.totalUsers}</p>
                    <p><strong>Años académicos:</strong> {institute.academicYears}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      institute.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {institute.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Configuración del Sistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del Sistema</label>
                  <Input defaultValue="GEI Platform" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL del Sistema</label>
                  <Input defaultValue="https://gei-platform.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email de Contacto</label>
                  <Input defaultValue="admin@gei-platform.com" />
                </div>
                <Button className="w-full">Guardar Cambios</Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tiempo de Sesión (minutos)</label>
                  <Input type="number" defaultValue="120" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Intentos de Login</label>
                  <Input type="number" defaultValue="5" />
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="2fa" defaultChecked />
                  <label htmlFor="2fa" className="text-sm">Requerir 2FA para admins</label>
                </div>
                <Button className="w-full">Actualizar Seguridad</Button>
              </CardContent>
            </Card>

            {/* Backup Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Backup y Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Frecuencia de Backup</label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Retención (días)</label>
                  <Input type="number" defaultValue="30" />
                </div>
                <Button className="w-full">Configurar Backup</Button>
              </CardContent>
            </Card>

            {/* Module Management */}
            <Card>
              <CardHeader>
                <CardTitle>Módulos del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Evaluación', enabled: true },
                  { name: 'Asistencia', enabled: true },
                  { name: 'Guardias', enabled: true },
                  { name: 'Encuestas', enabled: false },
                  { name: 'Recursos', enabled: false },
                  { name: 'Analíticas', enabled: true }
                ].map((module, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{module.name}</span>
                    <input
                      type="checkbox"
                      defaultChecked={module.enabled}
                      className="rounded border-gray-300"
                    />
                  </div>
                ))}
                <Button className="w-full">Actualizar Módulos</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateUserModalOpen && (
        <CreateUserModal
          isOpen={isCreateUserModalOpen}
          onClose={() => setIsCreateUserModalOpen(false)}
          onSubmit={handleCreateUser}
          institutes={institutes}
        />
      )}
    </div>
  );
};

// Modal para crear usuario
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  institutes: Institute[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  institutes
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'teacher' as 'superadmin' | 'institute_admin' | 'teacher' | 'student',
    instituteId: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Crear Usuario</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="teacher">Profesor</option>
              <option value="institute_admin">Administrador de Instituto</option>
              <option value="student">Estudiante</option>
              <option value="superadmin">Super Administrador</option>
            </select>
          </div>
          {formData.role !== 'superadmin' && (
            <div>
              <label className="block text-sm font-medium mb-1">Instituto</label>
              <select
                value={formData.instituteId}
                onChange={(e) => setFormData({...formData, instituteId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                required
              >
                <option value="">Seleccionar instituto</option>
                {institutes.map(institute => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar Contraseña</label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Crear Usuario
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel; 