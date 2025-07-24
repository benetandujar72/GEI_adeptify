import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  json, 
  unique, 
  pgEnum, 
  varchar,
  uuid,
  date,
  time,
  decimal,
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'institute_admin', 
  'teacher',
  'student',
  'parent',
  'staff'
]);

export const moduleStatusEnum = pgEnum('module_status', [
  'active',
  'inactive',
  'maintenance'
]);

export const academicYearStatusEnum = pgEnum('academic_year_status', [
  'active',
  'inactive',
  'completed'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'system',
  'evaluation',
  'attendance',
  'guard_duty',
  'survey',
  'resource',
  'analytics',
  'general'
]);

// ============================================================================
// TABLAS CORE (BASE UNIFICADA)
// ============================================================================

// Institutos/Organizaciones educativas
export const institutes = pgTable("institutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  settings: json("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usuarios unificados
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: 'cascade' }),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  photoURL: text("photo_url"),
  role: userRoleEnum("role").notNull(),
  googleId: text("google_id").unique(),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  preferences: json("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Años académicos
export const academicYears = pgTable("academic_years", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // "2024-2025"
  displayName: text("display_name").notNull(), // "Curs 2024-2025"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false),
  status: academicYearStatusEnum("status").default('active'),
  settings: json("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Módulos del sistema
export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Configuración de módulos por instituto
export const instituteModules = pgTable("institute_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(false),
  settings: json("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueInstituteModule: unique().on(table.instituteId, table.moduleId)
}));

// Sesiones de usuario
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  data: json("data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notificaciones unificadas
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  isRead: boolean("is_read").default(false),
  data: json("data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Auditoría del sistema
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  instituteId: uuid("institute_id").references(() => institutes.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  details: json("details").default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE EVALUACIÓN (ADEPTIFY)
// ============================================================================

// Competencias
export const competencies = pgTable("competencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  abbreviation: text("abbreviation"),
  subject: text("subject"),
  description: text("description").notNull(),
  type: text("type"), // CT_CC, CT_CD, CT_CE, CT_CPSAA, CE
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Criterios de evaluación
export const criteria = pgTable("criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  competencyId: uuid("competency_id").notNull().references(() => competencies.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asignaturas
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  credits: integer("credits"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actividades/Salidas
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // excursion, activity, event, etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supervisores de actividades
export const activitySupervisors = pgTable("activity_supervisors", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: 'cascade' }),
  supervisorId: uuid("supervisor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // main, assistant, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Inscripciones a actividades
export const activityEnrollments = pgTable("activity_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: 'cascade' }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('enrolled'), // enrolled, confirmed, cancelled
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relación estudiantes-clases
export const studentClasses = pgTable("student_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  status: text("status").notNull().default('active'), // active, inactive, graduated
  createdAt: timestamp("created_at").defaultNow(),
});

// Estudiantes
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  surname: text("surname").notNull(),
  email: text("email"),
  groupName: text("group_name").notNull(),
  birthDate: date("birth_date"),
  photo: text("photo"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profesores
export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  surname: text("surname").notNull(),
  email: text("email").notNull().unique(),
  department: text("department"),
  specialty: text("specialty"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evaluaciones
export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  groupName: text("group_name").notNull(),
  competencyType: text("competency_type").notNull(),
  competencyCode: text("competency_code").notNull(),
  competencyDescription: text("competency_description").notNull(),
  studentCount: integer("student_count").notNull(),
  googleSheetId: text("google_sheet_id"),
  evaluationData: json("evaluation_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calificaciones
export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id").notNull().references(() => evaluations.id, { onDelete: 'cascade' }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: 'cascade' }),
  criteriaId: uuid("criteria_id").notNull().references(() => criteria.id, { onDelete: 'cascade' }),
  grade: text("grade").notNull(), // NA, AS, AN, AE
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE ASISTENCIA (ASSISTATUT)
// ============================================================================

// Clases
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  teacherId: uuid("teacher_id").references(() => teachers.id),
  subject: text("subject").notNull(),
  schedule: json("schedule"), // Horario semanal
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asistencia
export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  status: text("status").notNull(), // present, absent, late, excused
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE GUARDIAS (GESTORGUARDIES)
// ============================================================================

// Horarios
export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 (Lunes-Domingo)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  room: text("room"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ausencias/Salidas
export const absences = pgTable("absences", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  type: text("type").notNull(), // extraescolar, baixa, curs, reunio, personal
  status: text("status").default('planned'), // planned, in_progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guardias
export const guardDuties = pgTable("guard_duties", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  absenceId: uuid("absence_id").references(() => absences.id, { onDelete: 'cascade' }),
  scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  substituteTeacherId: uuid("substitute_teacher_id").references(() => teachers.id),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").default('pending'), // pending, assigned, completed, cancelled
  priority: integer("priority").default(3), // 1-5 (1=urgent, 5=low)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE ENCUESTAS (APPVALORACIONSIB)
// ============================================================================

// Encuestas
export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // student, teacher, family
  course: text("course"), // Para encuestas de estudiantes
  trimester: text("trimester").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Preguntas de encuesta
export const surveyQuestions = pgTable("survey_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyId: uuid("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  questionId: text("question_id").notNull(),
  text: text("text").notNull(),
  type: text("type").notNull(), // escala, si_no, text, multiple
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  order: integer("order").notNull().default(0),
  options: json("options"), // Para preguntas de opción múltiple
  createdAt: timestamp("created_at").defaultNow(),
});

// Respuestas de encuesta
export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyId: uuid("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  questionId: uuid("question_id").notNull().references(() => surveyQuestions.id, { onDelete: 'cascade' }),
  respondentId: uuid("respondent_id").references(() => users.id),
  response: json("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE RECURSOS (SCHOOLMASTERAI)
// ============================================================================

// Recursos/Espacios
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // classroom, lab, gym, library, equipment
  description: text("description"),
  capacity: integer("capacity"),
  location: text("location"),
  equipment: json("equipment"), // Equipamiento disponible
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reservas
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default('pending'), // pending, confirmed, cancelled
  attendees: integer("attendees"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MÓDULO DE ANALYTICS (GRAFICA ASSOLIMENTS)
// ============================================================================

// Logros académicos
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: 'cascade' }),
  competencyId: uuid("competency_id").notNull().references(() => competencies.id, { onDelete: 'cascade' }),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  competenceCode: text("competence_code").notNull(),
  competenceName: text("competence_name"),
  grade: text("grade").notNull(), // NA, AS, AN, AE
  evaluationPeriod: text("evaluation_period").notNull(),
  evaluationDate: timestamp("evaluation_date"),
  sourceFile: text("source_file"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// RELACIONES
// ============================================================================

// Relaciones de institutos
export const institutesRelations = relations(institutes, ({ many }) => ({
  users: many(users),
  academicYears: many(academicYears),
  instituteModules: many(instituteModules),
  auditLogs: many(auditLogs),
}));

// Relaciones de usuarios
export const usersRelations = relations(users, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [users.instituteId],
    references: [institutes.id],
  }),
  sessions: many(sessions),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  students: many(students),
  teachers: many(teachers),
  reservations: many(reservations),
  surveyResponses: many(surveyResponses),
}));

// Relaciones de años académicos
export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [academicYears.instituteId],
    references: [institutes.id],
  }),
  competencies: many(competencies),
  students: many(students),
  teachers: many(teachers),
  classes: many(classes),
  schedules: many(schedules),
  absences: many(absences),
  guardDuties: many(guardDuties),
  surveys: many(surveys),
  achievements: many(achievements),
}));

// ============================================================================
// ESQUEMAS DE INSERCIÓN
// ============================================================================

export const insertInstituteSchema = createInsertSchema(institutes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    code: z.string()
      .min(2, "El código debe tener al menos 2 caracteres")
      .max(20, "El código no puede tener más de 20 caracteres")
      .regex(/^[a-zA-Z0-9_-]+$/, "El código solo puede contener letras, números, guiones y guiones bajos"),
  });

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    email: z.string().email("Email inválido"),
    role: z.enum(['super_admin', 'institute_admin', 'teacher', 'student', 'parent', 'staff']),
  });

export const insertAcademicYearSchema = createInsertSchema(academicYears)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().regex(/^\d{4}-\d{4}$/, "El formato debe ser YYYY-YYYY"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD"),
  });

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type Institute = typeof institutes.$inferSelect;
export type InsertInstitute = z.infer<typeof insertInstituteSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type AcademicYear = typeof academicYears.$inferSelect;
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;

export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Absence = typeof absences.$inferSelect;
export type GuardDuty = typeof guardDuties.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect; 