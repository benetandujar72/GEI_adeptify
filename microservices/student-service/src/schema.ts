import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de estudiantes
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar('gender', { length: 10 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  country: varchar('country', { length: 100 }),
  emergencyContact: json('emergency_contact').$type<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>(),
  enrollmentDate: timestamp('enrollment_date').defaultNow(),
  graduationDate: timestamp('graduation_date'),
  status: varchar('status', { length: 20 }).default('active'),
  grade: varchar('grade', { length: 20 }),
  section: varchar('section', { length: 10 }),
  academicYear: varchar('academic_year', { length: 20 }),
  notes: text('notes'),
  avatar: varchar('avatar', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de registros académicos
export const academicRecords = pgTable('academic_records', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  grade: varchar('grade', { length: 10 }),
  score: decimal('score', { precision: 5, scale: 2 }),
  maxScore: decimal('max_score', { precision: 5, scale: 2 }),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  semester: varchar('semester', { length: 20 }),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  evaluationType: varchar('evaluation_type', { length: 50 }),
  evaluationDate: timestamp('evaluation_date'),
  teacherId: integer('teacher_id'),
  comments: text('comments'),
  isPassed: boolean('is_passed'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de asistencia
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // present, absent, late, excused
  subject: varchar('subject', { length: 100 }),
  period: varchar('period', { length: 20 }),
  teacherId: integer('teacher_id'),
  reason: text('reason'),
  isExcused: boolean('is_excused').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de competencias
export const competencies = pgTable('competencies', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  competencyName: varchar('competency_name', { length: 200 }).notNull(),
  competencyCode: varchar('competency_code', { length: 50 }),
  level: varchar('level', { length: 20 }), // basic, intermediate, advanced
  score: decimal('score', { precision: 5, scale: 2 }),
  maxScore: decimal('max_score', { precision: 5, scale: 2 }),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  evaluationDate: timestamp('evaluation_date'),
  evaluatorId: integer('evaluator_id'),
  comments: text('comments'),
  evidence: json('evidence').$type<string[]>(),
  isAchieved: boolean('is_achieved').default(false),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de comportamiento
export const behavior = pgTable('behavior', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  incidentDate: timestamp('incident_date').notNull(),
  incidentType: varchar('incident_type', { length: 100 }).notNull(),
  description: text('description'),
  severity: varchar('severity', { length: 20 }), // low, medium, high, critical
  actionTaken: text('action_taken'),
  reportedBy: integer('reported_by'),
  witnesses: json('witnesses').$type<string[]>(),
  location: varchar('location', { length: 100 }),
  isResolved: boolean('is_resolved').default(false),
  resolutionDate: timestamp('resolution_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de notas y comentarios
export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }), // academic, behavioral, health, other
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  authorId: integer('author_id').notNull(),
  isPrivate: boolean('is_private').default(false),
  tags: json('tags').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de documentos
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  category: varchar('category', { length: 50 }), // academic, medical, legal, other
  uploadedBy: integer('uploaded_by').notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones
export const studentsRelations = relations(students, ({ many }) => ({
  academicRecords: many(academicRecords),
  attendance: many(attendance),
  competencies: many(competencies),
  behavior: many(behavior),
  notes: many(notes),
  documents: many(documents),
}));

export const academicRecordsRelations = relations(academicRecords, ({ one }) => ({
  student: one(students, {
    fields: [academicRecords.studentId],
    references: [students.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const competenciesRelations = relations(competencies, ({ one }) => ({
  student: one(students, {
    fields: [competencies.studentId],
    references: [students.id],
  }),
}));

export const behaviorRelations = relations(behavior, ({ one }) => ({
  student: one(students, {
    fields: [behavior.studentId],
    references: [students.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  student: one(students, {
    fields: [notes.studentId],
    references: [students.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  student: one(students, {
    fields: [documents.studentId],
    references: [students.id],
  }),
}));

// Tipos TypeScript
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type AcademicRecord = typeof academicRecords.$inferSelect;
export type NewAcademicRecord = typeof academicRecords.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type Competency = typeof competencies.$inferSelect;
export type NewCompetency = typeof competencies.$inferInsert;
export type Behavior = typeof behavior.$inferSelect;
export type NewBehavior = typeof behavior.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert; 