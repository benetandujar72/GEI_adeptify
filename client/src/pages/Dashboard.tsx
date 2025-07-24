import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Bell, 
  TrendingUp, 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  activeClasses: number;
  pendingEvaluations: number;
  pendingGuards: number;
  attendanceRate: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/stats');
      return response.data;
    },
    enabled: !!user
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bon dia';
    if (hour < 18) return 'Bona tarda';
    return 'Bona nit';
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'super_admin': 'Administrador General',
      'institute_admin': 'Administrador d\'Institut',
      'teacher': 'Professor',
      'student': 'Estudiant',
      'parent': 'Pare/Mare',
      'staff': 'Personal'
    };
    return roleNames[role] || role;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {user?.firstName || user?.displayName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Benvingut a la plataforma GEI Unified
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {getRoleDisplayName(user?.role || '')}
          </Badge>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova activitat
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% respecte al mes passat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professors</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +2 nous aquest mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Actives</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClasses || 0}</div>
            <p className="text-xs text-muted-foreground">
              En curs aquesta setmana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assistència</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendanceRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Mitjana general
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Visió General', icon: Activity },
            { id: 'adeptify', label: 'Adeptify', icon: BookOpen },
            { id: 'assistatut', label: 'Assistatut', icon: Users },
            { id: 'notifications', label: 'Notificacions', icon: Bell }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Tasques Pendents</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.pendingEvaluations ? (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900">
                          Evaluacions pendents
                        </p>
                        <p className="text-sm text-yellow-700">
                          {stats.pendingEvaluations} evaluacions per completar
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Veure
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        Tot al dia
                      </p>
                      <p className="text-sm text-green-700">
                        No hi ha tasques pendents
                      </p>
                    </div>
                  </div>
                )}

                {stats?.pendingGuards ? (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">
                          Guàrdies pendents
                        </p>
                        <p className="text-sm text-orange-700">
                          {stats.pendingGuards} guàrdies per assignar
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Veure
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notificacions Recents</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recentNotifications?.length ? (
                    stats.recentNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <Bell className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString('ca-ES')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No hi ha notificacions recents</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'adeptify' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mòdul Adeptify</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Competència
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Competències</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-gray-600">Competències actives</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evaluacions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-gray-600">Evaluacions realitzades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estudiants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-sm text-gray-600">Estudiants evaluats</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'assistatut' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mòdul Assistatut</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Guàrdia
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Guàrdies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-gray-600">Guàrdies assignades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assistència</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">94%</p>
                  <p className="text-sm text-gray-600">Taxa d'assistència</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">18</p>
                  <p className="text-sm text-gray-600">Classes actives</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Notificacions</h2>
              <Button variant="outline">
                Marcar totes com llegides
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stats?.recentNotifications?.length ? (
                    stats.recentNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start space-x-4 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <Bell className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString('ca-ES')}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost">
                          Marcar com llegida
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No hi ha notificacions</p>
                      <p className="text-sm">Quan rebis notificacions, apareixeran aquí</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 