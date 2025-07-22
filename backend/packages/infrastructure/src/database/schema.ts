// TypeSpec-compliant database schema
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// Enums according to TypeSpec
export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

export const serviceCategoryEnum = pgEnum('service_category', [
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'other',
])

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])

export const bookingStatusEnum = pgEnum('booking_status', [
  'draft',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])

// User authentication enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'staff', 'admin'])

export const userAccountStatusEnum = pgEnum('user_account_status', [
  'active',
  'unverified',
  'locked',
  'suspended',
  'deleted',
])

export const twoFactorStatusEnum = pgEnum('two_factor_status', [
  'disabled',
  'pending',
  'enabled',
])

// Salons table with TypeSpec structure
export const salons = pgTable('salons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  address: jsonb('address').notNull().$type<{
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }>(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number').notNull(),
  alternativePhone: text('alternative_phone'),
  imageUrls: jsonb('image_urls').$type<string[]>(),
  features: jsonb('features').$type<string[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Opening hours
export const openingHours = pgTable('opening_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  openTime: time('open_time').notNull(),
  closeTime: time('close_time').notNull(),
  isHoliday: boolean('is_holiday').notNull().default(false),
})

// Staff table
export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phoneNumber: text('phone_number').notNull(),
  alternativePhone: text('alternative_phone'),
  specialties: jsonb('specialties').notNull().default([]).$type<string[]>(),
  bio: text('bio'),
  imageUrl: text('image_url'),
  yearsOfExperience: integer('years_of_experience'),
  certifications: jsonb('certifications').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Staff working hours
export const staffWorkingHours = pgTable('staff_working_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  breakStart: time('break_start'),
  breakEnd: time('break_end'),
})

// Service categories
export const serviceCategories = pgTable(
  'service_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    parentId: uuid('parent_id'),
    displayOrder: integer('display_order').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    createdBy: text('created_by'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    parentReference: {
      columns: [table.parentId],
      foreignColumns: [table.id],
    },
  })
)

// Services
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  duration: integer('duration').notNull(), // minutes
  price: integer('price').notNull(), // cents
  category: serviceCategoryEnum('category').notNull(),
  categoryId: uuid('category_id').references(() => serviceCategories.id),
  imageUrl: text('image_url'),
  requiredStaffLevel: integer('required_staff_level'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number').notNull(),
  alternativePhone: text('alternative_phone'),
  preferences: text('preferences'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>(),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  membershipLevel: text('membership_level'),
  birthDate: text('birth_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Reservations (individual service appointments)
export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: reservationStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  totalAmount: integer('total_amount').notNull(), // cents
  depositAmount: integer('deposit_amount'),
  isPaid: boolean('is_paid').notNull().default(false),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Bookings (payment unit for multiple reservations)
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  status: bookingStatusEnum('status').notNull().default('draft'),
  totalAmount: integer('total_amount').notNull(), // cents
  discountAmount: integer('discount_amount').default(0),
  finalAmount: integer('final_amount').notNull(),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Junction table for booking-reservation relationship
export const bookingReservations = pgTable('booking_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  reservationId: uuid('reservation_id')
    .notNull()
    .references(() => reservations.id, { onDelete: 'restrict' }),
})

// Reviews (tied to individual reservations)
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id')
    .notNull()
    .references(() => salons.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  reservationId: uuid('reservation_id')
    .notNull()
    .references(() => reservations.id)
    .unique(),
  staffId: uuid('staff_id').references(() => staff.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  serviceRating: integer('service_rating'),
  staffRating: integer('staff_rating'),
  atmosphereRating: integer('atmosphere_rating'),
  images: jsonb('images').$type<string[]>(),
  isVerified: boolean('is_verified').notNull().default(false),
  helpfulCount: integer('helpful_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('customer'),
  status: userAccountStatusEnum('status').notNull().default('unverified'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationTokenExpiry: timestamp('email_verification_token_expiry'),
  twoFactorStatus: twoFactorStatusEnum('two_factor_status')
    .notNull()
    .default('disabled'),
  twoFactorSecret: text('two_factor_secret'),
  backupCodes: jsonb('backup_codes').$type<string[]>(),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedAt: timestamp('locked_at'),
  passwordResetToken: text('password_reset_token'),
  passwordResetTokenExpiry: timestamp('password_reset_token_expiry'),
  lastPasswordChangeAt: timestamp('last_password_change_at'),
  passwordHistory: jsonb('password_history').$type<string[]>(),
  trustedIpAddresses: jsonb('trusted_ip_addresses').$type<string[]>(),
  customerId: uuid('customer_id').references(() => customers.id),
  staffId: uuid('staff_id').references(() => staff.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
})

// Sessions table for session management
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  rememberMe: boolean('remember_me').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
})

// File upload related tables
export const fileTypeEnum = pgEnum('file_type', ['image', 'document', 'other'])

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(), // S3/Storage key
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(), // in bytes
  fileType: fileTypeEnum('file_type').notNull(),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  salonId: uuid('salon_id').references(() => salons.id, {
    onDelete: 'cascade',
  }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  tags: jsonb('tags').$type<Record<string, string>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  attachmentId: uuid('attachment_id')
    .notNull()
    .references(() => attachments.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxDownloads: integer('max_downloads'),
  downloadCount: integer('download_count').notNull().default(0),
  passwordHash: text('password_hash'),
  allowedEmails: jsonb('allowed_emails').$type<string[]>(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const downloadLogs = pgTable('download_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  attachmentId: uuid('attachment_id')
    .notNull()
    .references(() => attachments.id, { onDelete: 'cascade' }),
  shareLinkId: uuid('share_link_id').references(() => shareLinks.id, {
    onDelete: 'cascade',
  }),
  downloadedBy: uuid('downloaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  downloadedAt: timestamp('downloaded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Authentication related tables

/**
 * Password Reset Tokens Table
 * パスワードリセット用トークン
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_password_reset_tokens_user_id').on(table.userId),
    tokenIdx: index('idx_password_reset_tokens_token').on(table.token),
    expiresAtIdx: index('idx_password_reset_tokens_expires_at').on(
      table.expiresAt
    ),
  })
)

/**
 * Email Verification Tokens Table
 * メール確認用トークン
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_email_verification_tokens_user_id').on(table.userId),
    tokenIdx: index('idx_email_verification_tokens_token').on(table.token),
    expiresAtIdx: index('idx_email_verification_tokens_expires_at').on(
      table.expiresAt
    ),
  })
)

/**
 * User Sessions Table
 * ユーザーセッション管理
 */
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    refreshToken: varchar('refresh_token', { length: 255 }).unique(),
    deviceInfo: jsonb('device_info'),
    ipAddress: inet('ip_address'),
    location: jsonb('location'),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_user_sessions_user_id').on(table.userId),
    sessionTokenIdx: index('idx_user_sessions_session_token').on(
      table.sessionToken
    ),
    refreshTokenIdx: index('idx_user_sessions_refresh_token').on(
      table.refreshToken
    ),
    expiresAtIdx: index('idx_user_sessions_expires_at').on(table.expiresAt),
  })
)

/**
 * Two-Factor Authentication Secrets Table
 * 2要素認証シークレット
 */
export const user2FASecrets = pgTable(
  'user_2fa_secrets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    secret: varchar('secret', { length: 255 }).notNull(),
    backupCodes: text('backup_codes').array(),
    enabled: boolean('enabled').notNull().default(false),
    enabledAt: timestamp('enabled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_user_2fa_secrets_user_id').on(table.userId),
  })
)

/**
 * Failed Login Attempts Table
 * ログイン失敗記録
 */
export const failedLoginAttempts = pgTable(
  'failed_login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    ipAddress: inet('ip_address'),
    attemptCount: integer('attempt_count').notNull().default(1),
    lastAttemptAt: timestamp('last_attempt_at').defaultNow().notNull(),
    lockedUntil: timestamp('locked_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('idx_failed_login_attempts_email').on(table.email),
    ipAddressIdx: index('idx_failed_login_attempts_ip_address').on(
      table.ipAddress
    ),
    lockedUntilIdx: index('idx_failed_login_attempts_locked_until').on(
      table.lockedUntil
    ),
  })
)

/**
 * Authentication Audit Logs Table
 * 認証監査ログ
 */
export const authAuditLogs = pgTable(
  'auth_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: jsonb('event_data'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    success: boolean('success').notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_auth_audit_logs_user_id').on(table.userId),
    eventTypeIdx: index('idx_auth_audit_logs_event_type').on(table.eventType),
    createdAtIdx: index('idx_auth_audit_logs_created_at').on(table.createdAt),
  })
)

/**
 * Trusted IP Addresses Table
 * 信頼されたIPアドレス
 */
export const trustedIpAddresses = pgTable(
  'trusted_ip_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    ipAddress: inet('ip_address').notNull(),
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_trusted_ip_addresses_user_id').on(table.userId),
    userIpUnique: uniqueIndex('idx_trusted_ip_addresses_user_id_ip_address').on(
      table.userId,
      table.ipAddress
    ),
  })
)

// Type exports for authentication tables
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect
export type NewEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
export type User2FASecret = typeof user2FASecrets.$inferSelect
export type NewUser2FASecret = typeof user2FASecrets.$inferInsert
export type FailedLoginAttempt = typeof failedLoginAttempts.$inferSelect
export type NewFailedLoginAttempt = typeof failedLoginAttempts.$inferInsert
export type AuthAuditLog = typeof authAuditLogs.$inferSelect
export type NewAuthAuditLog = typeof authAuditLogs.$inferInsert
export type TrustedIpAddress = typeof trustedIpAddresses.$inferSelect
export type NewTrustedIpAddress = typeof trustedIpAddresses.$inferInsert
