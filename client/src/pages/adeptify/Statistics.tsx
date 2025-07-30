import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Tipus per a les dades d'estadístiques
interface GroupStatsData {
  groupName: string;
  totalEvaluations: number;
  studentCount: number;
  gradeDistribution: {
    NA: number;
    AS: number;
    AN: number;
    AE: number;
  };
  competencyDistribution: {
    [key: string]: number;
  };
}

interface CompetencyStats {
  code: string;
  name: string;
  totalEvaluations: number;
  gradeDistribution: {
    NA: number;
    AS: number;
    AN: number;
    AE: number;
  };
}

const Statistics = () => {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const [selectedGroup, setSelectedGroup] = useState<string>("tots");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("tots");
  
  // Consulta d'avaluacions
  const { 
    data: evaluations = [],
    isLoading: isLoadingEvaluations,
    isError: isErrorEvaluations 
  } = useQuery<any[]>({
    queryKey: ['/api/evaluations'],
  });
  
  // Consulta de competències
  const { 
    data: competencies = [],
    isLoading: isLoadingCompetencies,
    isError: isErrorCompetencies 
  } = useQuery<any[]>({
    queryKey: ['/api/competencies'],
  });
  
  // Grups únics per al filtre
  const uniqueGroups = evaluations && evaluations.length > 0 
    ? Array.from(new Set(evaluations.map((evaluation: any) => evaluation.group_name))).sort()
    : [];
  
  // Competències úniques per al filtre
  const uniqueCompetencies = competencies && competencies.length > 0 
    ? competencies.map((comp: any) => ({
        code: comp.code,
        name: comp.subject || comp.description?.substring(0, 30)
      }))
    : [];
  
  // Filtratge d'avaluacions segons els filtres
  const filteredEvaluations = evaluations.filter((evaluation: any) => {
    // Filtratge per grup
    const groupMatch = selectedGroup === "tots" || evaluation.group_name === selectedGroup;
    
    // Filtratge per competència
    const competencyMatch = selectedCompetency === "tots" || evaluation.competencyCode === selectedCompetency;
    
    // Filtratge per professor (només les pròpies si no és admin)
    const userMatch = isAdmin || evaluation.userId === user?.id;
    
    return groupMatch && competencyMatch && userMatch;
  });
  
  // Estadístiques per grup
  const groupStats: GroupStatsData[] = uniqueGroups.map((groupName: any) => {
    const groupEvaluations = filteredEvaluations.filter((e: any) => e.group_name === groupName);
    
    // Distribució de notes per grup
    const gradeDistribution = {
      NA: 0,
      AS: 0,
      AN: 0,
      AE: 0
    };
    
    // Distribució de competències avaluades per grup
    const competencyDistribution: {[key: string]: number} = {};
    
    groupEvaluations.forEach((evaluation: any) => {
      // Compte de competències
      const compCode = evaluation.competencyCode;
      competencyDistribution[compCode] = (competencyDistribution[compCode] || 0) + 1;
      
      // Compte de qualificacions
      if (evaluation.evaluationData && evaluation.evaluationData.grades) {
        evaluation.evaluationData.grades.forEach((grade: any) => {
          if (grade.grade in gradeDistribution) {
            gradeDistribution[grade.grade as keyof typeof gradeDistribution]++;
          }
        });
      }
    });
    
    return {
      groupName,
      totalEvaluations: groupEvaluations.length,
      studentCount: groupEvaluations.length > 0 ? groupEvaluations[0].studentCount : 0,
      gradeDistribution,
      competencyDistribution
    };
  });
  
  // Estadístiques per competència
  const competencyStats: CompetencyStats[] = uniqueCompetencies.map((comp: any) => {
    const compEvaluations = filteredEvaluations.filter(
      (e: any) => e.competencyCode === comp.code
    );
    
    // Distribució de notes per competència
    const gradeDistribution = {
      NA: 0,
      AS: 0,
      AN: 0,
      AE: 0
    };
    
    compEvaluations.forEach((evaluation: any) => {
      if (evaluation.evaluationData && evaluation.evaluationData.grades) {
        evaluation.evaluationData.grades.forEach((grade: any) => {
          if (grade.grade in gradeDistribution) {
            gradeDistribution[grade.grade as keyof typeof gradeDistribution]++;
          }
        });
      }
    });
    
    return {
      code: comp.code,
      name: comp.name,
      totalEvaluations: compEvaluations.length,
      gradeDistribution
    };
  });
  
  // Dades per als gràfics
  
  // 1. Dades per al gràfic de barres de distribució de notes per grup
  const groupGradeData = groupStats.map(group => ({
    name: group.groupName,
    NA: group.gradeDistribution.NA,
    AS: group.gradeDistribution.AS,
    AN: group.gradeDistribution.AN,
    AE: group.gradeDistribution.AE,
  }));
  
  // 2. Dades per al gràfic circular de distribució de notes totals
  const totalGradeDistribution = {
    NA: 0,
    AS: 0,
    AN: 0,
    AE: 0,
  };
  
  filteredEvaluations.forEach((evaluation: any) => {
    if (evaluation.evaluationData && evaluation.evaluationData.grades) {
      evaluation.evaluationData.grades.forEach((grade: any) => {
        if (grade.grade in totalGradeDistribution) {
          totalGradeDistribution[grade.grade as keyof typeof totalGradeDistribution]++;
        }
      });
    }
  });
  
  const totalGradePieData = [
    { name: 'NA', value: totalGradeDistribution.NA, color: '#EF4444' },
    { name: 'AS', value: totalGradeDistribution.AS, color: '#3B82F6' },
    { name: 'AN', value: totalGradeDistribution.AN, color: '#8B5CF6' },
    { name: 'AE', value: totalGradeDistribution.AE, color: '#F59E0B' },
  ];
  
  // 3. Dades del resum general
  const totalEvaluations = filteredEvaluations.length;
  const totalStudentsEvaluated = filteredEvaluations.reduce((acc: number, curr: any) => 
    acc + (curr.studentCount || 0), 0);
  const totalGrades = Object.values(totalGradeDistribution).reduce((a, b) => a + b, 0);
  const averageGradePerStudent = totalStudentsEvaluated > 0 
    ? (totalGrades / totalStudentsEvaluated).toFixed(2) 
    : '0';
  
  if (isLoadingEvaluations || isLoadingCompetencies) {
    return (
      <div className="flex justify-center items-center h-32">
        <span className="material-icons animate-spin mr-2">sync</span>
        Carregant dades d'estadístiques...
      </div>
    );
  }
  
  if (isErrorEvaluations || isErrorCompetencies) {
    return (
      <div className="p-4 text-error text-center">
        <span className="material-icons mr-2">error</span>
        Error en carregar les dades d'estadístiques
      </div>
    );
  }
  
  return (
    <PageLayout>
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 border-b border-border pb-4">
          <h2 className="text-primary text-xl font-medium">Estadístiques d'avaluació</h2>
          <p className="text-secondary text-sm mt-1">
            Visualització del rendiment i progrés dels alumnes en les avaluacions de competències.
          </p>
        </div>
        
        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="group-filter">Grup:</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger id="group-filter" className="w-[140px]">
                <SelectValue placeholder="Tots els grups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tots">Tots els grups</SelectItem>
                {uniqueGroups.map((group: any) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="competency-filter">Competència:</Label>
            <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
              <SelectTrigger id="competency-filter" className="w-[180px]">
                <SelectValue placeholder="Totes les competències" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tots">Totes les competències</SelectItem>
                {uniqueCompetencies.map((comp: any, index: number) => (
                  <SelectItem key={`comp-select-${comp.code}-${index}`} value={comp.code}>
                    {comp.code} - {comp.name?.substring(0, 20)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Targetes de resum */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary">
                Total d'avaluacions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalEvaluations}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary">
                Estudiants avaluats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStudentsEvaluated}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary">
                Total qualificacions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalGrades}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary">
                Mitjana de criteris per estudiant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{averageGradePerStudent}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Gràfics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gràfic de barres */}
          <Card>
            <CardHeader>
              <CardTitle>Distribució de qualificacions per grup</CardTitle>
            </CardHeader>
            <CardContent>
              {groupGradeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupGradeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={70} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="NA" name="NA" fill="#EF4444" />
                    <Bar dataKey="AS" name="AS" fill="#3B82F6" />
                    <Bar dataKey="AN" name="AN" fill="#8B5CF6" />
                    <Bar dataKey="AE" name="AE" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[300px]">
                  <p className="text-secondary">No hi ha dades per mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Gràfic circular */}
          <Card>
            <CardHeader>
              <CardTitle>Distribució total de qualificacions</CardTitle>
            </CardHeader>
            <CardContent>
              {totalGradePieData.some(d => d.value > 0) ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={totalGradePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {totalGradePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="flex gap-4 mt-4">
                    {totalGradePieData.map((entry) => (
                      <div key={entry.name} className="flex items-center">
                        <div 
                          className="w-3 h-3 mr-1 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        ></div>
                        <span className="text-xs">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-[300px]">
                  <p className="text-secondary">No hi ha dades per mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Taula de competències */}
        <Card>
          <CardHeader>
            <CardTitle>Rendiment per competència</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Codi</th>
                    <th className="text-left py-2 px-3 font-medium">Competència</th>
                    <th className="text-center py-2 px-3 font-medium">Avaluacions</th>
                    <th className="text-center py-2 px-3 font-medium">NA</th>
                    <th className="text-center py-2 px-3 font-medium">AS</th>
                    <th className="text-center py-2 px-3 font-medium">AN</th>
                    <th className="text-center py-2 px-3 font-medium">AE</th>
                  </tr>
                </thead>
                <tbody>
                  {competencyStats
                    .filter(comp => comp.totalEvaluations > 0)
                    .sort((a, b) => b.totalEvaluations - a.totalEvaluations)
                    .map(comp => {
                      const total = Object.values(comp.gradeDistribution).reduce((a, b) => a + b, 0);
                      // Generar una clau única
                      const uniqueKey = `stat-${comp.code}-${Math.random().toString(36).substr(2, 9)}`;
                      
                      return (
                        <tr key={uniqueKey} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{comp.code}</td>
                          <td className="py-2 px-3">{comp.name}</td>
                          <td className="py-2 px-3 text-center">{comp.totalEvaluations}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-red-500">{comp.gradeDistribution.NA}</span>
                            <span className="text-secondary text-xs ml-1">
                              ({total > 0 ? ((comp.gradeDistribution.NA / total) * 100).toFixed(0) : 0}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-blue-500">{comp.gradeDistribution.AS}</span>
                            <span className="text-secondary text-xs ml-1">
                              ({total > 0 ? ((comp.gradeDistribution.AS / total) * 100).toFixed(0) : 0}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-purple-500">{comp.gradeDistribution.AN}</span>
                            <span className="text-secondary text-xs ml-1">
                              ({total > 0 ? ((comp.gradeDistribution.AN / total) * 100).toFixed(0) : 0}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-orange-500">{comp.gradeDistribution.AE}</span>
                            <span className="text-secondary text-xs ml-1">
                              ({total > 0 ? ((comp.gradeDistribution.AE / total) * 100).toFixed(0) : 0}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {competencyStats.filter(comp => comp.totalEvaluations > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-secondary">
                        No hi ha dades per mostrar amb els filtres seleccionats
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Cobertura de competències per grup */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cobertura de competències per grup</CardTitle>
            <p className="text-sm text-gray-500">Mostra les competències treballades i pendents a cada grup</p>
          </CardHeader>
          <CardContent>
            {uniqueGroups.length > 0 ? (
              <div className="space-y-6">
                {uniqueGroups.map((groupName) => {
                  // Obtenim les competències avaluades en aquest grup
                  const groupEvaluations = evaluations.filter((e: any) => e.group_name === groupName);
                  const evaluatedCompetencyCodes = Array.from(new Set(
                    groupEvaluations.map((e: any) => e.competencyCode)
                  ));
                  
                  // Calculem les competències que no s'han avaluat encara
                  const pendingCompetencies = competencies.filter((comp: any) => 
                    !evaluatedCompetencyCodes.includes(comp.code)
                  );
                  
                  return (
                    <div key={groupName} className="border rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-2">{groupName}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-green-600 mb-2 flex items-center">
                            <span className="material-icons text-green-600 mr-1 text-base">check_circle</span>
                            Competències avaluades ({evaluatedCompetencyCodes.length})
                          </h5>
                          
                          {evaluatedCompetencyCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {evaluatedCompetencyCodes.map((code) => {
                                const comp = competencies.find((c: any) => c.code === code);
                                return (
                                  <div key={`${groupName}-evaluated-${code}-${comp?.id}`} className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
                                    <strong>{code}</strong>: {comp?.subject || comp?.description?.substring(0, 30)}...
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No s'ha avaluat cap competència en aquest grup</p>
                          )}
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-orange-600 mb-2 flex items-center">
                            <span className="material-icons text-orange-600 mr-1 text-base">pending</span>
                            Competències pendents ({pendingCompetencies.length})
                          </h5>
                          
                          {pendingCompetencies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pendingCompetencies.map((comp: any) => (
                                <div key={`${groupName}-pending-${comp.code}-${comp.id}`} className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs">
                                  <strong>{comp.code}</strong>: {comp.subject || comp.description?.substring(0, 30)}...
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">S'han avaluat totes les competències en aquest grup</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full" 
                            style={{ 
                              width: `${competencies.length > 0 
                                ? Math.round((evaluatedCompetencyCodes.length / competencies.length) * 100) 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-right mt-1 text-gray-500">
                          {competencies.length > 0 
                            ? Math.round((evaluatedCompetencyCodes.length / competencies.length) * 100) 
                            : 0}% completat
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No hi ha dades de grups disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
};

export default Statistics;