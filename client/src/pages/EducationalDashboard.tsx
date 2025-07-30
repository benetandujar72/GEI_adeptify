import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { useStatistics, useCourses, useEvaluations, useGrades, useAttendance } from '@/hooks/useEducationalData';
import { Link } from 'react-router-dom';

const EducationalDashboard: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  
  // Hooks para obtener datos
  const { data: statistics, isLoading: statsLoading } = useStatistics(selectedCourse);
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: evaluations, isLoading: evaluationsLoading } = useEvaluations(selectedCourse);
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();

  const isLoading = statsLoading || coursesLoading || evaluationsLoading || gradesLoading || attendanceLoading;

  // Calcular métricas adicionales
  const averageGrade = statistics?.grades?.average_score || 0;
  const totalEvaluations = evaluations?.length || 0;
  const totalGrades = grades?.length || 0;
  const attendanceRate = attendance ? 
    (attendance.filter(a => a.status === 'presente').length / attendance.length) * 100 : 0;

  // Obtener las últimas evaluaciones
  const recentEvaluations = evaluations?.slice(0, 5) || [];
  
  // Obtener las mejores calificaciones
  const topGrades = grades?.sort((a, b) => b.score - a.score).slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Educativo</h1>
          <p className="text-muted-foreground">
            Visión general del sistema educativo y métricas de rendimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/courses">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Curso
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/evaluations">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Evaluación
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtro de curso */}
      {courses && courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Filtro por Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCourse === '' ? 'default' : 'outline'}
                onClick={() => setSelectedCourse('')}
              >
                Todos los Cursos
              </Button>
              {courses.map((course) => (
                <Button
                  key={course.id}
                  variant={selectedCourse === course.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCourse(course.id)}
                >
                  {course.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.general?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">
              Cursos activos en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.general?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Estudiantes registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageGrade.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Calificación promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Tasa de asistencia general
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          <TabsTrigger value="grades">Calificaciones</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Estadísticas de asistencia */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Estadísticas de Asistencia</CardTitle>
                <CardDescription>
                  Distribución de estados de asistencia
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {statistics?.attendance?.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {stat.status === 'presente' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {stat.status === 'ausente' && <XCircle className="h-4 w-4 text-red-500" />}
                      {stat.status === 'tardanza' && <Clock className="h-4 w-4 text-yellow-500" />}
                      {stat.status === 'justificado' && <Activity className="h-4 w-4 text-blue-500" />}
                      <span className="capitalize">{stat.status}</span>
                    </div>
                    <Badge variant="secondary">{stat.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Próximas evaluaciones */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Próximas Evaluaciones</CardTitle>
                <CardDescription>
                  Evaluaciones programadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvaluations.length > 0 ? (
                  <div className="space-y-4">
                    {recentEvaluations.map((evaluation) => (
                      <div key={evaluation.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{evaluation.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(evaluation.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{evaluation.type}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay evaluaciones próximas</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Evaluaciones Recientes
              </CardTitle>
              <CardDescription>
                Lista de evaluaciones creadas recientemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluations && evaluations.length > 0 ? (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{evaluation.name}</h3>
                        <p className="text-sm text-muted-foreground">{evaluation.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{evaluation.type}</Badge>
                          <Badge variant="secondary">
                            {new Date(evaluation.date).toLocaleDateString()}
                          </Badge>
                          <Badge variant="outline">Max: {evaluation.max_score}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/evaluations/${evaluation.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/evaluations/${evaluation.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay evaluaciones disponibles</p>
                  <Button asChild className="mt-4">
                    <Link to="/evaluations/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Evaluación
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mejores Calificaciones
              </CardTitle>
              <CardDescription>
                Estudiantes con las mejores calificaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topGrades.length > 0 ? (
                <div className="space-y-4">
                  {topGrades.map((grade, index) => (
                    <div key={grade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{grade.student_name}</h3>
                          <p className="text-sm text-muted-foreground">{grade.evaluation_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{grade.score}</div>
                        <p className="text-sm text-muted-foreground">{grade.criterion_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay calificaciones disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumen de Asistencia
              </CardTitle>
              <CardDescription>
                Estadísticas de asistencia por estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statistics?.attendance && statistics.attendance.length > 0 ? (
                <div className="space-y-4">
                  {statistics.attendance.map((stat) => {
                    const percentage = (stat.count / statistics.attendance.reduce((acc, s) => acc + s.count, 0)) * 100;
                    return (
                      <div key={stat.status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {stat.status === 'presente' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {stat.status === 'ausente' && <XCircle className="h-4 w-4 text-red-500" />}
                            {stat.status === 'tardanza' && <Clock className="h-4 w-4 text-yellow-500" />}
                            {stat.status === 'justificado' && <Activity className="h-4 w-4 text-blue-500" />}
                            <span className="capitalize font-medium">{stat.status}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {stat.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay datos de asistencia disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Acceso directo a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link to="/courses">
                <BookOpen className="h-8 w-8 mb-2" />
                <span>Gestionar Cursos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link to="/evaluations">
                <Award className="h-8 w-8 mb-2" />
                <span>Gestionar Evaluaciones</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link to="/grades">
                <BarChart3 className="h-8 w-8 mb-2" />
                <span>Gestionar Calificaciones</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link to="/attendance">
                <Calendar className="h-8 w-8 mb-2" />
                <span>Gestionar Asistencia</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EducationalDashboard; 