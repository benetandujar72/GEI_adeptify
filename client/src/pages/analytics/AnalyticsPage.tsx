import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAnalytics, useGenerateReport, useExportData } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  PieChart,
  LineChart,
  Activity,
  Target,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Share2,
  Maximize2,
  Minimize2,
  Building
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    averageAttendance: number;
    averageGrades: number;
    activeModules: number;
  };
  attendance: {
    daily: { date: string; rate: number }[];
    weekly: { week: string; rate: number }[];
    monthly: { month: string; rate: number }[];
  };
  grades: {
    distribution: { range: string; count: number }[];
    bySubject: { subject: string; average: number }[];
    trends: { month: string; average: number }[];
  };
  modules: {
    usage: { module: string; usage: number }[];
    performance: { module: string; score: number }[];
  };
  resources: {
    utilization: { resource: string; usage: number }[];
    bookings: { date: string; count: number }[];
  };
}

const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedModule, setSelectedModule] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCharts, setExpandedCharts] = useState<string[]>([]);

  const { success, error } = useToastHelpers();
  const analyticsQuery = useAnalytics();
  const generateReport = useGenerateReport();
  const exportData = useExportData();

  // Cargar datos de analíticas
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await analyticsQuery.execute({
          period: selectedPeriod,
          module: selectedModule
        });
        if (response?.success && response.data) {
          setAnalyticsData(response.data);
        } else {
          error('Error al cargar analíticas', response?.error || 'Error desconocido');
        }
      } catch (err) {
        error('Error al cargar analíticas', 'No se pudieron cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedPeriod, selectedModule]);

  const handleGenerateReport = async () => {
    try {
      const response = await generateReport.execute({
        type: 'comprehensive',
        period: selectedPeriod,
        format: 'pdf'
      });
      
      if (response?.success && response.data) {
        // Descargar reporte
        const blob = new Blob([response.data.content], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-analiticas-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        success('Reporte generado', 'El reporte se ha descargado correctamente');
      } else {
        error('Error al generar reporte', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al generar reporte', 'Ha ocurrido un error inesperado');
    }
  };

  const handleExportData = async (dataType: string) => {
    try {
      const response = await exportData.execute({
        type: dataType,
        period: selectedPeriod,
        format: 'csv'
      });
      
      if (response?.success && response.data) {
        const blob = new Blob([response.data.content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dataType}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        success('Datos exportados', 'Los datos se han exportado correctamente');
      } else {
        error('Error al exportar datos', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al exportar datos', 'Ha ocurrido un error inesperado');
    }
  };

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando analíticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay datos disponibles
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Los datos de analíticas no están disponibles en este momento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analíticas y Reportes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Dashboard completo con métricas y análisis del sistema educativo
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExportData('all')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Datos
          </Button>
          <Button
            onClick={handleGenerateReport}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="week">Última Semana</option>
                <option value="month">Último Mes</option>
                <option value="quarter">Último Trimestre</option>
                <option value="year">Último Año</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Módulo</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Todos los Módulos</option>
                <option value="evaluation">Evaluación</option>
                <option value="attendance">Asistencia</option>
                <option value="guard">Guardias</option>
                <option value="surveys">Encuestas</option>
                <option value="resources">Recursos</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Estudiantes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.overview.totalStudents.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Promedio Asistencia
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.overview.averageAttendance.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Promedio Calificaciones
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.overview.averageGrades.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Módulos Activos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.overview.activeModules}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card className={expandedCharts.includes('attendance') ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tendencia de Asistencia</CardTitle>
                <CardDescription>Evolución de la asistencia en el tiempo</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChartExpansion('attendance')}
                >
                  {expandedCharts.includes('attendance') ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportData('attendance')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Gráfico de tendencia de asistencia</p>
                <p className="text-sm text-gray-500">Datos: {analyticsData.attendance.monthly.length} puntos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className={expandedCharts.includes('grades') ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Distribución de Calificaciones</CardTitle>
                <CardDescription>Distribución de notas por rangos</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChartExpansion('grades')}
                >
                  {expandedCharts.includes('grades') ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportData('grades')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Gráfico de distribución de calificaciones</p>
                <p className="text-sm text-gray-500">Rangos: {analyticsData.grades.distribution.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Usage */}
        <Card className={expandedCharts.includes('modules') ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Uso de Módulos</CardTitle>
                <CardDescription>Utilización de cada módulo del sistema</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChartExpansion('modules')}
                >
                  {expandedCharts.includes('modules') ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportData('modules')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Gráfico de uso de módulos</p>
                <p className="text-sm text-gray-500">Módulos: {analyticsData.modules.usage.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Utilization */}
        <Card className={expandedCharts.includes('resources') ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Utilización de Recursos</CardTitle>
                <CardDescription>Uso de espacios y recursos</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChartExpansion('resources')}
                >
                  {expandedCharts.includes('resources') ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportData('resources')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Gráfico de utilización de recursos</p>
                <p className="text-sm text-gray-500">Recursos: {analyticsData.resources.utilization.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Asignaturas con Mejor Rendimiento</CardTitle>
            <CardDescription>Promedio de calificaciones por asignatura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.grades.bySubject
                .sort((a, b) => b.average - a.average)
                .slice(0, 5)
                .map((subject, index) => (
                  <div key={subject.subject} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <span className="font-medium">{subject.subject}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">{subject.average.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">/ 10</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento de Módulos</CardTitle>
            <CardDescription>Puntuación de satisfacción por módulo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.modules.performance
                .sort((a, b) => b.score - a.score)
                .map((module, index) => (
                  <div key={module.module} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {index + 1}
                        </span>
                      </div>
                      <span className="font-medium capitalize">{module.module}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${module.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{module.score}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Genera reportes y exporta datos específicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => handleExportData('attendance')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Users className="h-6 w-6" />
              <span>Asistencia</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('grades')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Award className="h-6 w-6" />
              <span>Calificaciones</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('resources')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Building className="h-6 w-6" />
              <span>Recursos</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('surveys')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <FileText className="h-6 w-6" />
              <span>Encuestas</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage; 