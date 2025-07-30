import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  attendance: Array<{
    hour: number;
    status: string;
    statusCode: string | null;
    notes: string | null;
    subjectId: number | null;
  }>;
}

interface SubjectSchedule {
  [hour: number]: {
    subjectId: number;
    subjectName: string;
    teacherId: number;
    teacherName: string;
  } | null;
}

interface Class {
  id: number;
  name: string;
  description?: string;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', code: 'X', color: 'bg-green-100 text-green-800' },
  { value: 'absent', label: 'Absent', code: 'F', color: 'bg-red-100 text-red-800' },
  { value: 'justified', label: 'Absència Justificada', code: 'FJ', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'late', label: 'Retard', code: 'R', color: 'bg-orange-100 text-orange-800' },
  { value: 'excused', label: 'Excusat', code: 'E', color: 'bg-blue-100 text-blue-800' },
];

// Helper function to get next weekday (Monday-Friday)
function getNextWeekday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // If it's Saturday (6) or Sunday (0), move to Monday
  if (dayOfWeek === 0) {
    today.setDate(today.getDate() + 1); // Sunday -> Monday
  } else if (dayOfWeek === 6) {
    today.setDate(today.getDate() + 2); // Saturday -> Monday
  }
  
  return today.toISOString().split('T')[0];
}

export default function HourlyAttendancePage() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getNextWeekday());
  const [students, setStudents] = useState<Student[]>([]);
  const [schedule, setSchedule] = useState<SubjectSchedule>({});

  // Get accessible classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/hourly-attendance/classes"],
  });

  // Get attendance data for selected class and date
  const { data: attendanceData, refetch: refetchAttendance } = useQuery({
    queryKey: ["/api/hourly-attendance/class", selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return null;
      const response = await fetch(`/api/hourly-attendance/class/${selectedClass}/date/${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!selectedClass && !!selectedDate,
  });

  // Update students and schedule when attendance data changes
  useEffect(() => {
    if (attendanceData?.students) {
      setStudents(attendanceData.students);
    }
    if (attendanceData?.schedule) {
      setSchedule(attendanceData.schedule);
    }
  }, [attendanceData]);

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, classId, date, hour, status, statusCode, notes }: {
      studentId: number;
      classId: number;
      date: string;
      hour: number;
      status: string;
      statusCode: string | null;
      notes: string | null;
    }) => {
      const response = await fetch('/api/hourly-attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classId, date, hour, status, statusCode, notes }),
      });
      if (!response.ok) throw new Error('Failed to mark attendance');
      return response.json();
    },
    onSuccess: () => {
      refetchAttendance();
      toast({
        title: "Assistència actualitzada",
        description: "L'assistència s'ha marcat correctament",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No s'ha pogut marcar l'assistència",
        variant: "destructive",
      });
    },
  });

  // Mark all present mutation
  const markAllPresentMutation = useMutation({
    mutationFn: async ({ classId, date, hour }: {
      classId: number;
      date: string;
      hour: number;
    }) => {
      const response = await fetch("/api/hourly-attendance/mark-all-present", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classId, date, hour }),
      });
      if (!response.ok) throw new Error('Failed to mark all present');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Èxit",
        description: "Tots els estudiants marcats com a presents",
      });
      refetchAttendance();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No s'ha pogut marcar tots els estudiants presents",
        variant: "destructive",
      });
    },
  });

  const handleMarkAllPresent = (hour: number) => {
    markAllPresentMutation.mutate({
      classId: parseInt(selectedClass),
      date: selectedDate,
      hour,
    });
  };

  const handleAttendanceChange = (studentId: number, hour: number, status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    const statusCode = statusOption?.code || null;

    markAttendanceMutation.mutate({
      studentId,
      classId: parseInt(selectedClass),
      date: selectedDate,
      hour,
      status,
      statusCode,
      notes: null,
    });

    // Update local state immediately for better UX
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? {
            ...student,
            attendance: student.attendance.map(att => 
              att.hour === hour 
                ? { ...att, status, statusCode }
                : att
            )
          }
        : student
    ));
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusCode = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.code || '';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Assistència per Hores</h1>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selecció de Classe i Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Classe</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      {selectedClass && students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assistència - {classes.find(c => c.id.toString() === selectedClass)?.name}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Data: {new Date(selectedDate).toLocaleDateString('ca-ES')}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekend Warning */}
            {(() => {
              const selectedDateObj = new Date(selectedDate);
              const dayOfWeek = selectedDateObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              
              if (isWeekend) {
                return (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">Cap de setmana detectat</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-2">
                      No hi ha assignatures programades els caps de setmana. 
                      Selecciona una data de dilluns a divendres per veure l'horari complet.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3">Llegenda d'estats:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Badge className={option.color}>
                      {option.code}
                    </Badge>
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-medium min-w-[200px]">
                      Estudiant
                    </th>
                    {Array.from({ length: 6 }, (_, i) => {
                      const hour = i + 1;
                      const subjectInfo = schedule[hour];
                      return (
                        <th key={hour} className="border border-gray-300 p-2 text-center font-medium w-32">
                          <div className="flex flex-col items-center gap-1">
                            <div className="font-semibold">Hora {hour}</div>
                            {subjectInfo ? (
                              <>
                                <div className="text-xs text-blue-700 font-medium">
                                  {subjectInfo.subjectName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {subjectInfo.teacherName}
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-6 px-2 mt-1 bg-green-50 hover:bg-green-100 border-green-300"
                                  onClick={() => handleMarkAllPresent(hour)}
                                  disabled={markAllPresentMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Tots presents
                                </Button>
                              </>
                            ) : (
                              <div className="text-xs text-gray-400">Sense assignatura</div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3">
                        <div>
                          <div className="font-medium">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.email}
                          </div>
                        </div>
                      </td>
                      {student.attendance.map((att) => (
                        <td key={att.hour} className="border border-gray-300 p-2 text-center">
                          <Select
                            value={att.status === 'not_marked' ? '' : att.status}
                            onValueChange={(value) => handleAttendanceChange(student.id, att.hour, value)}
                          >
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue>
                                {att.status !== 'not_marked' && (
                                  <Badge 
                                    className={`${getStatusColor(att.status)} text-xs px-1 py-0`}
                                    variant="secondary"
                                  >
                                    {getStatusCode(att.status)}
                                  </Badge>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_marked">
                                <span className="text-gray-400">--</span>
                              </SelectItem>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${option.color} text-xs`}>
                                      {option.code}
                                    </Badge>
                                    <span className="text-xs">{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {students.reduce((acc, student) => 
                    acc + student.attendance.filter(att => att.status === 'present').length, 0
                  )}
                </div>
                <div className="text-sm text-green-700">Presents</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {students.reduce((acc, student) => 
                    acc + student.attendance.filter(att => att.status === 'absent').length, 0
                  )}
                </div>
                <div className="text-sm text-red-700">Absents</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {students.reduce((acc, student) => 
                    acc + student.attendance.filter(att => att.status === 'justified').length, 0
                  )}
                </div>
                <div className="text-sm text-yellow-700">Justificats</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {students.length * 6}
                </div>
                <div className="text-sm text-gray-700">Total Hores</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {selectedClass && students.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hi ha estudiants en aquesta classe
            </h3>
            <p className="text-gray-500">
              Selecciona una classe diferent o afegeix estudiants a la classe actual.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No class selected */}
      {!selectedClass && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona una classe
            </h3>
            <p className="text-gray-500">
              Tria una classe i una data per començar a marcar l'assistència per hores.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}