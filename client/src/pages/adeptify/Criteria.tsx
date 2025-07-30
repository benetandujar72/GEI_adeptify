import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Target, 
  CheckCircle,
  AlertCircle,
  Star,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';

interface Criterion {
  id: string;
  name: string;
  description: string;
  competencyId: string;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  evaluationsCount: number;
}

interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
}

interface CreateCriterionData {
  name: string;
  description: string;
  weight: number;
}

export default function Criteria() {
  const [location, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeight, setFilterWeight] = useState('all');
  
  const queryClient = useQueryClient();

  // Extract competency ID from URL
  const competencyId = location.split('/').pop();

  // Fetch competency details
  const { data: competency } = useQuery<Competency>({
    queryKey: ['competency', competencyId],
    queryFn: async () => {
      const response = await api.get(`/api/competencies/${competencyId}`);
      return response.data;
    },
    enabled: !!competencyId
  });

  // Fetch criteria for this competency
  const { data: criteria, isLoading } = useQuery<Criterion[]>({
    queryKey: ['criteria', competencyId],
    queryFn: async () => {
      const response = await api.get(`/api/competencies/${competencyId}/criteria`);
      return response.data;
    },
    enabled: !!competencyId
  });

  // Create criterion mutation
  const createCriterionMutation = useMutation({
    mutationFn: async (data: CreateCriterionData) => {
      const response = await api.post(`/api/competencies/${competencyId}/criteria`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criteria', competencyId] });
      toast.success('Criteri creat correctament');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Error al crear el criteri');
      console.error('Error creating criterion:', error);
    }
  });

  // Update criterion mutation
  const updateCriterionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCriterionData> }) => {
      const response = await api.put(`/api/competencies/${competencyId}/criteria/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criteria', competencyId] });
      toast.success('Criteri actualitzat correctament');
      setIsEditDialogOpen(false);
      setSelectedCriterion(null);
    },
    onError: (error) => {
      toast.error('Error al actualitzar el criteri');
      console.error('Error updating criterion:', error);
    }
  });

  // Delete criterion mutation
  const deleteCriterionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/competencies/${competencyId}/criteria/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criteria', competencyId] });
      toast.success('Criteri eliminat correctament');
    },
    onError: (error) => {
      toast.error('Error al eliminar el criteri');
      console.error('Error deleting criterion:', error);
    }
  });

  // Filter criteria
  const filteredCriteria = criteria?.filter(criterion => {
    const matchesSearch = criterion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         criterion.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWeight = filterWeight === 'all' || 
                         (filterWeight === 'high' && criterion.weight >= 7) ||
                         (filterWeight === 'medium' && criterion.weight >= 4 && criterion.weight < 7) ||
                         (filterWeight === 'low' && criterion.weight < 4);
    
    return matchesSearch && matchesWeight;
  }) || [];

  const getWeightColor = (weight: number) => {
    if (weight >= 7) return 'bg-red-100 text-red-800';
    if (weight >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getWeightText = (weight: number) => {
    if (weight >= 7) return 'Alt';
    if (weight >= 4) return 'Mitjà';
    return 'Baix';
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
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/adeptify/competencies')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tornar</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Criteris d'Avaluació</h1>
            <p className="text-gray-600 mt-1">
              {competency?.name} - {competency?.description}
            </p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nou Criteri
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nou Criteri</DialogTitle>
            </DialogHeader>
            <CreateCriterionForm 
              onSubmit={(data) => createCriterionMutation.mutate(data)}
              isLoading={createCriterionMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Criteris</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criteria?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Criteris actius
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pes Mitjà</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {criteria && criteria.length > 0 
                ? (criteria.reduce((sum, c) => sum + c.weight, 0) / criteria.length).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Pes mitjà dels criteris
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluacions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {criteria?.reduce((sum, c) => sum + c.evaluationsCount, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluacions realitzades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nivell</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competency?.level || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivell de la competència
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cercar criteris..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={filterWeight}
              onChange={(e) => setFilterWeight(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tots els pesos</option>
              <option value="high">Pes alt (7-10)</option>
              <option value="medium">Pes mitjà (4-6)</option>
              <option value="low">Pes baix (1-3)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Criteria Table */}
      <Card>
        <CardHeader>
          <CardTitle>Llista de Criteris</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Descripció</TableHead>
                <TableHead>Pes</TableHead>
                <TableHead>Evaluacions</TableHead>
                <TableHead>Estat</TableHead>
                <TableHead>Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCriteria.map((criterion) => (
                <TableRow key={criterion.id}>
                  <TableCell>
                    <div className="font-medium">{criterion.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {criterion.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge className={getWeightColor(criterion.weight)}>
                        {getWeightText(criterion.weight)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        ({criterion.weight}/10)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{criterion.evaluationsCount}</TableCell>
                  <TableCell>
                    <Badge variant={criterion.isActive ? "default" : "secondary"}>
                      {criterion.isActive ? 'Actiu' : 'Inactiu'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCriterion(criterion);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Estàs segur que vols eliminar aquest criteri?')) {
                            deleteCriterionMutation.mutate(criterion.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredCriteria.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No s'han trobat criteris</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Criteri</DialogTitle>
          </DialogHeader>
          {selectedCriterion && (
            <EditCriterionForm 
              criterion={selectedCriterion}
              onSubmit={(data) => updateCriterionMutation.mutate({ 
                id: selectedCriterion.id, 
                data 
              })}
              isLoading={updateCriterionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Form Component
function CreateCriterionForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: CreateCriterionData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateCriterionData>({
    name: '',
    description: '',
    weight: 5
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom del criteri
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Expressió oral clara"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripció
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descriu el criteri d'avaluació..."
          rows={3}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pes (1-10)
        </label>
        <Input
          type="number"
          min="1"
          max="10"
          value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          1 = Mínim pes, 10 = Màxim pes
        </p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => {}}>
          Cancel·lar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creant...' : 'Crear Criteri'}
        </Button>
      </div>
    </form>
  );
}

// Edit Form Component
function EditCriterionForm({ 
  criterion, 
  onSubmit, 
  isLoading 
}: { 
  criterion: Criterion;
  onSubmit: (data: Partial<CreateCriterionData>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateCriterionData>({
    name: criterion.name,
    description: criterion.description,
    weight: criterion.weight
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom del criteri
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Expressió oral clara"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripció
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descriu el criteri d'avaluació..."
          rows={3}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pes (1-10)
        </label>
        <Input
          type="number"
          min="1"
          max="10"
          value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          1 = Mínim pes, 10 = Màxim pes
        </p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => {}}>
          Cancel·lar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Actualitzant...' : 'Actualitzar Criteri'}
        </Button>
      </div>
    </form>
  );
} 