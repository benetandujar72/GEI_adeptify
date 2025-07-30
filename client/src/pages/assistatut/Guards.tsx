import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Shield, Activity, Users, TrendingUp, Settings } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface GuardDuty {
  id: number;
  activityTitle: string;
  originalTeacher: string;
  originalTeacherLastName: string;
  substituteTeacher?: string;
  className: string;
  date: string;
  status: string;
  feedbackNotes?: string;
  signedAt?: string;
  createdAt: string;
}

interface GuardAssignmentResult {
  totalGuardsNeeded: number;
  guardsAssigned: number;
  guardsPending: number;
  details: Array<{
    guardId: number;
    originalTeacher: string;
    substituteTeacher?: string;
    classInfo: string;
    timeSlot: string;
    status: string;
    studentsRemaining: number;
  }>;
}

interface GuardStats {
  summary: {
    total: number;
    assigned: number;
    completed: number;
    pending: number;
  };
  teacherStats: Array<{
    teacherId: number;
    teacherName: string;
    teacherLastName: string;
    guardsAssigned: number;
    guardsCompleted: number;
  }>;
}

export default function GuardDutiesPage() {
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [signGuardId, setSignGuardId] = useState<number | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Queries
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activities'],
    select: (data: any[]) => data?.filter(activity => activity.status === 'published') || []
  });

  const { data: myDuties, isLoading: myDutiesLoading } = useQuery({
    queryKey: ['/api/guard-duties/my-duties'],
    select: (data: any) => data?.data || []
  });

  const { data: pendingDuties, isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/guard-duties/pending'],
    select: (data: any) => data?.data || []
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/guard-duties/stats'],
    select: (data: any) => data?.data || null
  });

  // Mutations
  const assignGuardsMutation = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/guard-duties/assign-for-activity/${activityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to assign guards');
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Assignació Completada",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guard-duties/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guard-duties/stats'] });
      setSelectedActivityId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error en l'assignació de guàrdies",
        variant: "destructive",
      });
    },
  });

  const signGuardMutation = useMutation({
    mutationFn: async ({ guardId, feedbackNotes }: { guardId: number; feedbackNotes: string }) => {
      const response = await fetch(`/api/guard-duties/${guardId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackNotes })
      });
      if (!response.ok) throw new Error('Failed to sign guard duty');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Guàrdia Signada",
        description: "La guàrdia s'ha signat correctament",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/guard-duties/my-duties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guard-duties/stats'] });
      setIsSignDialogOpen(false);
      setSignGuardId(null);
      setFeedbackNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error signant la guàrdia",
        variant: "destructive",
      });
    },
  });

  const handleAssignGuards = () => {
    if (!selectedActivityId) {
      toast({
        title: "Error",
        description: "Selecciona una activitat per assignar guàrdies",
        variant: "destructive",
      });
      return;
    }
    assignGuardsMutation.mutate(parseInt(selectedActivityId));
  };

  const handleSignGuard = (guardId: number) => {
    setSignGuardId(guardId);
    setIsSignDialogOpen(true);
  };

  const handleSubmitSignGuard = () => {
    if (signGuardId) {
      signGuardMutation.mutate({ guardId: signGuardId, feedbackNotes });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Assignada</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'pending_assignment':
        return <Badge variant="destructive">Pendent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sistema de Guàrdies Automàtiques</h1>
        <p className="text-gray-600">
          Gestió intel·ligent d'assignacions de guàrdies per sortides i activitats extraescolars
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="my-duties" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Les Meves Guàrdies
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendents
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Estadístiques
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignació Automàtica de Guàrdies
              </CardTitle>
              <CardDescription>
                Selecciona una activitat per assignar automàticament les guàrdies necessàries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activity-select">Activitat/Sortida</Label>
                <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una activitat..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activitiesLoading ? (
                      <SelectItem value="loading" disabled>Carregant activitats...</SelectItem>
                    ) : activities?.length === 0 ? (
                      <SelectItem value="no-activities" disabled>No hi ha activitats disponibles</SelectItem>
                    ) : (
                      activities?.map((activity: any) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          {activity.title} ({formatDate(activity.startDate)})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleAssignGuards} 
                disabled={!selectedActivityId || assignGuardsMutation.isPending}
                className="w-full"
              >
                {assignGuardsMutation.isPending ? "Assignant..." : "Assignar Guàrdies Automàticament"}
              </Button>
              
              {assignGuardsMutation.data && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Resultat de l'Assignació</h3>
                  <p className="text-green-700 mb-2">{assignGuardsMutation.data.message}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total necessàries:</span> {assignGuardsMutation.data.data.totalGuardsNeeded}
                    </div>
                    <div>
                      <span className="font-medium">Assignades:</span> {assignGuardsMutation.data.data.guardsAssigned}
                    </div>
                    <div>
                      <span className="font-medium">Pendents:</span> {assignGuardsMutation.data.data.guardsPending}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.summary.total}</p>
                      <p className="text-sm text-gray-600">Total Guàrdies</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.summary.assigned}</p>
                      <p className="text-sm text-gray-600">Assignades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.summary.completed}</p>
                      <p className="text-sm text-gray-600">Completades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.summary.pending}</p>
                      <p className="text-sm text-gray-600">Pendents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* My Duties Tab */}
        <TabsContent value="my-duties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Les Meves Guàrdies Assignades</CardTitle>
              <CardDescription>
                Guàrdies que t'han estat assignades per cobrir sortides d'altres professors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myDutiesLoading ? (
                <p>Carregant...</p>
              ) : myDuties?.length === 0 ? (
                <p className="text-gray-500">No tens guàrdies assignades actualment.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activitat</TableHead>
                      <TableHead>Professor Original</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Estat</TableHead>
                      <TableHead>Accions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myDuties?.map((duty: GuardDuty) => (
                      <TableRow key={duty.id}>
                        <TableCell className="font-medium">
                          {duty.activityTitle || 'Sortida/Activitat'}
                        </TableCell>
                        <TableCell>
                          {duty.originalTeacher} {duty.originalTeacherLastName}
                        </TableCell>
                        <TableCell>{duty.className}</TableCell>
                        <TableCell>{formatDate(duty.date)}</TableCell>
                        <TableCell>{getStatusBadge(duty.status)}</TableCell>
                        <TableCell>
                          {duty.status === 'assigned' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleSignGuard(duty.id)}
                            >
                              Signar Guàrdia
                            </Button>
                          )}
                          {duty.status === 'completed' && duty.signedAt && (
                            <Badge variant="outline" className="text-xs">
                              Signada {formatDate(duty.signedAt)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guàrdies Pendents d'Assignar</CardTitle>
              <CardDescription>
                Guàrdies que necessiten un professor substitut
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <p>Carregant...</p>
              ) : pendingDuties?.length === 0 ? (
                <p className="text-gray-500">No hi ha guàrdies pendents d'assignar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activitat</TableHead>
                      <TableHead>Professor Original</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Creat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDuties?.map((duty: GuardDuty) => (
                      <TableRow key={duty.id}>
                        <TableCell className="font-medium">
                          {duty.activityTitle || 'Sortida/Activitat'}
                        </TableCell>
                        <TableCell>
                          {duty.originalTeacher} {duty.originalTeacherLastName}
                        </TableCell>
                        <TableCell>{duty.className}</TableCell>
                        <TableCell>{formatDate(duty.date)}</TableCell>
                        <TableCell>{formatDate(duty.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          {statsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Carregant estadístiques...</p>
              </CardContent>
            </Card>
          ) : stats && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Estadístiques per Professor</CardTitle>
                  <CardDescription>
                    Resum de guàrdies assignades i completades per cada professor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.teacherStats?.length === 0 ? (
                    <p className="text-gray-500">No hi ha estadístiques de professors disponibles.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Professor</TableHead>
                          <TableHead>Guàrdies Assignades</TableHead>
                          <TableHead>Guàrdies Completades</TableHead>
                          <TableHead>Percentatge Completat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.teacherStats?.map((teacher: any) => (
                          <TableRow key={teacher.teacherId}>
                            <TableCell className="font-medium">
                              {teacher.teacherName} {teacher.teacherLastName}
                            </TableCell>
                            <TableCell>{teacher.guardsAssigned}</TableCell>
                            <TableCell>{teacher.guardsCompleted}</TableCell>
                            <TableCell>
                              {teacher.guardsAssigned > 0 
                                ? Math.round((teacher.guardsCompleted / teacher.guardsAssigned) * 100)
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Sign Guard Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signar Guàrdia</DialogTitle>
            <DialogDescription>
              Confirma que has completat la guàrdia i afegeix qualsevol observació
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Observacions (opcional)</Label>
              <Textarea
                id="feedback"
                placeholder="Afegeix qualsevol comentari sobre la guàrdia..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSignDialogOpen(false)}
                disabled={signGuardMutation.isPending}
              >
                Cancel·lar
              </Button>
              <Button 
                onClick={handleSubmitSignGuard}
                disabled={signGuardMutation.isPending}
              >
                {signGuardMutation.isPending ? "Signant..." : "Signar Guàrdia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}