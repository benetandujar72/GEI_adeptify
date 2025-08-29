// Catálogo de eventos y tipos compartidos para el bus (Fase 1)
// Mantener nombres estables para interoperabilidad entre servicios

export type DomainEventName =
  | 'attendance.marked' // Registro de asistencia individual
  | 'attendance.bulk_marked' // Registro masivo de asistencia
  | 'teacher.absence.created' // Alta de ausencia de profesor
  | 'teacher.absence.cancelled' // Cancelación de ausencia
  | 'guard.assignment.created' // Creación de una guardia/sustitución
  | 'guard.assignment.failed' // No se pudo cubrir una guardia
  | 'centre.closed' // Cierre del centro (emergencia/planificado)
  | 'centre.reopened' // Reapertura del centro
  | 'communication.broadcast.requested' // Solicitud de comunicación masiva
  | 'communication.broadcast.sent' // Comunicación masiva enviada
  | 'payment.succeeded' // Pago confirmado
  | 'payment.failed'; // Pago fallido

export interface BaseEvent<TName extends DomainEventName = DomainEventName, TPayload = unknown> {
  id: string; // ULID/UUID
  name: TName;
  occurredAt: string; // ISO string
  tenantId?: string; // Multi-tenant support
  actor?: {
    userId?: string;
    role?: string;
    ip?: string;
  };
  payload: TPayload;
  meta?: Record<string, unknown>;
}

// Payloads recomendados
export interface AttendanceMarkedPayload {
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface TeacherAbsencePayload {
  absenceId: string;
  teacherId: string;
  instituteId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  reason?: string;
}

export interface GuardAssignmentPayload {
  assignmentId: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD
  fromTeacherId: string;
  substituteTeacherId?: string;
  status: 'pending' | 'assigned' | 'failed';
}

export interface BroadcastRequestedPayload {
  requestId: string;
  title: string;
  message: string;
  audience: {
    roles?: string[];
    departments?: string[];
    userIds?: string[];
    allUsers?: boolean;
  };
  channels: Array<'email' | 'sms' | 'push' | 'app'>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface PaymentResultPayload {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed';
  provider: 'stripe' | 'redsys' | 'other';
  reason?: string;
}

export const EventTopics = {
  attendance: 'events.attendance',
  absences: 'events.absences',
  guards: 'events.guards',
  communications: 'events.communications',
  centre: 'events.centre',
  payments: 'events.payments',
} as const;

export type EventTopic = typeof EventTopics[keyof typeof EventTopics];


