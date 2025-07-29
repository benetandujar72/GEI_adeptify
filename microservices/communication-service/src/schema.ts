import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de notificaciones
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  userId: integer('user_id').notNull(), // ID del usuario destinatario
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // info, warning, error, success, alert
  category: varchar('category', { length: 100 }).notNull(), // system, academic, resource, general
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  status: varchar('status', { length: 20 }).default('unread'), // unread, read, archived
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  expiresAt: timestamp('expires_at'),
  metadata: json('metadata').$type<{
    actionUrl?: string;
    actionText?: string;
    icon?: string;
    sound?: boolean;
    vibration?: boolean;
    badge?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de mensajes en tiempo real
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  senderId: integer('sender_id').notNull(),
  receiverId: integer('receiver_id').notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).default('text'), // text, image, file, audio, video
  status: varchar('status', { length: 20 }).default('sent'), // sent, delivered, read
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  metadata: json('metadata').$type<{
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnail?: string;
    duration?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de conversaciones/grupos
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 200 }),
  type: varchar('type', { length: 20 }).default('direct'), // direct, group, channel
  description: text('description'),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    avatar?: string;
    settings?: {
      notifications?: boolean;
      muteUntil?: string;
      theme?: string;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de participantes en conversaciones
export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 20 }).default('member'), // admin, moderator, member
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    lastReadMessageId?: number;
    lastReadAt?: string;
    notificationSettings?: {
      mute?: boolean;
      muteUntil?: string;
      sound?: boolean;
      vibration?: boolean;
    };
  }>(),
});

// Tabla de mensajes de conversación
export const conversationMessages = pgTable('conversation_messages', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer('sender_id').notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).default('text'), // text, image, file, audio, video, system
  status: varchar('status', { length: 20 }).default('sent'), // sent, delivered, read
  replyToId: integer('reply_to_id').references(() => conversationMessages.id),
  metadata: json('metadata').$type<{
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnail?: string;
    duration?: number;
    mentions?: number[];
    reactions?: Record<string, number[]>;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de encuestas
export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // academic, feedback, evaluation, general
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, paused, closed
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isAnonymous: boolean('is_anonymous').default(false),
  allowMultipleResponses: boolean('allow_multiple_responses').default(false),
  targetAudience: json('target_audience').$type<{
    roles?: string[];
    departments?: string[];
    userIds?: number[];
    allUsers?: boolean;
  }>(),
  settings: json('settings').$type<{
    showProgress?: boolean;
    randomizeQuestions?: boolean;
    timeLimit?: number;
    requireLogin?: boolean;
  }>(),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de preguntas de encuesta
export const surveyQuestions = pgTable('survey_questions', {
  id: serial('id').primaryKey(),
  surveyId: integer('survey_id').references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // text, textarea, radio, checkbox, select, rating, date
  isRequired: boolean('is_required').default(false),
  order: integer('order').notNull(),
  options: json('options').$type<{
    choices?: string[];
    minValue?: number;
    maxValue?: number;
    step?: number;
    placeholder?: string;
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de respuestas de encuesta
export const surveyResponses = pgTable('survey_responses', {
  id: serial('id').primaryKey(),
  surveyId: integer('survey_id').references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id'), // null si es anónimo
  sessionId: varchar('session_id', { length: 100 }), // para respuestas anónimas
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  isComplete: boolean('is_complete').default(false),
  metadata: json('metadata').$type<{
    userAgent?: string;
    ipAddress?: string;
    timeSpent?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de respuestas individuales
export const surveyAnswers = pgTable('survey_answers', {
  id: serial('id').primaryKey(),
  responseId: integer('response_id').references(() => surveyResponses.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer('question_id').references(() => surveyQuestions.id, { onDelete: 'cascade' }).notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de anuncios
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // general, academic, event, emergency, maintenance
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  status: varchar('status', { length: 20 }).default('draft'), // draft, published, archived
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isPinned: boolean('is_pinned').default(false),
  targetAudience: json('target_audience').$type<{
    roles?: string[];
    departments?: string[];
    userIds?: number[];
    allUsers?: boolean;
  }>(),
  createdBy: integer('created_by').notNull(),
  metadata: json('metadata').$type<{
    imageUrl?: string;
    attachments?: string[];
    tags?: string[];
    allowComments?: boolean;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de comentarios de anuncios
export const announcementComments = pgTable('announcement_comments', {
  id: serial('id').primaryKey(),
  announcementId: integer('announcement_id').references(() => announcements.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(),
  content: text('content').notNull(),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de plantillas de notificación
export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // email, sms, push, in_app
  subject: varchar('subject', { length: 200 }),
  content: text('content').notNull(),
  variables: json('variables').$type<string[]>(),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata').$type<{
    category?: string;
    description?: string;
    examples?: Record<string, any>;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de configuración de notificaciones por usuario
export const userNotificationSettings = pgTable('user_notification_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // email, sms, push, in_app
  category: varchar('category', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').default(true),
  settings: json('settings').$type<{
    frequency?: 'immediate' | 'daily' | 'weekly';
    quietHours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
    };
    channels?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      inApp?: boolean;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de logs de comunicación
export const communicationLogs = pgTable('communication_logs', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // notification, message, email, sms, push
  action: varchar('action', { length: 50 }).notNull(), // sent, delivered, failed, read
  userId: integer('user_id'),
  targetId: integer('target_id'), // ID del elemento relacionado
  content: text('content'),
  status: varchar('status', { length: 20 }).default('success'), // success, failed, pending
  error: text('error'),
  metadata: json('metadata').$type<{
    channel?: string;
    provider?: string;
    cost?: number;
    retryCount?: number;
    deliveryTime?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relaciones
export const notificationsRelations = relations(notifications, ({ one }) => ({
  // Relaciones futuras con User Service
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  // Relaciones futuras con User Service
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(conversationMessages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
  replyTo: one(conversationMessages, {
    fields: [conversationMessages.replyToId],
    references: [conversationMessages.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ many }) => ({
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  answers: many(surveyAnswers),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  answers: many(surveyAnswers),
}));

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyAnswers.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ many }) => ({
  comments: many(announcementComments),
}));

export const announcementCommentsRelations = relations(announcementComments, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementComments.announcementId],
    references: [announcements.id],
  }),
}));

// Tipos TypeScript
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type NewSurveyQuestion = typeof surveyQuestions.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
export type NewSurveyAnswer = typeof surveyAnswers.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AnnouncementComment = typeof announcementComments.$inferSelect;
export type NewAnnouncementComment = typeof announcementComments.$inferInsert;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type UserNotificationSetting = typeof userNotificationSettings.$inferSelect;
export type NewUserNotificationSetting = typeof userNotificationSettings.$inferInsert;
export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type NewCommunicationLog = typeof communicationLogs.$inferInsert;