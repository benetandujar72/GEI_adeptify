import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de recursos
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // classroom, lab, equipment, material, etc.
  category: varchar('category', { length: 100 }).notNull(),
  location: varchar('location', { length: 200 }),
  capacity: integer('capacity'),
  status: varchar('status', { length: 20 }).default('available'), // available, in_use, maintenance, unavailable
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    features?: string[];
    specifications?: Record<string, any>;
    images?: string[];
    documents?: string[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de reservas
export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  resourceId: integer('resource_id').references(() => resources.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(), // ID del usuario que hace la reserva
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, confirmed, cancelled, completed
  purpose: varchar('purpose', { length: 100 }),
  attendees: integer('attendees'),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: json('recurrence_pattern').$type<{
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
    daysOfWeek?: number[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de instalaciones
export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // building, floor, wing, etc.
  address: text('address'),
  coordinates: json('coordinates').$type<{
    latitude: number;
    longitude: number;
  }>(),
  capacity: integer('capacity'),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    amenities?: string[];
    accessInfo?: string;
    images?: string[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de equipos
export const equipment = pgTable('equipment', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // computer, projector, furniture, etc.
  model: varchar('model', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  manufacturer: varchar('manufacturer', { length: 100 }),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  status: varchar('status', { length: 20 }).default('available'), // available, in_use, maintenance, retired
  location: varchar('location', { length: 200 }),
  assignedTo: integer('assigned_to'), // ID del usuario asignado
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    specifications?: Record<string, any>;
    maintenanceHistory?: Array<{
      date: string;
      description: string;
      cost: number;
    }>;
    images?: string[];
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de materiales
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // books, supplies, tools, etc.
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').default(0),
  unit: varchar('unit', { length: 20 }), // pieces, kg, liters, etc.
  minQuantity: integer('min_quantity').default(0), // cantidad mínima para alertas
  location: varchar('location', { length: 200 }),
  supplier: varchar('supplier', { length: 200 }),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    specifications?: Record<string, any>;
    images?: string[];
    barcode?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de mantenimiento
export const maintenance = pgTable('maintenance', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  resourceId: integer('resource_id').references(() => resources.id, { onDelete: 'cascade' }).notNull(),
  equipmentId: integer('equipment_id').references(() => equipment.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // preventive, corrective, emergency
  description: text('description').notNull(),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  status: varchar('status', { length: 20 }).default('scheduled'), // scheduled, in_progress, completed, cancelled
  assignedTo: integer('assigned_to'), // ID del técnico asignado
  cost: decimal('cost', { precision: 10, scale: 2 }),
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, critical
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de reportes de problemas
export const issueReports = pgTable('issue_reports', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  resourceId: integer('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
  equipmentId: integer('equipment_id').references(() => equipment.id, { onDelete: 'cascade' }),
  reportedBy: integer('reported_by').notNull(), // ID del usuario que reporta
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }).default('medium'), // low, medium, high, critical
  status: varchar('status', { length: 20 }).default('open'), // open, in_progress, resolved, closed
  assignedTo: integer('assigned_to'), // ID del técnico asignado
  reportedDate: timestamp('reported_date').defaultNow(),
  resolvedDate: timestamp('resolved_date'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de auditoría de recursos
export const resourceAudit = pgTable('resource_audit', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').references(() => resources.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // create, update, delete, reserve, cancel, etc.
  details: json('details').$type<{
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changes?: Record<string, any>;
  }>(),
  timestamp: timestamp('timestamp').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// Relaciones
export const resourcesRelations = relations(resources, ({ many }) => ({
  reservations: many(reservations),
  maintenance: many(maintenance),
  issueReports: many(issueReports),
  audit: many(resourceAudit),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  resource: one(resources, {
    fields: [reservations.resourceId],
    references: [resources.id],
  }),
}));

export const equipmentRelations = relations(equipment, ({ many }) => ({
  maintenance: many(maintenance),
  issueReports: many(issueReports),
}));

// Tipos TypeScript
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Maintenance = typeof maintenance.$inferSelect;
export type NewMaintenance = typeof maintenance.$inferInsert;
export type IssueReport = typeof issueReports.$inferSelect;
export type NewIssueReport = typeof issueReports.$inferInsert;
export type ResourceAudit = typeof resourceAudit.$inferSelect;
export type NewResourceAudit = typeof resourceAudit.$inferInsert;