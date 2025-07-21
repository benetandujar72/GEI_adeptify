import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useEvaluations, useCreateEvaluation, useUpdateEvaluation, useDeleteEvaluation } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  BarChart3, 
  BookOpen, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  FileText,
  TrendingUp,
  Award,
  Clock
} from 'lucide-react';

interface Evaluation {
  id: string;
  name: string;
  subject: string;
  type: 'exam' | 'project' | 'presentation' | 'participation';
  date: string;
  weight: number;
  status: 'draft' | 'active' | 'completed';
  totalStudents: number;
  averageScore: number;
  competencies: string[];
}

const EvaluationPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const { success, error } = useToastHelpers();
  const evaluationsQuery = useEvaluations();
  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();

  // Cargar evaluaciones
  useEffect(() => {
    const loadEvaluations = async () => {
      try {
        const response = await evaluationsQuery.execute();
        if (response?.success && response.data) {
          setEvaluations(response.data);
          setFilteredEvaluations(response.data);
        }
      } catch (err) {
        error('Error al cargar evaluaciones', 'No se pudieron cargar las evaluaciones');
      }
    };

    loadEvaluations();
  }, []);

  // Filtrar evaluaciones
  useEffect(() => {
    let filtered = evaluations;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(evaluation => 
        evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.status === selectedFilter);
    }

    setFilteredEvaluations(filtered);
  }, [evaluations, searchTerm, selectedFilter]);

  const handleCreateEvaluation = async (evaluationData: any) => {
    try {
      const response = await createEvaluation.execute(evaluationData);
      if (response?.success) {
        success('Evaluación creada', 'La evaluación se ha creado correctamente');
        setIsCreateModalOpen(false);
        // Recargar evaluaciones
        const updatedResponse = await evaluationsQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setEvaluations(updatedResponse.data);
        }
      } else {
        error('Error al crear evaluación', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al crear evaluación', 'Ha ocurrido un error inesperado');
    }
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta evaluación?')) return;

    try {
      const response = await deleteEvaluation.execute(evaluationId);
      if (response?.success) {
        success('Evaluación eliminada', 'La evaluación se ha eliminado correctamente');
        setEvaluations(prev => prev.filter(evaluation => evaluation.id !== evaluationId));
      } else {
        error('Error al eliminar evaluación', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al eliminar evaluación', 'Ha ocurrido un error inesperado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exam': return 'Examen';
      case 'project': return 'Proyecto';
      case 'presentation': return 'Presentación';
      case 'participation': return 'Participación';
      default: return 'Otro';
    }
  };

  const stats = {
    total: evaluations.length,
    active: evaluations.filter(e => e.status === 'active').length,
    completed: evaluations.filter(e => e.status === 'completed').length,
    averageScore: evaluations.length > 0 
      ? evaluations.reduce((acc, evaluation) => acc + evaluation.averageScore, 0) / evaluations.length 
      : 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Módulo de Evaluación
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestiona evaluaciones, competencias y calificaciones
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar importación */}}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implementar exportación */}}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Evaluaciones
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Activas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Promedio
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageScore.toFixed(1)}
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
                  placeholder="Buscar evaluaciones..."
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
                <option value="draft">Borrador</option>
                <option value="active">Activa</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones</CardTitle>
          <CardDescription>
            {filteredEvaluations.length} evaluación{filteredEvaluations.length !== 1 ? 'es' : ''} encontrada{filteredEvaluations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay evaluaciones
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No se encontraron evaluaciones con los filtros aplicados'
                  : 'Crea tu primera evaluación para comenzar'
                }
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Evaluación
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {evaluation.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{evaluation.subject}</span>
                        <span>•</span>
                        <span>{getTypeLabel(evaluation.type)}</span>
                        <span>•</span>
                        <span>{new Date(evaluation.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{evaluation.weight}%</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(evaluation.status)}`}>
                          {getStatusLabel(evaluation.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {evaluation.totalStudents} estudiantes
                        </span>
                        {evaluation.averageScore > 0 && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              Promedio: {evaluation.averageScore.toFixed(1)}
                            </span>
                          </>
                        )}
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
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvaluation(evaluation.id)}
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

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <CreateEvaluationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateEvaluation}
          evaluation={selectedEvaluation}
        />
      )}
    </div>
  );
};

// Modal para crear/editar evaluación
interface CreateEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  evaluation?: Evaluation | null;
}

const CreateEvaluationModal: React.FC<CreateEvaluationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  evaluation
}) => {
  const [formData, setFormData] = useState({
    name: evaluation?.name || '',
    subject: evaluation?.subject || '',
    type: evaluation?.type || 'exam',
    date: evaluation?.date || '',
    weight: evaluation?.weight || 100,
    status: evaluation?.status || 'draft',
    competencies: evaluation?.competencies || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {evaluation ? 'Editar Evaluación' : 'Nueva Evaluación'}
        </h2>
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
            <label className="block text-sm font-medium mb-1">Asignatura</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="exam">Examen</option>
              <option value="project">Proyecto</option>
              <option value="presentation">Presentación</option>
              <option value="participation">Participación</option>
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
          <div>
            <label className="block text-sm font-medium mb-1">Peso (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.weight}
              onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value)})}
              required
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {evaluation ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationPage; 