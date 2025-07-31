// TypeSpec-compliant database schema
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
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
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  birthDate: date('birth_date'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: reservationStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  totalAmount: integer('total_amount').notNull(), // cents
  depositAmount: integer('deposit_amount'),
  isPaid: boolean('is_paid').notNull().default(false),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  emailVerificationTokenExpiry: timestamp('email_verification_token_expiry', {
    withTimezone: true,
  }),
  twoFactorStatus: twoFactorStatusEnum('two_factor_status')
    .notNull()
    .default('disabled'),
  twoFactorSecret: text('two_factor_secret'),
  backupCodes: jsonb('backup_codes').$type<string[]>(),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  passwordResetToken: text('password_reset_token'),
  passwordResetTokenExpiry: timestamp('password_reset_token_expiry', {
    withTimezone: true,
  }),
  lastPasswordChangeAt: timestamp('last_password_change_at', {
    withTimezone: true,
  }),
  passwordHistory: jsonb('password_history').$type<string[]>(),
  trustedIpAddresses: jsonb('trusted_ip_addresses').$type<string[]>(),
  customerId: uuid('customer_id').references(() => customers.id),
  staffId: uuid('staff_id').references(() => staff.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
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
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  rememberMe: boolean('remember_me').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
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
