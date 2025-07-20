import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useSurveys, useCreateSurvey, useSurveyResponses, useSurveyAnalytics } from '../../hooks/useApi';
import { useToastHelpers } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  BarChart3, 
  FileText, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  Share,
  PieChart,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Send,
  XCircle
} from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'student' | 'teacher' | 'parent' | 'general';
  targetAudience: string[];
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  questions: Question[];
  totalResponses: number;
  responseRate: number;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  respondentName: string;
  answers: Answer[];
  submittedAt: string;
}

interface Answer {
  questionId: string;
  value: string | number;
  text?: string;
}

const SurveysPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  const { success, error } = useToastHelpers();
  const surveysQuery = useSurveys();
  const createSurvey = useCreateSurvey();
  const surveyResponses = useSurveyResponses();
  const surveyAnalytics = useSurveyAnalytics();

  // Cargar encuestas
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        const response = await surveysQuery.execute();
        if (response?.success && response.data) {
          setSurveys(response.data);
          setFilteredSurveys(response.data);
        }
      } catch (err) {
        error('Error al cargar encuestas', 'No se pudieron cargar las encuestas');
      }
    };

    loadSurveys();
  }, []);

  // Filtrar encuestas
  useEffect(() => {
    let filtered = surveys;

    if (searchTerm) {
      filtered = filtered.filter(survey => 
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(survey => survey.status === selectedFilter);
    }

    setFilteredSurveys(filtered);
  }, [surveys, searchTerm, selectedFilter]);

  const handleCreateSurvey = async (surveyData: any) => {
    try {
      const response = await createSurvey.execute(surveyData);
      if (response?.success) {
        success('Encuesta creada', 'La encuesta se ha creado correctamente');
        setIsCreateModalOpen(false);
        // Recargar encuestas
        const updatedResponse = await surveysQuery.execute();
        if (updatedResponse?.success && updatedResponse.data) {
          setSurveys(updatedResponse.data);
        }
      } else {
        error('Error al crear encuesta', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al crear encuesta', 'Ha ocurrido un error inesperado');
    }
  };

  const handleShareSurvey = async (surveyId: string) => {
    try {
      const shareUrl = `${window.location.origin}/survey/${surveyId}`;
      await navigator.clipboard.writeText(shareUrl);
      success('Enlace copiado', 'El enlace de la encuesta se ha copiado al portapapeles');
    } catch (err) {
      error('Error al copiar enlace', 'No se pudo copiar el enlace');
    }
  };

  const handleViewResults = async (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsResultsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'archived': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      case 'archived': return 'Archivada';
      default: return 'Desconocido';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'student': return 'Estudiantes';
      case 'teacher': return 'Profesores';
      case 'parent': return 'Padres';
      case 'general': return 'General';
      default: return 'Otro';
    }
  };

  const stats = {
    totalSurveys: surveys.length,
    activeSurveys: surveys.filter(s => s.status === 'active').length,
    completedSurveys: surveys.filter(s => s.status === 'completed').length,
    totalResponses: surveys.reduce((acc, survey) => acc + survey.totalResponses, 0),
    averageResponseRate: surveys.length > 0 
      ? surveys.reduce((acc, survey) => acc + survey.responseRate, 0) / surveys.length 
      : 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Encuestas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Crea, gestiona y analiza encuestas para tu comunidad educativa
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
            onClick={() => {/* TODO: Implementar plantillas */}}
          >
            <FileText className="h-4 w-4 mr-2" />
            Plantillas
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Encuesta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Encuestas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSurveys}
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
                  Activas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeSurveys}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedSurveys}
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
                  Total Respuestas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalResponses.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tasa Respuesta
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageResponseRate.toFixed(1)}%
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
                  placeholder="Buscar encuestas..."
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
                <option value="archived">Archivada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surveys List */}
      <Card>
        <CardHeader>
          <CardTitle>Encuestas</CardTitle>
          <CardDescription>
            {filteredSurveys.length} encuesta{filteredSurveys.length !== 1 ? 's' : ''} encontrada{filteredSurveys.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay encuestas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No se encontraron encuestas con los filtros aplicados'
                  : 'Crea tu primera encuesta para comenzar'
                }
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Encuesta
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {survey.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <Target className="h-3 w-3 mr-1" />
                          {getTypeLabel(survey.type)}
                        </span>
                        <span>•</span>
                        <span>{survey.questions.length} preguntas</span>
                        <span>•</span>
                        <span>{survey.totalResponses} respuestas</span>
                        <span>•</span>
                        <span>{survey.responseRate.toFixed(1)}% tasa</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(survey.status)}`}>
                          {getStatusLabel(survey.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(survey.startDate).toLocaleDateString('es-ES')} - {new Date(survey.endDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewResults(survey)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareSurvey(survey.id)}
                    >
                      <Share className="h-4 w-4" />
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
                      onClick={() => {/* TODO: Eliminar */}}
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

      {/* Create Survey Modal */}
      {isCreateModalOpen && (
        <CreateSurveyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateSurvey}
        />
      )}

      {/* Results Modal */}
      {isResultsModalOpen && selectedSurvey && (
        <SurveyResultsModal
          isOpen={isResultsModalOpen}
          onClose={() => setIsResultsModalOpen(false)}
          survey={selectedSurvey}
        />
      )}
    </div>
  );
};

// Modal para crear encuesta
interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateSurveyModal: React.FC<CreateSurveyModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'student' as 'student' | 'teacher' | 'parent' | 'general',
    targetAudience: [] as string[],
    startDate: '',
    endDate: '',
    questions: [] as Question[]
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    text: '',
    type: 'multiple_choice',
    options: [''],
    required: true
  });

  const handleAddQuestion = () => {
    if (currentQuestion.text.trim()) {
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, { ...currentQuestion, id: Date.now().toString() }]
      }));
      setCurrentQuestion({
        id: '',
        text: '',
        type: 'multiple_choice',
        options: [''],
        required: true
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questions.length === 0) {
      alert('Debes agregar al menos una pregunta');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Crear Nueva Encuesta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                <option value="student">Estudiantes</option>
                <option value="teacher">Profesores</option>
                <option value="parent">Padres</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Preguntas</h3>
            
            {/* Existing Questions */}
            {formData.questions.map((question, index) => (
              <div key={question.id} className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{index + 1}. {question.text}</p>
                    <p className="text-sm text-gray-500">
                      Tipo: {question.type === 'multiple_choice' ? 'Opción múltiple' : 
                             question.type === 'text' ? 'Texto' : 
                             question.type === 'rating' ? 'Calificación' : 'Sí/No'}
                    </p>
                    {question.options && question.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Opciones:</p>
                        <ul className="text-sm">
                          {question.options.map((option, optIndex) => (
                            <li key={optIndex}>• {option}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        questions: prev.questions.filter((_, i) => i !== index)
                      }));
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add New Question */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-3">Agregar Pregunta</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Pregunta</label>
                  <Input
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                    placeholder="Escribe tu pregunta..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <select
                      value={currentQuestion.type}
                      onChange={(e) => setCurrentQuestion({...currentQuestion, type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="multiple_choice">Opción múltiple</option>
                      <option value="text">Texto</option>
                      <option value="rating">Calificación</option>
                      <option value="yes_no">Sí/No</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={currentQuestion.required}
                      onChange={(e) => setCurrentQuestion({...currentQuestion, required: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="required" className="text-sm">Pregunta obligatoria</label>
                  </div>
                </div>
                {currentQuestion.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Opciones</label>
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex space-x-2 mb-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(currentQuestion.options || [])];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({...currentQuestion, options: newOptions});
                          }}
                          placeholder={`Opción ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newOptions = currentQuestion.options?.filter((_, i) => i !== index);
                            setCurrentQuestion({...currentQuestion, options: newOptions});
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = [...(currentQuestion.options || []), ''];
                        setCurrentQuestion({...currentQuestion, options: newOptions});
                      }}
                    >
                      Agregar Opción
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Pregunta
                </Button>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Crear Encuesta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para ver resultados
interface SurveyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Survey;
}

const SurveyResultsModal: React.FC<SurveyResultsModalProps> = ({
  isOpen,
  onClose,
  survey
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Resultados: {survey.title}</h2>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{survey.totalResponses}</p>
                <p className="text-sm text-gray-600">Total Respuestas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{survey.responseRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Tasa de Respuesta</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{survey.questions.length}</p>
                <p className="text-sm text-gray-600">Preguntas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {survey.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {index + 1}. {question.text}
                </CardTitle>
                <CardDescription>
                  Tipo: {question.type === 'multiple_choice' ? 'Opción múltiple' : 
                         question.type === 'text' ? 'Texto' : 
                         question.type === 'rating' ? 'Calificación' : 'Sí/No'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de resultados en desarrollo...</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SurveysPage; 