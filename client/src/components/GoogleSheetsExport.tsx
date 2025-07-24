import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Share2, 
  ExternalLink,
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHeaders: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface GoogleSheetsExportProps {
  module: 'competencies' | 'evaluations' | 'attendance' | 'all';
  onExport?: (spreadsheetId: string, url: string) => void;
}

export const GoogleSheetsExport: React.FC<GoogleSheetsExportProps> = ({ 
  module, 
  onExport 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'xlsx',
    includeHeaders: true
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  
  const { addToast } = useToast();
  const { user } = useAuth();

  const moduleConfig = {
    competencies: {
      title: 'Competencias',
      icon: BookOpen,
      description: 'Exportar competencias y criterios de evaluación',
      defaultTitle: 'GEI Platform - Competencias'
    },
    evaluations: {
      title: 'Evaluaciones',
      icon: CheckCircle,
      description: 'Exportar evaluaciones y puntuaciones',
      defaultTitle: 'GEI Platform - Evaluaciones'
    },
    attendance: {
      title: 'Asistencia',
      icon: Users,
      description: 'Exportar registros de asistencia',
      defaultTitle: 'GEI Platform - Asistencia'
    },
    all: {
      title: 'Datos Completos',
      icon: FileSpreadsheet,
      description: 'Exportar todos los datos del módulo',
      defaultTitle: 'GEI Platform - Datos Completos'
    }
  };

  const config = moduleConfig[module];

  const handleExport = async () => {
    if (!title.trim()) {
      addToast({
        title: 'Error',
        description: 'El título es requerido',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      let endpoint = '';
      let payload: any = {
        title: title || config.defaultTitle,
        description,
        options: {
          ...exportOptions,
          dateRange: dateRange.start && dateRange.end ? {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          } : undefined
        }
      };

      switch (module) {
        case 'competencies':
          endpoint = '/api/google-sheets/export/competencies';
          break;
        case 'evaluations':
          endpoint = '/api/google-sheets/export/evaluations';
          break;
        case 'attendance':
          endpoint = '/api/google-sheets/export/attendance';
          break;
        case 'all':
          endpoint = '/api/google-sheets/export/all';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSpreadsheetId(data.spreadsheetId || '');
        setSpreadsheetUrl(data.url || '');
        
        addToast({
          title: 'Exportación exitosa',
          description: data.message,
          type: 'success'
        });

        if (onExport) {
          onExport(data.spreadsheetId, data.url);
        }

        // Cerrar diálogo después de un breve delay
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        throw new Error(data.error || 'Error en la exportación');
      }
    } catch (error) {
      console.error('Error en exportación:', error);
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error en la exportación',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!spreadsheetId) return;

    const email = prompt('Ingresa el email para compartir:');
    if (!email) return;

    try {
      const response = await fetch('/api/google-sheets/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spreadsheetId,
          email,
          role: 'reader'
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          title: 'Compartido exitosamente',
          description: `Hoja compartida con ${email}`,
          type: 'success'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Error al compartir la hoja',
        type: 'error'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar a Google Sheets
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título de la hoja</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config.defaultTitle}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de los datos exportados"
            />
          </div>

          {module === 'attendance' && (
            <div className="space-y-2">
              <Label>Rango de fechas (opcional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Opciones de exportación</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="headers" className="text-sm">Incluir encabezados</Label>
              <Switch
                id="headers"
                checked={exportOptions.includeHeaders}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeHeaders: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="format">Formato</Label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: 'csv' | 'xlsx') => 
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {spreadsheetUrl && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Exportación completada</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(spreadsheetUrl, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir hoja
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center gap-1"
                >
                  <Share2 className="h-3 w-3" />
                  Compartir
                </Button>
              </div>
            </Card>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exportando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </div>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 