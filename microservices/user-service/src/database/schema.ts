import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== ENUMS =====

export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin', 'system']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended', 'pending']);
export const themeEnum = pgEnum('theme', ['light', 'dark', 'auto']);
export const profileVisibilityEnum = pgEnum('profile_visibility', ['public', 'private', 'friends']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);

// ===== USERS TABLE =====

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('student'),
  status: userStatusEnum('status').notNull().default('pending'),
  
  // Profile Information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'),
  bio: text('bio'),
  dateOfBirth: timestamp('date_of_birth'),
  gender: genderEnum('gender'),
  location: varchar('location', { length: 100 }),
  website: varchar('website', { length: 255 }),
  
  // Address Information
  addressStreet: varchar('address_street', { length: 255 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 100 }),
  addressCountry: varchar('address_country', { length: 100 }),
  addressPostalCode: varchar('address_postal_code', { length: 20 }),
  
  // Preferences
  language: varchar('language', { length: 10 }).notNull().default('es'),
  theme: themeEnum('theme').notNull().default('auto'),
  
  // Notification Preferences
  notificationsEmail: boolean('notifications_email').notNull().default(true),
  notificationsPush: boolean('notifications_push').notNull().default(true),
  notificationsSms: boolean('notifications_sms').notNull().default(false),
  notificationsInApp: boolean('notifications_in_app').notNull().default(true),
  
  // Privacy Preferences
  profileVisibility: profileVisibilityEnum('profile_visibility').notNull().default('public'),
  dataSharing: boolean('data_sharing').notNull().default(false),
  analytics: boolean('analytics').notNull().default(true),
  
  // Authentication & Security
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  lastLogin: timestamp('last_login'),
  loginAttempts: integer('login_attempts').notNull().default(0),
  lockUntil: timestamp('lock_until'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
});

// ===== SESSIONS TABLE =====

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ===== AUDIT LOGS TABLE =====

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow()
});

// ===== PERMISSIONS TABLE =====

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  conditions: jsonb('conditions'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ===== ROLE PERMISSIONS TABLE =====

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRoleEnum('role').notNull(),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// ===== USER SESSIONS TABLE =====

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  data: jsonb('data'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ===== EMAIL TEMPLATES TABLE =====

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  subject: varchar('subject', { length: 255 }).notNull(),
  htmlBody: text('html_body').notNull(),
  textBody: text('text_body').notNull(),
  variables: jsonb('variables'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ===== EMAIL LOGS TABLE =====

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  templateId: uuid('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  htmlBody: text('html_body'),
  textBody: text('text_body'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// ===== RELATIONS =====

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  userSessions: many(userSessions),
  emailLogs: many(emailLogs)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  })
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id]
  })
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id]
  }),
  template: one(emailTemplates, {
    fields: [emailLogs.templateId],
    references: [emailTemplates.id]
  })
}));

// ===== INDEXES =====

// Users table indexes
export const usersEmailIndex = users.email;
export const usersUsernameIndex = users.username;
export const usersRoleIndex = users.role;
export const usersStatusIndex = users.status;
export const usersCreatedAtIndex = users.createdAt;

// Sessions table indexes
export const sessionsUserIdIndex = sessions.userId;
export const sessionsRefreshTokenIndex = sessions.refreshToken;
export const sessionsExpiresAtIndex = sessions.expiresAt;

// Audit logs table indexes
export const auditLogsUserIdIndex = auditLogs.userId;
export const auditLogsActionIndex = auditLogs.action;
export const auditLogsTimestampIndex = auditLogs.timestamp;

// Role permissions table indexes
export const rolePermissionsRoleIndex = rolePermissions.role;
export const rolePermissionsPermissionIdIndex = rolePermissions.permissionId;

// User sessions table indexes
export const userSessionsUserIdIndex = userSessions.userId;
export const userSessionsSessionIdIndex = userSessions.sessionId;
export const userSessionsExpiresAtIndex = userSessions.expiresAt;

// Email logs table indexes
export const emailLogsUserIdIndex = emailLogs.userId;
export const emailLogsStatusIndex = emailLogs.status;
export const emailLogsCreatedAtIndex = emailLogs.createdAt; 