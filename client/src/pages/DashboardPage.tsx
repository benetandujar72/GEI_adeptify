import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Shield, 
  BarChart3, 
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';

interface ModuleStats {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  change: number;
  status: 'active' | 'inactive' | 'warning';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  module: string;
}

interface RecentActivity {
  id: string;
  type: 'evaluation' | 'attendance' | 'guard' | 'survey' | 'surveys' | 'resource' | 'resources' | 'analytics';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  status: 'completed' | 'pending' | 'error';
}

interface SystemStatus {
  database: 'online' | 'offline';
  aiServices: 'online' | 'offline';
  modules: {
    evaluation: boolean;
    attendance: boolean;
    guard: boolean;
    surveys: boolean;
    resources: boolean;
    analytics: boolean;
  };
  lastUpdate: string;
}

const DashboardPage: React.FC = () => {
  const { user, institute } = useAuth();
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    aiServices: 'online',
    modules: {
      evaluation: true,
      attendance: true,
      guard: true,
      surveys: true,
      resources: true,
      analytics: true
    },
    lastUpdate: new Date().toISOString()
  });

  useEffect(() => {
    // Simular carga de datos del dashboard
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Aquí se harían las llamadas reales a la API
      const mockStats: ModuleStats[] = [
        {
          id: 'evaluation',
          name: 'Evaluación',
          icon: <BookOpen className="h-4 w-4" />,
          count: 156,
          change: 12,
          status: 'active'
        },
        {
          id: 'attendance',
          name: 'Asistencia',
          icon: <Users className="h-4 w-4" />,
          count: 1247,
          change: -3,
          status: 'active'
        },
        {
          id: 'guard',
          name: 'Guardias',
          icon: <Shield className="h-4 w-4" />,
          count: 89,
          change: 5,
          status: 'warning'
        },
        {
          id: 'surveys',
          name: 'Encuestas',
          icon: <FileText className="h-4 w-4" />,
          count: 23,
          change: 8,
          status: 'active'
        },
        {
          id: 'resources',
          name: 'Recursos',
          icon: <BarChart3 className="h-4 w-4" />,
          count: 342,
          change: 15,
          status: 'active'
        },
        {
          id: 'analytics',
          name: 'Analíticas',
          icon: <TrendingUp className="h-4 w-4" />,
          count: 67,
          change: 22,
          status: 'active'
        }
      ];

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'evaluation',
          title: 'Nueva evaluación creada',
          description: 'Evaluación de Matemáticas - Tema 3',
          timestamp: '2024-01-15T10:30:00Z',
          user: 'Prof. García',
          status: 'completed'
        },
        {
          id: '2',
          type: 'attendance',
          title: 'Asistencia registrada',
          description: 'Clase 2ºA - 95% asistencia',
          timestamp: '2024-01-15T09:15:00Z',
          user: 'Prof. López',
          status: 'completed'
        },
        {
          id: '3',
          type: 'guard',
          title: 'Guardia asignada',
          description: 'Guardia de patio - 12:00-13:00',
          timestamp: '2024-01-15T08:45:00Z',
          user: 'Admin',
          status: 'pending'
        },
        {
          id: '4',
          type: 'surveys',
          title: 'Encuesta completada',
          description: 'Satisfacción del profesorado - 87%',
          timestamp: '2024-01-14T16:20:00Z',
          user: 'Sistema',
          status: 'completed'
        }
      ];

      setModuleStats(mockStats);
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new-evaluation',
      title: 'Nueva Evaluación',
      description: 'Crear una nueva evaluación',
      icon: <Plus className="h-4 w-4" />,
      action: () => console.log('Nueva evaluación'),
      module: 'evaluation'
    },
    {
      id: 'register-attendance',
      title: 'Registrar Asistencia',
      description: 'Marcar asistencia de alumnos',
      icon: <Users className="h-4 w-4" />,
      action: () => console.log('Registrar asistencia'),
      module: 'attendance'
    },
    {
      id: 'assign-guard',
      title: 'Asignar Guardia',
      description: 'Asignar guardia a profesor',
      icon: <Shield className="h-4 w-4" />,
      action: () => console.log('Asignar guardia'),
      module: 'guard'
    },
    {
      id: 'create-survey',
      title: 'Crear Encuesta',
      description: 'Crear nueva encuesta',
      icon: <FileText className="h-4 w-4" />,
      action: () => console.log('Crear encuesta'),
      module: 'surveys'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'inactive':
      case 'error':
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'online':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'inactive':
      case 'error':
      case 'offline':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido, {user?.name} - {institute?.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus.database)}`}>
            {getStatusIcon(systemStatus.database)}
            <span className="ml-1">Sistema {systemStatus.database}</span>
          </div>
        </div>
      </div>

      {/* Estadísticas de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moduleStats.map((stat) => (
          <Card key={stat.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${getStatusColor(stat.status)}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              <p className={`text-xs ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change >= 0 ? '+' : ''}{stat.change}% desde el mes pasado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Acciones Rápidas y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Acceso directo a las funciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={action.action}
                >
                  <div className="flex items-center space-x-2">
                    {action.icon}
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-left">
                    {action.description}
                  </p>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas actividades en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {activity.user}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>
            Estado de los servicios y módulos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${getStatusColor(systemStatus.database)}`}>
                {getStatusIcon(systemStatus.database)}
              </div>
              <div>
                <p className="text-sm font-medium">Base de Datos</p>
                <p className="text-xs text-gray-500">PostgreSQL</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${getStatusColor(systemStatus.aiServices)}`}>
                {getStatusIcon(systemStatus.aiServices)}
              </div>
              <div>
                <p className="text-sm font-medium">Servicios AI</p>
                <p className="text-xs text-gray-500">OpenAI, Gemini, Claude</p>
              </div>
            </div>

            {Object.entries(systemStatus.modules).map(([module, isActive]) => (
              <div key={module} className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${getStatusColor(isActive ? 'active' : 'inactive')}`}>
                  {getStatusIcon(isActive ? 'active' : 'inactive')}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{module}</p>
                  <p className="text-xs text-gray-500">
                    {isActive ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              Última actualización: {new Date(systemStatus.lastUpdate).toLocaleString('es-ES')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage; 