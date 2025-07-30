import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Trash2, 
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Bell,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface AdeptifySettings {
  id: string;
  instituteId: string;
  moduleName: string;
  isActive: boolean;
  evaluationPeriod: 'quarterly' | 'semester' | 'annual';
  autoNotifications: boolean;
  emailNotifications: boolean;
  defaultWeight: number;
  passingScore: number;
  maxRetries: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'ca' | 'es' | 'en';
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  lastBackup: string;
  createdAt: string;
  updatedAt: string;
}

interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export default function Settings() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<AdeptifySettings>>({});
  
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: adeptifySettings, isLoading } = useQuery<AdeptifySettings>({
    queryKey: ['adeptify-settings'],
    queryFn: async () => {
      const response = await api.get('/api/adeptify/settings');
      return response.data;
    },
    onSuccess: (data) => {
      setSettings(data);
    }
  });

  // Fetch backup history
  const { data: backups } = useQuery<BackupInfo[]>({
    queryKey: ['adeptify-backups'],
    queryFn: async () => {
      const response = await api.get('/api/adeptify/backups');
      return response.data;
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<AdeptifySettings>) => {
      const response = await api.put('/api/adeptify/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adeptify-settings'] });
      toast.success('Configuració actualitzada correctament');
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error('Error al actualitzar la configuració');
      console.error('Error updating settings:', error);
      setIsSaving(false);
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/adeptify/backups');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adeptify-backups'] });
      toast.success('Còpia de seguretat creada correctament');
    },
    onError: (error) => {
      toast.error('Error al crear la còpia de seguretat');
      console.error('Error creating backup:', error);
    }
  });

  const handleSave = () => {
    setIsSaving(true);
    updateSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    if (adeptifySettings) {
      setSettings(adeptifySettings);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
          <h1 className="text-3xl font-bold text-gray-900">Configuració Adeptify</h1>
          <p className="text-gray-600 mt-1">
            Gestiona la configuració del mòdul de competències
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Desant...' : 'Desar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Module Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configuració del Mòdul</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mòdul Actiu</label>
                  <p className="text-xs text-gray-500">Activa o desactiva el mòdul Adeptify</p>
                </div>
                <Switch
                  checked={settings.isActive || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom del Mòdul
                </label>
                <Input
                  value={settings.moduleName || ''}
                  onChange={(e) => setSettings({ ...settings, moduleName: e.target.value })}
                  placeholder="Adeptify - Gestió de Competències"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Període d'Avaluació
                </label>
                <select
                  value={settings.evaluationPeriod || 'quarterly'}
                  onChange={(e) => setSettings({ ...settings, evaluationPeriod: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quarterly">Trimestral</option>
                  <option value="semester">Semestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Configuració d'Avaluacions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pes per Defecte
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.defaultWeight || 5}
                    onChange={(e) => setSettings({ ...settings, defaultWeight: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Pes per defecte dels criteris (1-10)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nota d'Aprovat
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.passingScore || 60}
                    onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Percentatge mínim per aprovar</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Màxim d'Intents
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRetries || 3}
                  onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Nombre màxim d'intents per avaluació</p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notificacions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notificacions Automàtiques</label>
                  <p className="text-xs text-gray-500">Envia notificacions automàtiques per avaluacions pendents</p>
                </div>
                <Switch
                  checked={settings.autoNotifications || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notificacions per Email</label>
                  <p className="text-xs text-gray-500">Envia notificacions per correu electrònic</p>
                </div>
                <Switch
                  checked={settings.emailNotifications || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Aparença</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tema
                </label>
                <select
                  value={settings.theme || 'light'}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Clar</option>
                  <option value="dark">Fosc</option>
                  <option value="auto">Automàtic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idioma
                </label>
                <select
                  value={settings.language || 'ca'}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ca">Català</option>
                  <option value="es">Espanyol</option>
                  <option value="en">Anglès</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Backup & Restore */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Còpies de Seguretat</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Freqüència de Backup</label>
                  <p className="text-xs text-gray-500">Freqüència automàtica de còpies</p>
                </div>
                <select
                  value={settings.backupFrequency || 'weekly'}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value as any })}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Diari</option>
                  <option value="weekly">Setmanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div className="text-xs text-gray-500">
                Últim backup: {adeptifySettings?.lastBackup ? 
                  new Date(adeptifySettings.lastBackup).toLocaleDateString('ca-ES') : 
                  'Mai'
                }
              </div>

              <Button 
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Crear Backup
              </Button>
            </CardContent>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historial de Backups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backups?.slice(0, 5).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="text-xs font-medium">{backup.filename}</div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(backup.size)} • {new Date(backup.createdAt).toLocaleDateString('ca-ES')}
                      </div>
                    </div>
                    <Badge 
                      variant={backup.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {backup.status === 'completed' ? 'Completat' : 
                       backup.status === 'failed' ? 'Fallit' : 'En curs'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Informació del Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Versió:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última actualització:</span>
                <span>{adeptifySettings?.updatedAt ? 
                  new Date(adeptifySettings.updatedAt).toLocaleDateString('ca-ES') : 
                  'N/A'
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estat:</span>
                <Badge variant={adeptifySettings?.isActive ? 'default' : 'secondary'}>
                  {adeptifySettings?.isActive ? 'Actiu' : 'Inactiu'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 