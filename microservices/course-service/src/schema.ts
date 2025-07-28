import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de cursos
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  description: text('description'),
  credits: integer('credits'),
  hours: integer('hours'),
  level: varchar('level', { length: 20 }), // basic, intermediate, advanced
  category: varchar('category', { length: 100 }),
  department: varchar('department', { length: 100 }),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  semester: varchar('semester', { length: 20 }),
  grade: varchar('grade', { length: 20 }),
  section: varchar('section', { length: 10 }),
  maxStudents: integer('max_students'),
  currentStudents: integer('current_students').default(0),
  teacherId: integer('teacher_id'),
  assistantTeacherId: integer('assistant_teacher_id'),
  syllabus: json('syllabus').$type<{
    objectives: string[];
    content: string[];
    methodology: string[];
    evaluation: string[];
    bibliography: string[];
  }>(),
  schedule: json('schedule').$type<{
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }[]>(),
  prerequisites: json('prerequisites').$type<string[]>(),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de materias/subjects
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  description: text('description'),
  credits: integer('credits'),
  hours: integer('hours'),
  level: varchar('level', { length: 20 }),
  category: varchar('category', { length: 100 }),
  department: varchar('department', { length: 100 }),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  grade: varchar('grade', { length: 20 }),
  teacherId: integer('teacher_id'),
  syllabus: json('syllabus').$type<{
    objectives: string[];
    content: string[];
    methodology: string[];
    evaluation: string[];
    bibliography: string[];
  }>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de currículum
export const curriculum = pgTable('curriculum', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  description: text('description'),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  grade: varchar('grade', { length: 20 }),
  totalCredits: integer('total_credits'),
  totalHours: integer('total_hours'),
  subjects: json('subjects').$type<{
    subjectId: number;
    credits: number;
    hours: number;
    semester: string;
    isRequired: boolean;
  }[]>(),
  requirements: json('requirements').$type<{
    minCredits: number;
    minSubjects: number;
    prerequisites: string[];
  }>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de horarios
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  dayOfWeek: varchar('day_of_week', { length: 20 }).notNull(), // monday, tuesday, etc.
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM format
  endTime: varchar('end_time', { length: 10 }).notNull(), // HH:MM format
  room: varchar('room', { length: 100 }),
  building: varchar('building', { length: 100 }),
  teacherId: integer('teacher_id'),
  type: varchar('type', { length: 20 }), // lecture, lab, practice, exam
  isRecurring: boolean('is_recurring').default(true),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  semester: varchar('semester', { length: 20 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de calificaciones
export const grades = pgTable('grades', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  evaluationType: varchar('evaluation_type', { length: 50 }).notNull(), // exam, project, homework, participation
  score: decimal('score', { precision: 5, scale: 2 }),
  maxScore: decimal('max_score', { precision: 5, scale: 2 }),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  letterGrade: varchar('letter_grade', { length: 10 }), // A, B, C, D, F
  weight: decimal('weight', { precision: 3, scale: 2 }).default(1.00), // peso de la evaluación
  evaluationDate: timestamp('evaluation_date'),
  dueDate: timestamp('due_date'),
  teacherId: integer('teacher_id'),
  comments: text('comments'),
  isSubmitted: boolean('is_submitted').default(false),
  isGraded: boolean('is_graded').default(false),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  semester: varchar('semester', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de inscripciones
export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  enrollmentDate: timestamp('enrollment_date').defaultNow(),
  status: varchar('status', { length: 20 }).default('enrolled'), // enrolled, dropped, completed, failed
  grade: varchar('grade', { length: 10 }),
  finalScore: decimal('final_score', { precision: 5, scale: 2 }),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  semester: varchar('semester', { length: 20 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de recursos del curso
export const courseResources = pgTable('course_resources', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }), // document, video, link, file
  url: varchar('url', { length: 500 }),
  fileName: varchar('file_name', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  category: varchar('category', { length: 50 }), // syllabus, material, assignment, exam
  uploadedBy: integer('uploaded_by').notNull(),
  isPublic: boolean('is_public').default(true),
  downloadCount: integer('download_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de tareas/assignments
export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }), // homework, project, exam, quiz
  maxScore: decimal('max_score', { precision: 5, scale: 2 }),
  weight: decimal('weight', { precision: 3, scale: 2 }).default(1.00),
  dueDate: timestamp('due_date'),
  submissionDate: timestamp('submission_date'),
  instructions: text('instructions'),
  rubric: json('rubric').$type<{
    criteria: string;
    points: number;
    description: string;
  }[]>(),
  attachments: json('attachments').$type<string[]>(),
  isPublished: boolean('is_published').default(false),
  isGraded: boolean('is_graded').default(false),
  academicYear: varchar('academic_year', { length: 20 }).notNull(),
  semester: varchar('semester', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de entregas de tareas
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  assignmentId: integer('assignment_id').references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull(),
  content: text('content'),
  attachments: json('attachments').$type<string[]>(),
  submittedAt: timestamp('submitted_at').defaultNow(),
  score: decimal('score', { precision: 5, scale: 2 }),
  maxScore: decimal('max_score', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  gradedBy: integer('graded_by'),
  gradedAt: timestamp('graded_at'),
  status: varchar('status', { length: 20 }).default('submitted'), // submitted, late, graded, returned
  isLate: boolean('is_late').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones
export const coursesRelations = relations(courses, ({ many }) => ({
  schedules: many(schedules),
  grades: many(grades),
  enrollments: many(enrollments),
  resources: many(courseResources),
  assignments: many(assignments),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  schedules: many(schedules),
  grades: many(grades),
  enrollments: many(enrollments),
  resources: many(courseResources),
  assignments: many(assignments),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  course: one(courses, {
    fields: [schedules.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [schedules.subjectId],
    references: [subjects.id],
  }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  course: one(courses, {
    fields: [grades.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [grades.subjectId],
    references: [subjects.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [enrollments.subjectId],
    references: [subjects.id],
  }),
}));

export const courseResourcesRelations = relations(courseResources, ({ one }) => ({
  course: one(courses, {
    fields: [courseResources.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [courseResources.subjectId],
    references: [subjects.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
}));

// Tipos TypeScript
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Curriculum = typeof curriculum.$inferSelect;
export type NewCurriculum = typeof curriculum.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type CourseResource = typeof courseResources.$inferSelect;
export type NewCourseResource = typeof courseResources.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert; 