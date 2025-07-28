import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de institutos/escuelas
export const institutes = pgTable('institutes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  type: varchar('type', { length: 50 }).notNull().default('school'), // school, university, training_center
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('Spain'),
  postalCode: varchar('postal_code', { length: 20 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  logo: varchar('logo', { length: 255 }),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('institutes_name_idx').on(table.name),
  codeIdx: index('institutes_code_idx').on(table.code),
  typeIdx: index('institutes_type_idx').on(table.type),
}));

// Tabla de usuarios
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('student'), // teacher, student, parent, staff, admin
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  emailVerificationExpiry: timestamp('email_verification_expiry'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  lastLoginAt: timestamp('last_login_at'),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  preferences: jsonb('preferences').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  activeIdx: index('users_active_idx').on(table.isActive),
}));

// Tabla de perfiles de usuario
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  instituteId: uuid('institute_id').references(() => institutes.id),
  avatar: varchar('avatar', { length: 255 }),
  bio: text('bio'),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('Spain'),
  postalCode: varchar('postal_code', { length: 20 }),
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  nationality: varchar('nationality', { length: 100 }),
  language: varchar('language', { length: 10 }).default('es'),
  timezone: varchar('timezone', { length: 50 }).default('Europe/Madrid'),
  preferences: jsonb('preferences').default({}),
  socialLinks: jsonb('social_links').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_profiles_user_id_idx').on(table.userId),
  instituteIdx: index('user_profiles_institute_idx').on(table.instituteId),
}));

// Tabla de sesiones de usuario
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshToken: varchar('refresh_token', { length: 500 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 50 }),
  deviceInfo: jsonb('device_info').default({}),
  location: jsonb('location').default({}),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  loggedOutAt: timestamp('logged_out_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  refreshTokenIdx: index('user_sessions_refresh_token_idx').on(table.refreshToken),
  activeIdx: index('user_sessions_active_idx').on(table.isActive),
}));

// Tabla de roles y permisos
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  permissions: jsonb('permissions').default([]),
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('roles_name_idx').on(table.name),
  systemIdx: index('roles_system_idx').on(table.isSystem),
}));

// Tabla de asignación de roles a usuarios
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  instituteId: uuid('institute_id').references(() => institutes.id),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_roles_user_id_idx').on(table.userId),
  roleIdIdx: index('user_roles_role_id_idx').on(table.roleId),
  instituteIdx: index('user_roles_institute_idx').on(table.instituteId),
  activeIdx: index('user_roles_active_idx').on(table.isActive),
}));

// Tabla de grupos
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  instituteId: uuid('institute_id').references(() => institutes.id),
  type: varchar('type', { length: 50 }).notNull().default('class'), // class, team, committee, etc.
  maxMembers: integer('max_members'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('groups_name_idx').on(table.name),
  instituteIdx: index('groups_institute_idx').on(table.instituteId),
  typeIdx: index('groups_type_idx').on(table.type),
}));

// Tabla de membresía en grupos
export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('member'), // admin, moderator, member
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  groupIdIdx: index('group_members_group_id_idx').on(table.groupId),
  userIdIdx: index('group_members_user_id_idx').on(table.userId),
  activeIdx: index('group_members_active_idx').on(table.isActive),
}));

// Tabla de notificaciones
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // email, push, sms, in_app
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data').default({}),
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, delivered, failed
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  typeIdx: index('notifications_type_idx').on(table.type),
  statusIdx: index('notifications_status_idx').on(table.status),
  priorityIdx: index('notifications_priority_idx').on(table.priority),
}));

// Tabla de logs de auditoría
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: uuid('session_id').references(() => userSessions.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: jsonb('details').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resource),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Tabla de tokens de acceso
export const accessTokens = pgTable('access_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  token: varchar('token', { length: 500 }).unique().notNull(),
  permissions: jsonb('permissions').default([]),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('access_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('access_tokens_token_idx').on(table.token),
  activeIdx: index('access_tokens_active_idx').on(table.isActive),
}));

// Relaciones
export const institutesRelations = relations(institutes, ({ many }) => ({
  users: many(userProfiles),
  groups: many(groups),
  userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(userSessions),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  accessTokens: many(accessTokens),
  userRoles: many(userRoles),
  groupMembers: many(groupMembers),
  createdGroups: many(groups),
  grantedRoles: many(userRoles, { relationName: 'grantedBy' }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
  institute: one(institutes, {
    fields: [userProfiles.instituteId],
    references: [institutes.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  institute: one(institutes, {
    fields: [userRoles.instituteId],
    references: [institutes.id],
  }),
  grantedBy: one(users, {
    fields: [userRoles.grantedBy],
    references: [users.id],
    relationName: 'grantedBy',
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [groups.instituteId],
    references: [institutes.id],
  }),
  createdBy: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  session: one(userSessions, {
    fields: [auditLogs.sessionId],
    references: [userSessions.id],
  }),
}));

export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  user: one(users, {
    fields: [accessTokens.userId],
    references: [users.id],
  }),
})); 