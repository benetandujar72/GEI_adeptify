import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAttendance, useRegisterAttendance, useAttendanceReport } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  BarChart3, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  attendanceRate: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  class: string;
  subject: string;
  teacher: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

const AttendancePage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { success, error } = useToastHelpers();
  const attendanceQuery = useAttendance();
  const registerAttendance = useRegisterAttendance();
  const attendanceReport = useAttendanceReport();

  // Cargar datos de asistencia
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        const response = await attendanceQuery.execute();
        if (response?.success && response.data) {
          setAttendanceRecords(response.data.records || []);
          setStudents(response.data.students || []);
          setFilteredRecords(response.data.records || []);
        }
      } catch (err) {
        error('Error al cargar datos de asistencia', 'No se pudieron cargar los datos');
      }
    };

    loadAttendanceData();
  }, []);

  // Filtrar registros
  useEffect(() => {
    let filtered = attendanceRecords;

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.teacher.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      // Filtrar por rango de asistencia
      switch (selectedFilter) {
        case 'high':
          filtered = filtered.filter(record => record.attendanceRate >= 90);
          break;
        case 'medium':
          filtered = filtered.filter(record => record.attendanceRate >= 70 && record.attendanceRate < 90);
          break;
        case 'low':
          filtered = filtered.filter(record => record.attendanceRate < 70);
          break;
      }
    }

    setFilteredRecords(filtered);
  }, [attendanceRecords, searchTerm, selectedFilter]);

  const handleRegisterAttendance = async (attendanceData: any) => {
    try {
      const response = await registerAttendance.execute(attendanceData);
      if (response?.success) {
        success('Asistencia registrada', 'La asistencia se ha registrado correctamente');
        setIsRegisterModalOpen(false);
        // Recargar datos
        const updatedResponse = await attendanceQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setAttendanceRecords(updatedResponse.data.records || []);
        }
      } else {
        error('Error al registrar asistencia', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al registrar asistencia', 'Ha ocurrido un error inesperado');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const response = await attendanceReport.execute({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      
      if (response?.success && response.data) {
        // Crear y descargar el reporte
        const blob = new Blob([response.data.content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-asistencia-${new Date().toISOString().split('T')[0]}.csv`;
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

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAttendanceRateIcon = (rate: number) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate >= 70) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const stats = {
    totalRecords: attendanceRecords.length,
    averageRate: attendanceRecords.length > 0 
      ? attendanceRecords.reduce((acc, record) => acc + record.attendanceRate, 0) / attendanceRecords.length 
      : 0,
    totalStudents: students.length,
    todayRecords: attendanceRecords.filter(record => 
      record.date === new Date().toISOString().split('T')[0]
    ).length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Control de Asistencia
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Registra y gestiona la asistencia estudiantil
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleGenerateReport}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar importación */}}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Asistencia
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Registros Totales
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRecords}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tasa Promedio
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Estudiantes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hoy
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.todayRecords}
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
                  placeholder="Buscar por clase, asignatura o profesor..."
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
                <option value="all">Todas las tasas</option>
                <option value="high">Alta (≥90%)</option>
                <option value="medium">Media (70-89%)</option>
                <option value="low">Baja (&lt;70%)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Asistencia</CardTitle>
          <CardDescription>
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''} encontrado{filteredRecords.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay registros de asistencia
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No se encontraron registros con los filtros aplicados'
                  : 'Registra la primera asistencia para comenzar'
                }
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button onClick={() => setIsRegisterModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Asistencia
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {record.class} - {record.subject}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Prof. {record.teacher}</span>
                        <span>•</span>
                        <span>{new Date(record.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{record.totalStudents} estudiantes</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">{record.present}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">{record.absent}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">{record.late}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600">{record.excused}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getAttendanceRateColor(record.attendanceRate)}`}>
                        {record.attendanceRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Tasa de asistencia</div>
                    </div>
                    {getAttendanceRateIcon(record.attendanceRate)}
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

      {/* Register Attendance Modal */}
      {isRegisterModalOpen && (
        <RegisterAttendanceModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSubmit={handleRegisterAttendance}
          students={students}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

// Modal para registrar asistencia
interface RegisterAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  students: Student[];
  selectedDate: string;
}

const RegisterAttendanceModal: React.FC<RegisterAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  selectedDate
}) => {
  const [formData, setFormData] = useState({
    date: selectedDate,
    class: '',
    subject: '',
    teacher: '',
    students: students.map(student => ({
      id: student.id,
      name: student.name,
      status: 'present' as 'present' | 'absent' | 'late' | 'excused'
    }))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.map(student => 
        student.id === studentId ? { ...student, status } : student
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Registrar Asistencia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium mb-1">Clase</label>
              <Input
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Asignatura</label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Profesor</label>
            <Input
              value={formData.teacher}
              onChange={(e) => setFormData({...formData, teacher: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Estudiantes</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <span className="font-medium">{student.name}</span>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={student.status === 'present' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStudentStatus(student.id, 'present')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={student.status === 'absent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStudentStatus(student.id, 'absent')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={student.status === 'late' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStudentStatus(student.id, 'late')}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={student.status === 'excused' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStudentStatus(student.id, 'excused')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Registrar Asistencia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendancePage; 