import { z } from 'zod';

// ===== USER SCHEMAS =====

export const UserRoleSchema = z.enum(['student', 'teacher', 'admin', 'system']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional()
  }).optional()
});

export const UserPreferencesSchema = z.object({
  language: z.string().default('es'),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
    inApp: z.boolean().default(true)
  }).default({}),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).default('public'),
    dataSharing: z.boolean().default(false),
    analytics: z.boolean().default(true)
  }).default({})
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(30).optional(),
  passwordHash: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  profile: UserProfileSchema,
  preferences: UserPreferencesSchema,
  emailVerified: z.boolean().default(false),
  emailVerificationToken: z.string().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpires: z.date().optional(),
  lastLogin: z.date().optional(),
  loginAttempts: z.number().default(0),
  lockUntil: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional()
});

export type User = z.infer<typeof UserSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ===== AUTHENTICATION SCHEMAS =====

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().default(false)
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  }),
  confirmPassword: z.string(),
  profile: UserProfileSchema.pick({ firstName: true, lastName: true }),
  role: UserRoleSchema.default('student'),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email()
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  confirmPassword: z.string()
});

export const EmailVerificationSchema = z.object({
  token: z.string()
});

export const UpdateProfileRequestSchema = UserProfileSchema.partial();

export const UpdatePreferencesRequestSchema = UserPreferencesSchema.partial();

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  confirmPassword: z.string()
});

// ===== RESPONSE SCHEMAS =====

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: UserSchema.omit({ passwordHash: true, emailVerificationToken: true, passwordResetToken: true }),
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number()
    })
  }).optional(),
  error: z.string().optional()
});

export const UserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UserSchema.omit({ passwordHash: true, emailVerificationToken: true, passwordResetToken: true }).optional(),
  error: z.string().optional()
});

export const UsersListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    users: z.array(UserSchema.omit({ passwordHash: true, emailVerificationToken: true, passwordResetToken: true })),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number()
    })
  }).optional(),
  error: z.string().optional()
});

// ===== JWT PAYLOAD =====

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ===== API RESPONSES =====

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== FILTERS AND QUERIES =====

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
  filters?: UserFilters;
}

// ===== EVENTS =====

export interface UserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'user.login' | 'user.logout';
  userId: string;
  data: any;
  timestamp: Date;
}

// ===== PERMISSIONS =====

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// ===== AUDIT LOG =====

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
} 