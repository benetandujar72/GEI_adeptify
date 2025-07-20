import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToastHelpers } from '../ui/Toast';
import { useCreateAcademicYear } from '../../hooks/useApi';
import { 
  Calendar, 
  School, 
  Users, 
  BookOpen, 
  Shield, 
  FileText, 
  BarChart3, 
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface AcademicYearData {
  name: string;
  start_date: string;
  end_date: string;
  institute_id: string;
  modules: {
    evaluation: boolean;
    attendance: boolean;
    guard: boolean;
    surveys: boolean;
    resources: boolean;
    analytics: boolean;
  };
  settings: {
    auto_assign_guards: boolean;
    attendance_threshold: number;
    evaluation_weighting: boolean;
    ai_assistance: boolean;
  };
}

const AcademicYearWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<AcademicYearData>({
    name: '',
    start_date: '',
    end_date: '',
    institute_id: '',
    modules: {
      evaluation: true,
      attendance: true,
      guard: true,
      surveys: false,
      resources: false,
      analytics: false,
    },
    settings: {
      auto_assign_guards: true,
      attendance_threshold: 85,
      evaluation_weighting: true,
      ai_assistance: true,
    },
  });

  const { success, error } = useToastHelpers();
  const createAcademicYear = useCreateAcademicYear();

  const steps: WizardStep[] = [
    {
      id: 'basic-info',
      title: 'Información Básica',
      description: 'Define el nombre y fechas del año académico',
      icon: <Calendar className="h-5 w-5" />,
      completed: !!(data.name && data.start_date && data.end_date),
    },
    {
      id: 'modules',
      title: 'Módulos Activos',
      description: 'Selecciona qué módulos estarán disponibles',
      icon: <BookOpen className="h-5 w-5" />,
      completed: Object.values(data.modules).some(Boolean),
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Ajusta la configuración específica del año',
      icon: <Shield className="h-5 w-5" />,
      completed: true,
    },
    {
      id: 'review',
      title: 'Revisión',
      description: 'Revisa y confirma la configuración',
      icon: <CheckCircle className="h-5 w-5" />,
      completed: false,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await createAcademicYear.execute({
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        institute_id: data.institute_id,
      });

      if (response?.success) {
        success('Año académico creado', 'El año académico se ha creado correctamente');
        // Aquí podrías redirigir o cerrar el wizard
      } else {
        error('Error al crear año académico', response?.error || 'Error desconocido');
      }
    } catch (err) {
      error('Error al crear año académico', 'Ha ocurrido un error inesperado');
    }
  };

  const updateData = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateModules = (module: string, value: boolean) => {
    setData(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: value,
      },
    }));
  };

  const updateSettings = (setting: string, value: any) => {
    setData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value,
      },
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">Nombre del Año Académico</label>
              <Input
                type="text"
                placeholder="Ej: 2024-2025"
                value={data.name}
                onChange={(e) => updateData('name', e.target.value)}
              />
              <p className="form-help">Usa un nombre descriptivo como "2024-2025" o "Primer Trimestre 2024"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Fecha de Inicio</label>
                <Input
                  type="date"
                  value={data.start_date}
                  onChange={(e) => updateData('start_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Fin</label>
                <Input
                  type="date"
                  value={data.end_date}
                  onChange={(e) => updateData('end_date', e.target.value)}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                💡 Consejo
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Asegúrate de que las fechas cubran todo el período académico. 
                Puedes crear múltiples años académicos para diferentes trimestres o semestres.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`cursor-pointer transition-all ${data.modules.evaluation ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('evaluation', !data.modules.evaluation)}>
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-6 w-6 text-blue-500" />
                    <div>
                      <h3 className="font-medium">Evaluación</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sistema de evaluación por competencias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${data.modules.attendance ? 'ring-2 ring-green-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('attendance', !data.modules.attendance)}>
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-green-500" />
                    <div>
                      <h3 className="font-medium">Asistencia</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Control de asistencia estudiantil
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${data.modules.guard ? 'ring-2 ring-yellow-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('guard', !data.modules.guard)}>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-yellow-500" />
                    <div>
                      <h3 className="font-medium">Guardias</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestión automática de guardias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${data.modules.surveys ? 'ring-2 ring-purple-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('surveys', !data.modules.surveys)}>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-purple-500" />
                    <div>
                      <h3 className="font-medium">Encuestas</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sistema de encuestas y valoraciones
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${data.modules.resources ? 'ring-2 ring-orange-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('resources', !data.modules.resources)}>
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-orange-500" />
                    <div>
                      <h3 className="font-medium">Recursos</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reservas inteligentes de espacios
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${data.modules.analytics ? 'ring-2 ring-indigo-500' : ''}`}>
                <CardContent className="p-4" onClick={() => updateModules('analytics', !data.modules.analytics)}>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-6 w-6 text-indigo-500" />
                    <div>
                      <h3 className="font-medium">Analíticas</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Dashboard de logros académicos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Importante
              </h4>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                Los módulos marcados estarán disponibles para todos los usuarios del instituto. 
                Puedes cambiar esta configuración más tarde desde el panel de administración.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Asignación Automática de Guardias</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        El sistema asignará guardias automáticamente
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.settings.auto_assign_guards}
                      onChange={(e) => updateSettings('auto_assign_guards', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="form-label">Umbral de Asistencia (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={data.settings.attendance_threshold}
                      onChange={(e) => updateSettings('attendance_threshold', parseInt(e.target.value))}
                    />
                    <p className="form-help">Porcentaje mínimo de asistencia requerida</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración Avanzada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Ponderación de Evaluaciones</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Usar sistema de ponderación automática
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.settings.evaluation_weighting}
                      onChange={(e) => updateSettings('evaluation_weighting', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Asistencia de IA</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Habilitar funciones de inteligencia artificial
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.settings.ai_assistance}
                      onChange={(e) => updateSettings('ai_assistance', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Configuración</CardTitle>
                <CardDescription>
                  Revisa la configuración antes de crear el año académico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Información Básica</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p><strong>Nombre:</strong> {data.name}</p>
                      <p><strong>Inicio:</strong> {new Date(data.start_date).toLocaleDateString('es-ES')}</p>
                      <p><strong>Fin:</strong> {new Date(data.end_date).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Módulos Activos</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {Object.entries(data.modules).map(([module, active]) => (
                        <div key={module} className="flex items-center space-x-2">
                          {active ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="capitalize">{module}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Configuración</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <p><strong>Asignación automática de guardias:</strong> {data.settings.auto_assign_guards ? 'Sí' : 'No'}</p>
                      <p><strong>Umbral de asistencia:</strong> {data.settings.attendance_threshold}%</p>
                    </div>
                    <div>
                      <p><strong>Ponderación de evaluaciones:</strong> {data.settings.evaluation_weighting ? 'Sí' : 'No'}</p>
                      <p><strong>Asistencia de IA:</strong> {data.settings.ai_assistance ? 'Sí' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Crear Año Académico
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configura un nuevo año académico para tu instituto
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    index <= currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 ${
                    index < currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={createAcademicYear.loading}
            className="flex items-center space-x-2"
          >
            {createAcademicYear.loading ? (
              <div className="loading-spinner h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>Crear Año Académico</span>
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!steps[currentStep].completed}
            className="flex items-center space-x-2"
          >
            <span>Siguiente</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AcademicYearWizard; 