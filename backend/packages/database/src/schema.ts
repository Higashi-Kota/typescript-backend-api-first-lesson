import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const accountStatus = pgEnum('account_status', [
  'active',
  'inactive',
  'suspended',
  'deleted',
])
export const allergyType = pgEnum('allergy_type', [
  'chemical',
  'fragrance',
  'metal',
  'latex',
  'plant',
  'other',
])
export const bookingStatus = pgEnum('booking_status', [
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])
export const bookingDepositStatus = pgEnum('booking_deposit_status', [
  'pending',
  'paid',
  'refunded',
  'forfeited',
])
export const dayOfWeek = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export const inventoryTransactionType = pgEnum('inventory_transaction_type', [
  'in',
  'out',
  'adjustment',
  'transfer',
])
export const membershipTier = pgEnum('membership_tier', [
  'regular',
  'silver',
  'gold',
  'platinum',
  'vip',
])
export const notificationType = pgEnum('notification_type', [
  'booking_reminder',
  'booking_confirmation',
  'booking_change',
  'promotion',
  'birthday',
  'points_expiry',
  'review_request',
])
export const paymentMethod = pgEnum('payment_method', [
  'cash',
  'credit_card',
  'debit_card',
  'e_money',
  'qr_payment',
  'bank_transfer',
  'point',
])
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partial_refund',
])
export const paymentHistoryActorType = pgEnum('payment_history_actor_type', [
  'system',
  'staff',
  'customer',
])
export const pointTransactionType = pgEnum('point_transaction_type', [
  'earned',
  'used',
  'expired',
  'adjusted',
  'transferred',
])
export const serviceCategory = pgEnum('service_category', [
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'styling',
  'extension',
  'other',
])
export const staffLevel = pgEnum('staff_level', [
  'junior',
  'stylist',
  'senior',
  'expert',
  'director',
])
export const userRole = pgEnum('user_role', [
  'customer',
  'staff',
  'manager',
  'admin',
  'owner',
])

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    recipientId: uuid().notNull(),
    recipientType: varchar({ length: 20 }).notNull(),
    notificationType: notificationType().notNull(),
    channel: varchar({ length: 20 }).notNull(),
    subject: varchar({ length: 255 }),
    content: text().notNull(),
    templateId: varchar({ length: 100 }),
    variables: jsonb(),
    status: varchar({ length: 20 }).notNull(),
    sentAt: timestamp({ withTimezone: true, mode: 'string' }),
    deliveredAt: timestamp({ withTimezone: true, mode: 'string' }),
    failedAt: timestamp({ withTimezone: true, mode: 'string' }),
    errorMessage: text(),
    referenceType: varchar({ length: 50 }),
    referenceId: uuid(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_notification_logs_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_notification_logs_notification_type').using(
      'btree',
      table.notificationType.asc().nullsLast().op('enum_ops')
    ),
    index('idx_notification_logs_recipient_id').using(
      'btree',
      table.recipientId.asc().nullsLast().op('uuid_ops')
    ),
  ]
)

export const bookings = pgTable(
  'bookings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingNumber: varchar({ length: 50 }).notNull(),
    salonId: uuid().notNull(),
    customerId: uuid().notNull(),
    staffId: uuid().notNull(),
    bookingDate: date().notNull(),
    startTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    endTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    duration: integer().notNull(),
    status: bookingStatus().default('pending').notNull(),
    bookingStatePayload: jsonb().default({}).notNull(),
    subtotal: integer().notNull(),
    discountAmount: integer().default(0).notNull(),
    taxAmount: integer().default(0).notNull(),
    totalAmount: integer().notNull(),
    depositAmount: integer().default(0),
    pointsUsed: integer().default(0),
    pointsEarned: integer().default(0),
    customerRequest: text(),
    internalNotes: text(),
    reminderSent: boolean().default(false).notNull(),
    reminderSentAt: timestamp({ withTimezone: true, mode: 'string' }),
    cancelledAt: timestamp({ withTimezone: true, mode: 'string' }),
    cancelledBy: uuid(),
    cancellationReason: text(),
    cancellationFee: integer().default(0),
    completedAt: timestamp({ withTimezone: true, mode: 'string' }),
    actualStartTime: timestamp({ withTimezone: true, mode: 'string' }),
    actualEndTime: timestamp({ withTimezone: true, mode: 'string' }),
    source: varchar({ length: 50 }),
    ipAddress: varchar({ length: 50 }),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_bookings_booking_date').using(
      'btree',
      table.bookingDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_bookings_booking_number').using(
      'btree',
      table.bookingNumber.asc().nullsLast().op('text_ops')
    ),
    index('idx_bookings_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_bookings_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_bookings_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_bookings_start_time').using(
      'btree',
      table.startTime.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_bookings_status').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'bookings_salon_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'bookings_customer_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'bookings_staff_id_fk',
    }).onDelete('restrict'),
    unique('bookings_booking_number_unique').on(table.bookingNumber),
  ]
)

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    customerId: uuid().notNull(),
    bookingId: uuid(),
    reservationId: uuid(),
    position: integer().notNull(),
    estimatedTime: timestamp({ withTimezone: true, mode: 'string' }),
    joinedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
    notifiedAt: timestamp({ withTimezone: true, mode: 'string' }),
    preferredStaffId: uuid(),
    preferredServiceId: uuid(),
    notes: text(),
    metadata: jsonb().default({}),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_waitlist_entries_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_waitlist_entries_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_waitlist_entries_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_waitlist_entries_reservation_id').using(
      'btree',
      table.reservationId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_waitlist_entries_position').using(
      'btree',
      table.position.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'waitlist_entries_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'waitlist_entries_customer_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'waitlist_entries_booking_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.reservationId],
      foreignColumns: [reservations.id],
      name: 'waitlist_entries_reservation_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.preferredStaffId],
      foreignColumns: [staff.id],
      name: 'waitlist_entries_preferred_staff_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.preferredServiceId],
      foreignColumns: [services.id],
      name: 'waitlist_entries_preferred_service_id_fk',
    }).onDelete('set null'),
  ]
)

export const bookingDeposits = pgTable(
  'booking_deposits',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingId: uuid().notNull(),
    amount: integer().notNull(),
    currencyCode: varchar({ length: 3 }).default('JPY').notNull(),
    status: bookingDepositStatus().default('pending').notNull(),
    dueDate: timestamp({ withTimezone: true, mode: 'string' }),
    paidAt: timestamp({ withTimezone: true, mode: 'string' }),
    refundedAt: timestamp({ withTimezone: true, mode: 'string' }),
    paymentTransactionId: uuid(),
    notes: text(),
    metadata: jsonb().default({}),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_booking_deposits_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_booking_deposits_status').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops')
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'booking_deposits_booking_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.paymentTransactionId],
      foreignColumns: [paymentTransactions.id],
      name: 'booking_deposits_payment_transaction_id_fk',
    }).onDelete('set null'),
    unique('booking_deposits_unique_booking').on(table.bookingId),
  ]
)

export const bookingServices = pgTable(
  'booking_services',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingId: uuid().notNull(),
    serviceId: uuid().notNull(),
    staffId: uuid(),
    startTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    endTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    duration: integer().notNull(),
    price: integer().notNull(),
    discountAmount: integer().default(0).notNull(),
    finalPrice: integer().notNull(),
    selectedOptions: jsonb().default([]),
    isCompleted: boolean().default(false).notNull(),
    completedAt: timestamp({ withTimezone: true, mode: 'string' }),
    notes: text(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_booking_services_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_booking_services_service_id').using(
      'btree',
      table.serviceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_booking_services_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'booking_services_booking_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'booking_services_service_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'booking_services_staff_id_fk',
    }).onDelete('restrict'),
  ]
)

export const services = pgTable(
  'services',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    categoryId: uuid(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    shortDescription: varchar({ length: 500 }),
    duration: integer().notNull(),
    price: integer().notNull(),
    discountPrice: integer(),
    taxIncluded: boolean().default(true).notNull(),
    imageUrl: varchar({ length: 500 }),
    imageUrls: jsonb().default([]),
    requiredStaffLevel: staffLevel(),
    maxBookingsPerDay: integer(),
    requiresConsultation: boolean().default(false).notNull(),
    allowOnlineBooking: boolean().default(true).notNull(),
    isPackage: boolean().default(false).notNull(),
    packageServiceIds: jsonb().default([]),
    requiredProducts: jsonb().default([]),
    tags: jsonb().default([]),
    sortOrder: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_services_category_id').using(
      'btree',
      table.categoryId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_services_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_services_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'services_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [serviceCategories.id],
      name: 'services_category_id_fk',
    }).onDelete('set null'),
  ]
)

export const staff = pgTable(
  'staff',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    userId: uuid(),
    firstName: varchar({ length: 100 }).notNull(),
    lastName: varchar({ length: 100 }).notNull(),
    firstNameKana: varchar({ length: 100 }),
    lastNameKana: varchar({ length: 100 }),
    displayName: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    phoneNumber: varchar({ length: 20 }).notNull(),
    alternativePhone: varchar({ length: 20 }),
    staffCode: varchar({ length: 50 }),
    level: staffLevel().default('stylist').notNull(),
    position: varchar({ length: 100 }),
    specialties: jsonb().default([]),
    bio: text(),
    imageUrl: varchar({ length: 500 }),
    yearsOfExperience: integer().default(0),
    certifications: jsonb().default([]),
    awards: jsonb().default([]),
    hireDate: date(),
    employmentType: varchar({ length: 50 }),
    baseSalary: integer(),
    commissionRate: numeric({ precision: 5, scale: 2 }),
    canReceiveBookings: boolean().default(true).notNull(),
    maxConcurrentBookings: integer().default(1).notNull(),
    bufferTimeBefore: integer().default(0),
    bufferTimeAfter: integer().default(0),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_staff_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_staff_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    index('idx_staff_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_staff_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'staff_salon_id_fk',
    }).onDelete('cascade'),
    unique('staff_code_salon_unique').on(table.salonId, table.staffCode),
    unique('staff_email_unique').on(table.email),
  ]
)

export const bookingStatusHistories = pgTable(
  'booking_status_histories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingId: uuid().notNull(),
    fromStatus: bookingStatus(),
    toStatus: bookingStatus().notNull(),
    changedBy: uuid(),
    reason: text(),
    metadata: jsonb(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_booking_status_histories_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_booking_status_histories_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'booking_status_histories_booking_id_fk',
    }).onDelete('cascade'),
  ]
)

export const salons = pgTable(
  'salons',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    nameKana: varchar({ length: 255 }),
    description: text(),
    postalCode: varchar({ length: 10 }),
    prefecture: varchar({ length: 50 }).notNull(),
    city: varchar({ length: 100 }).notNull(),
    address: varchar({ length: 255 }).notNull(),
    building: varchar({ length: 255 }),
    latitude: numeric({ precision: 10, scale: 8 }),
    longitude: numeric({ precision: 11, scale: 8 }),
    phoneNumber: varchar({ length: 20 }).notNull(),
    alternativePhone: varchar({ length: 20 }),
    email: varchar({ length: 255 }).notNull(),
    websiteUrl: varchar({ length: 500 }),
    logoUrl: varchar({ length: 500 }),
    imageUrls: jsonb().default([]),
    features: jsonb().default([]),
    amenities: jsonb().default([]),
    timezone: varchar({ length: 50 }).default('Asia/Tokyo').notNull(),
    currency: varchar({ length: 3 }).default('JPY').notNull(),
    taxRate: numeric({ precision: 5, scale: 2 }).default('10.00').notNull(),
    cancellationPolicy: jsonb(),
    bookingPolicy: jsonb(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_salons_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_salons_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    unique('salons_email_unique').on(table.email),
  ]
)

export const customers = pgTable(
  'customers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid(),
    firstName: varchar({ length: 100 }).notNull(),
    lastName: varchar({ length: 100 }).notNull(),
    firstNameKana: varchar({ length: 100 }),
    lastNameKana: varchar({ length: 100 }),
    email: varchar({ length: 255 }).notNull(),
    phoneNumber: varchar({ length: 20 }).notNull(),
    alternativePhone: varchar({ length: 20 }),
    postalCode: varchar({ length: 10 }),
    prefecture: varchar({ length: 50 }),
    city: varchar({ length: 100 }),
    address: varchar({ length: 255 }),
    building: varchar({ length: 255 }),
    birthDate: date(),
    gender: varchar({ length: 20 }),
    occupation: varchar({ length: 100 }),
    membershipTier: membershipTier().default('regular').notNull(),
    loyaltyPoints: integer().default(0).notNull(),
    lifetimeValue: integer().default(0).notNull(),
    preferences: jsonb().default({}),
    notes: text(),
    internalNotes: text(),
    tags: jsonb().default([]),
    referredBy: uuid(),
    referralCode: varchar({ length: 50 }),
    allowMarketing: boolean().default(true).notNull(),
    allowSms: boolean().default(true).notNull(),
    allowEmail: boolean().default(true).notNull(),
    firstVisitDate: date(),
    lastVisitDate: date(),
    visitCount: integer().default(0).notNull(),
    noShowCount: integer().default(0).notNull(),
    cancellationCount: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_customers_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_customers_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    index('idx_customers_membership_tier').using(
      'btree',
      table.membershipTier.asc().nullsLast().op('enum_ops')
    ),
    index('idx_customers_phone_number').using(
      'btree',
      table.phoneNumber.asc().nullsLast().op('text_ops')
    ),
    index('idx_customers_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.referredBy],
      foreignColumns: [table.id],
      name: 'customers_referred_by_fk',
    }).onDelete('set null'),
    unique('customers_email_unique').on(table.email),
    unique('customers_referral_code_unique').on(table.referralCode),
  ]
)

export const customerAllergies = pgTable(
  'customer_allergies',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    customerId: uuid().notNull(),
    allergyType: allergyType().notNull(),
    allergenName: varchar({ length: 255 }).notNull(),
    severity: integer().default(3).notNull(),
    symptoms: text(),
    notes: text(),
    confirmedDate: date(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_customer_allergies_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'customer_allergies_customer_id_fk',
    }).onDelete('cascade'),
  ]
)

export const customerPoints = pgTable(
  'customer_points',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    customerId: uuid().notNull(),
    transactionType: pointTransactionType().notNull(),
    points: integer().notNull(),
    balance: integer().notNull(),
    description: text(),
    referenceType: varchar({ length: 50 }),
    referenceId: uuid(),
    expiryDate: date(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_customer_points_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_customer_points_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_customer_points_expiry_date').using(
      'btree',
      table.expiryDate.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'customer_points_customer_id_fk',
    }).onDelete('cascade'),
  ]
)

export const customerPreferences = pgTable(
  'customer_preferences',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    customerId: uuid().notNull(),
    preferredStaffId: uuid(),
    preferredTimeSlots: jsonb().default([]),
    avoidStaffIds: jsonb().default([]),
    preferredServices: jsonb().default([]),
    stylePreferences: jsonb().default({}),
    communicationStyle: varchar({ length: 100 }),
    specialRequests: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_customer_preferences_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'customer_preferences_customer_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.preferredStaffId],
      foreignColumns: [staff.id],
      name: 'customer_preferences_staff_id_fk',
    }).onDelete('set null'),
    unique('customer_preferences_unique').on(table.customerId),
  ]
)

export const dailySummaries = pgTable(
  'daily_summaries',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    summaryDate: date().notNull(),
    totalBookings: integer().default(0).notNull(),
    completedBookings: integer().default(0).notNull(),
    cancelledBookings: integer().default(0).notNull(),
    noShowBookings: integer().default(0).notNull(),
    uniqueCustomers: integer().default(0).notNull(),
    newCustomers: integer().default(0).notNull(),
    returningCustomers: integer().default(0).notNull(),
    totalSales: integer().default(0).notNull(),
    serviceSales: integer().default(0).notNull(),
    productSales: integer().default(0).notNull(),
    averageTicket: integer().default(0).notNull(),
    activeStaff: integer().default(0).notNull(),
    totalServiceHours: numeric({ precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    utilizationRate: numeric({ precision: 5, scale: 2 }).default('0').notNull(),
    topService: jsonb(),
    topStaff: jsonb(),
    topProduct: jsonb(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_daily_summaries_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_daily_summaries_summary_date').using(
      'btree',
      table.summaryDate.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'daily_summaries_salon_id_fk',
    }).onDelete('cascade'),
    unique('daily_summaries_unique').on(table.salonId, table.summaryDate),
  ]
)

export const inventory = pgTable(
  'inventory',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    productId: uuid().notNull(),
    currentStock: numeric({ precision: 10, scale: 2 }).notNull(),
    availableStock: numeric({ precision: 10, scale: 2 }).notNull(),
    reservedStock: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
    lotNumber: varchar({ length: 100 }),
    expiryDate: date(),
    location: varchar({ length: 100 }),
    shelf: varchar({ length: 50 }),
    lastCountedAt: timestamp({ withTimezone: true, mode: 'string' }),
    lastCountedBy: uuid(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_inventory_expiry_date').using(
      'btree',
      table.expiryDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_inventory_lot_number').using(
      'btree',
      table.lotNumber.asc().nullsLast().op('text_ops')
    ),
    index('idx_inventory_product_id').using(
      'btree',
      table.productId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_inventory_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'inventory_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'inventory_product_id_fk',
    }).onDelete('cascade'),
    unique('inventory_unique').on(
      table.salonId,
      table.productId,
      table.lotNumber
    ),
  ]
)

export const products = pgTable(
  'products',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    productCode: varchar({ length: 100 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    category: varchar({ length: 100 }),
    brand: varchar({ length: 100 }),
    purchasePrice: integer(),
    retailPrice: integer(),
    salonPrice: integer(),
    unit: varchar({ length: 20 }).notNull(),
    minimumStock: numeric({ precision: 10, scale: 2 }).default('0'),
    maximumStock: numeric({ precision: 10, scale: 2 }),
    reorderPoint: numeric({ precision: 10, scale: 2 }),
    supplierId: uuid(),
    supplierProductCode: varchar({ length: 100 }),
    leadTimeDays: integer(),
    imageUrl: varchar({ length: 500 }),
    barcode: varchar({ length: 100 }),
    isForSale: boolean().default(false).notNull(),
    isForTreatment: boolean().default(true).notNull(),
    requiresLotTracking: boolean().default(false).notNull(),
    expiryMonths: integer(),
    storageConditions: text(),
    safetyDataSheet: varchar({ length: 500 }),
    isActive: boolean().default(true).notNull(),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_products_barcode').using(
      'btree',
      table.barcode.asc().nullsLast().op('text_ops')
    ),
    index('idx_products_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_products_product_code').using(
      'btree',
      table.productCode.asc().nullsLast().op('text_ops')
    ),
    index('idx_products_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'products_salon_id_fk',
    }).onDelete('cascade'),
    unique('products_code_salon_unique').on(table.salonId, table.productCode),
  ]
)

export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    productId: uuid().notNull(),
    inventoryId: uuid(),
    transactionType: inventoryTransactionType().notNull(),
    quantity: numeric({ precision: 10, scale: 2 }).notNull(),
    occurredAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    balanceBefore: numeric({ precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric({ precision: 10, scale: 2 }).notNull(),
    unitCost: integer(),
    totalCost: integer(),
    referenceType: varchar({ length: 50 }),
    referenceId: uuid(),
    lotNumber: varchar({ length: 100 }),
    expiryDate: date(),
    reason: text(),
    notes: text(),
    performedBy: uuid(),
    metadata: jsonb().default({}),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_inventory_transactions_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_inventory_transactions_inventory_id').using(
      'btree',
      table.inventoryId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_inventory_transactions_product_id').using(
      'btree',
      table.productId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_inventory_transactions_occurred_at').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_inventory_transactions_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_inventory_transactions_transaction_type').using(
      'btree',
      table.transactionType.asc().nullsLast().op('enum_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'inventory_transactions_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'inventory_transactions_product_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.inventoryId],
      foreignColumns: [inventory.id],
      name: 'inventory_transactions_inventory_id_fk',
    }).onDelete('set null'),
  ]
)

export const membershipTiers = pgTable(
  'membership_tiers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    tier: membershipTier().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    requiredPoints: integer().default(0).notNull(),
    requiredAmount: integer().default(0).notNull(),
    discountRate: numeric({ precision: 5, scale: 2 }).default('0').notNull(),
    pointMultiplier: numeric({ precision: 3, scale: 1 })
      .default('1.0')
      .notNull(),
    benefits: jsonb().default([]),
    color: varchar({ length: 7 }),
    iconUrl: varchar({ length: 500 }),
    sortOrder: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_membership_tiers_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'membership_tiers_salon_id_fk',
    }).onDelete('cascade'),
    unique('membership_tiers_unique').on(table.salonId, table.tier),
  ]
)

export const openingHours = pgTable(
  'opening_hours',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    dayOfWeek: dayOfWeek(),
    specificDate: date(),
    openTime: time(),
    closeTime: time(),
    isHoliday: boolean().default(false).notNull(),
    holidayName: varchar({ length: 100 }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_opening_hours_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_opening_hours_specific_date').using(
      'btree',
      table.specificDate.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'opening_hours_salon_id_fk',
    }).onDelete('cascade'),
  ]
)

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    method: paymentMethod().notNull(),
    displayName: varchar({ length: 100 }).notNull(),
    description: text(),
    processorName: varchar({ length: 100 }),
    processorConfig: jsonb(),
    fee: numeric({ precision: 5, scale: 2 }).default('0'),
    minimumAmount: integer(),
    maximumAmount: integer(),
    isOnlineEnabled: boolean().default(false).notNull(),
    isOfflineEnabled: boolean().default(true).notNull(),
    sortOrder: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_payment_methods_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'payment_methods_salon_id_fk',
    }).onDelete('cascade'),
  ]
)

export const sales = pgTable(
  'sales',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    saleNumber: varchar({ length: 50 }).notNull(),
    salonId: uuid().notNull(),
    customerId: uuid(),
    staffId: uuid(),
    bookingId: uuid(),
    saleDate: date().notNull(),
    saleTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    subtotal: integer().notNull(),
    discountAmount: integer().default(0).notNull(),
    taxAmount: integer().notNull(),
    totalAmount: integer().notNull(),
    pointsUsed: integer().default(0),
    pointsEarned: integer().default(0),
    paymentStatus: paymentStatus().default('pending').notNull(),
    isVoid: boolean().default(false).notNull(),
    voidedAt: timestamp({ withTimezone: true, mode: 'string' }),
    voidReason: text(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_sales_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_sales_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_sales_sale_date').using(
      'btree',
      table.saleDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_sales_sale_number').using(
      'btree',
      table.saleNumber.asc().nullsLast().op('text_ops')
    ),
    index('idx_sales_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_sales_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'sales_salon_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'sales_customer_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'sales_staff_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'sales_booking_id_fk',
    }).onDelete('restrict'),
    unique('sales_sale_number_unique').on(table.saleNumber),
  ]
)

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    saleId: uuid().notNull(),
    paymentMethodId: uuid().notNull(),
    transactionNumber: varchar({ length: 100 }).notNull(),
    amount: integer().notNull(),
    currencyCode: varchar({ length: 3 }).default('JPY').notNull(),
    status: paymentStatus().notNull(),
    paymentStatePayload: jsonb().default({}).notNull(),
    processorTransactionId: varchar({ length: 255 }),
    processorResponse: jsonb(),
    cardLastFour: varchar({ length: 4 }),
    cardBrand: varchar({ length: 50 }),
    errorCode: varchar({ length: 100 }),
    errorMessage: text(),
    processedAt: timestamp({ withTimezone: true, mode: 'string' }),
    failedAt: timestamp({ withTimezone: true, mode: 'string' }),
    refundedAt: timestamp({ withTimezone: true, mode: 'string' }),
    refundAmount: integer(),
    refundReason: text(),
    metadata: jsonb(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_payment_transactions_payment_method_id').using(
      'btree',
      table.paymentMethodId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_payment_transactions_sale_id').using(
      'btree',
      table.saleId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_payment_transactions_status').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops')
    ),
    index('idx_payment_transactions_transaction_number').using(
      'btree',
      table.transactionNumber.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [sales.id],
      name: 'payment_transactions_sale_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.paymentMethodId],
      foreignColumns: [paymentMethods.id],
      name: 'payment_transactions_payment_method_id_fk',
    }).onDelete('restrict'),
    unique('payment_transactions_transaction_number_unique').on(
      table.transactionNumber
    ),
  ]
)

export const paymentHistories = pgTable(
  'payment_histories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    paymentTransactionId: uuid().notNull(),
    status: paymentStatus().notNull(),
    statePayload: jsonb().default({}).notNull(),
    occurredAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    actorType: paymentHistoryActorType(),
    actorId: uuid(),
    note: text(),
    metadata: jsonb().default({}),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_payment_histories_payment_transaction_id').using(
      'btree',
      table.paymentTransactionId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_payment_histories_occurred_at').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_payment_histories_actor_type').using(
      'btree',
      table.actorType.asc().nullsLast().op('enum_ops')
    ),
    foreignKey({
      columns: [table.paymentTransactionId],
      foreignColumns: [paymentTransactions.id],
      name: 'payment_histories_payment_transaction_id_fk',
    }).onDelete('cascade'),
  ]
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    customerId: uuid().notNull(),
    bookingId: uuid().notNull(),
    staffId: uuid(),
    overallRating: integer().notNull(),
    serviceRating: integer(),
    staffRating: integer(),
    atmosphereRating: integer(),
    cleanlinessRating: integer(),
    valueRating: integer(),
    title: varchar({ length: 255 }),
    comment: text(),
    imageUrls: jsonb().default([]),
    isVerified: boolean().default(false).notNull(),
    helpfulCount: integer().default(0).notNull(),
    reportCount: integer().default(0).notNull(),
    ownerResponse: text(),
    ownerRespondedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_reviews_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reviews_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reviews_overall_rating').using(
      'btree',
      table.overallRating.asc().nullsLast().op('int4_ops')
    ),
    index('idx_reviews_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reviews_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'reviews_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'reviews_customer_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'reviews_booking_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'reviews_staff_id_fk',
    }).onDelete('set null'),
    unique('reviews_booking_unique').on(table.bookingId),
  ]
)

export const salesDetails = pgTable(
  'sales_details',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    saleId: uuid().notNull(),
    itemType: varchar({ length: 50 }).notNull(),
    itemId: uuid(),
    itemName: varchar({ length: 255 }).notNull(),
    quantity: integer().notNull(),
    unitPrice: integer().notNull(),
    discountAmount: integer().default(0).notNull(),
    taxAmount: integer().notNull(),
    totalAmount: integer().notNull(),
    staffId: uuid(),
    commissionRate: numeric({ precision: 5, scale: 2 }),
    commissionAmount: integer(),
    notes: text(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_sales_details_sale_id').using(
      'btree',
      table.saleId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_sales_details_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [sales.id],
      name: 'sales_details_sale_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'sales_details_staff_id_fk',
    }).onDelete('restrict'),
  ]
)

export const serviceCategories = pgTable(
  'service_categories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salonId: uuid().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    parentId: uuid(),
    category: serviceCategory().notNull(),
    displayOrder: integer().default(0).notNull(),
    iconUrl: varchar({ length: 500 }),
    color: varchar({ length: 7 }),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_service_categories_parent_id').using(
      'btree',
      table.parentId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_service_categories_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'service_categories_salon_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'service_categories_parent_id_fk',
    }).onDelete('set null'),
  ]
)

export const serviceOptions = pgTable(
  'service_options',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    serviceId: uuid().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    additionalTime: integer().default(0).notNull(),
    additionalPrice: integer().default(0).notNull(),
    maxQuantity: integer().default(1).notNull(),
    isRequired: boolean().default(false).notNull(),
    sortOrder: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_service_options_service_id').using(
      'btree',
      table.serviceId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'service_options_service_id_fk',
    }).onDelete('cascade'),
  ]
)

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    passwordHash: text().notNull(),
    role: userRole().default('customer').notNull(),
    permissions: jsonb().default([]),
    status: accountStatus().default('active').notNull(),
    emailVerified: boolean().default(false).notNull(),
    emailVerificationToken: varchar({ length: 255 }),
    emailVerificationExpiry: timestamp({ withTimezone: true, mode: 'string' }),
    passwordResetToken: varchar({ length: 255 }),
    passwordResetExpiry: timestamp({ withTimezone: true, mode: 'string' }),
    lastPasswordChange: timestamp({ withTimezone: true, mode: 'string' }),
    passwordHistory: jsonb().default([]),
    twoFactorEnabled: boolean().default(false).notNull(),
    twoFactorSecret: text(),
    backupCodes: jsonb(),
    failedLoginAttempts: integer().default(0).notNull(),
    lockedUntil: timestamp({ withTimezone: true, mode: 'string' }),
    lastLoginAt: timestamp({ withTimezone: true, mode: 'string' }),
    lastLoginIp: varchar({ length: 50 }),
    trustedIpAddresses: jsonb().default([]),
    customerId: uuid(),
    staffId: uuid(),
    metadata: jsonb().default({}),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_users_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_users_deleted_at').using(
      'btree',
      table.deletedAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_users_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    index('idx_users_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'users_customer_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'users_staff_id_fk',
    }).onDelete('set null'),
    unique('users_email_unique').on(table.email),
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid().notNull(),
    token: text().notNull(),
    refreshToken: text(),
    ipAddress: varchar({ length: 50 }).notNull(),
    userAgent: text().notNull(),
    deviceId: varchar({ length: 255 }),
    expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    refreshExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
    lastActivityAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_sessions_expires_at').using(
      'btree',
      table.expiresAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_sessions_refresh_token').using(
      'btree',
      table.refreshToken.asc().nullsLast().op('text_ops')
    ),
    index('idx_sessions_token').using(
      'btree',
      table.token.asc().nullsLast().op('text_ops')
    ),
    index('idx_sessions_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_fk',
    }).onDelete('cascade'),
    unique('sessions_token_unique').on(table.token),
    unique('sessions_refresh_token_unique').on(table.refreshToken),
  ]
)

export const staffPerformances = pgTable(
  'staff_performances',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    staffId: uuid().notNull(),
    periodStart: date().notNull(),
    periodEnd: date().notNull(),
    periodType: varchar({ length: 20 }).notNull(),
    totalBookings: integer().default(0).notNull(),
    completedBookings: integer().default(0).notNull(),
    cancelledBookings: integer().default(0).notNull(),
    rebookingRate: numeric({ precision: 5, scale: 2 }).default('0').notNull(),
    totalRevenue: integer().default(0).notNull(),
    serviceRevenue: integer().default(0).notNull(),
    productRevenue: integer().default(0).notNull(),
    averageTicket: integer().default(0).notNull(),
    commission: integer().default(0).notNull(),
    totalHoursWorked: numeric({ precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    totalServiceHours: numeric({ precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    utilizationRate: numeric({ precision: 5, scale: 2 }).default('0').notNull(),
    uniqueCustomers: integer().default(0).notNull(),
    newCustomers: integer().default(0).notNull(),
    returningCustomers: integer().default(0).notNull(),
    averageRating: numeric({ precision: 3, scale: 2 }),
    reviewCount: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_staff_performances_period_start').using(
      'btree',
      table.periodStart.asc().nullsLast().op('date_ops')
    ),
    index('idx_staff_performances_period_type').using(
      'btree',
      table.periodType.asc().nullsLast().op('text_ops')
    ),
    index('idx_staff_performances_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'staff_performances_staff_id_fk',
    }).onDelete('cascade'),
    unique('staff_performances_unique').on(
      table.staffId,
      table.periodStart,
      table.periodType
    ),
  ]
)

export const staffSchedules = pgTable(
  'staff_schedules',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    staffId: uuid().notNull(),
    dayOfWeek: dayOfWeek(),
    date: date(),
    startTime: time().notNull(),
    endTime: time().notNull(),
    breakSlots: jsonb().default([]),
    breakStartTime: time(),
    breakEndTime: time(),
    isRecurring: boolean().default(true).notNull(),
    isAvailable: boolean().default(true).notNull(),
    effectiveStartDate: date(),
    effectiveEndDate: date(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_staff_schedules_date').using(
      'btree',
      table.date.asc().nullsLast().op('date_ops')
    ),
    index('idx_staff_schedules_day_of_week').using(
      'btree',
      table.dayOfWeek.asc().nullsLast().op('enum_ops')
    ),
    index('idx_staff_schedules_effective_start').using(
      'btree',
      table.effectiveStartDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_staff_schedules_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'staff_schedules_staff_id_fk',
    }).onDelete('cascade'),
  ]
)

export const staffSkills = pgTable(
  'staff_skills',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    staffId: uuid().notNull(),
    serviceId: uuid().notNull(),
    proficiencyLevel: integer().default(3).notNull(),
    certificateDate: date(),
    certificateUrl: varchar({ length: 500 }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_staff_skills_service_id').using(
      'btree',
      table.serviceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_staff_skills_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'staff_skills_staff_id_fk',
    }).onDelete('cascade'),
    unique('staff_skills_unique').on(table.staffId, table.serviceId),
  ]
)

export const staffQualifications = pgTable(
  'staff_qualifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    staffId: uuid().notNull(),
    name: varchar({ length: 255 }).notNull(),
    certificationDate: date().notNull(),
    expiryDate: date(),
    issuer: varchar({ length: 255 }),
    credentialId: varchar({ length: 100 }),
    notes: text(),
    metadata: jsonb().default({}),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_staff_qualifications_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_staff_qualifications_credential_id').using(
      'btree',
      table.credentialId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'staff_qualifications_staff_id_fk',
    }).onDelete('cascade'),
  ]
)

export const treatmentRecords = pgTable(
  'treatment_records',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingId: uuid().notNull(),
    customerId: uuid().notNull(),
    staffId: uuid().notNull(),
    services: jsonb().notNull(),
    techniques: jsonb().default([]),
    consultationNotes: text(),
    scalpCondition: jsonb(),
    hairCondition: jsonb(),
    colorFormula: jsonb(),
    processingTime: integer(),
    beforePhotos: jsonb().default([]),
    afterPhotos: jsonb().default([]),
    resultNotes: text(),
    nextRecommendedDate: date(),
    nextRecommendedServices: jsonb().default([]),
    homeCareSuggestions: text(),
    customerSatisfaction: integer(),
    staffEvaluation: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_treatment_records_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_treatment_records_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_treatment_records_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'treatment_records_booking_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'treatment_records_customer_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'treatment_records_staff_id_fk',
    }).onDelete('restrict'),
    unique('treatment_records_booking_unique').on(table.bookingId),
  ]
)

export const treatmentMaterials = pgTable(
  'treatment_materials',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    treatmentRecordId: uuid().notNull(),
    productId: uuid().notNull(),
    quantity: numeric({ precision: 10, scale: 2 }).notNull(),
    unit: varchar({ length: 20 }).notNull(),
    lotNumber: varchar({ length: 100 }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_treatment_materials_product_id').using(
      'btree',
      table.productId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_treatment_materials_treatment_record_id').using(
      'btree',
      table.treatmentRecordId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.treatmentRecordId],
      foreignColumns: [treatmentRecords.id],
      name: 'treatment_materials_treatment_record_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'treatment_materials_product_id_fk',
    }).onDelete('restrict'),
  ]
)

export const treatmentPhotos = pgTable(
  'treatment_photos',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    treatmentRecordId: uuid().notNull(),
    photoType: varchar({ length: 20 }).notNull(),
    photoUrl: varchar({ length: 500 }).notNull(),
    thumbnailUrl: varchar({ length: 500 }),
    angle: varchar({ length: 50 }),
    description: text(),
    isPublic: boolean().default(false).notNull(),
    customerConsent: boolean().default(false).notNull(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_treatment_photos_photo_type').using(
      'btree',
      table.photoType.asc().nullsLast().op('text_ops')
    ),
    index('idx_treatment_photos_treatment_record_id').using(
      'btree',
      table.treatmentRecordId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.treatmentRecordId],
      foreignColumns: [treatmentRecords.id],
      name: 'treatment_photos_treatment_record_id_fk',
    }).onDelete('cascade'),
  ]
)

// Attachments table for file storage
export const attachments = pgTable(
  'attachments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    fileName: varchar({ length: 255 }).notNull(),
    fileType: varchar({ length: 100 }).notNull(),
    fileSize: integer().notNull(),
    mimeType: varchar({ length: 100 }).notNull(),
    storageKey: varchar({ length: 500 }).notNull(),
    storageProvider: varchar({ length: 50 }).notNull(),
    uploadedBy: uuid().notNull(),
    uploadedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    status: varchar({ length: 50 }).default('active').notNull(),
    metadata: jsonb(),
    tags: jsonb(),
    description: text(),
    expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
    deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('idx_attachments_uploaded_by').using(
      'btree',
      table.uploadedBy.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_attachments_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    index('idx_attachments_storage_key').using(
      'btree',
      table.storageKey.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.id],
      name: 'attachments_uploaded_by_fk',
    }).onDelete('restrict'),
  ]
)

// Share links for attachments
export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    attachmentId: uuid().notNull(),
    token: varchar({ length: 255 }).notNull().unique(),
    createdBy: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
    accessCount: integer().default(0).notNull(),
    maxAccessCount: integer(),
    password: varchar({ length: 255 }),
    isActive: boolean().default(true).notNull(),
    metadata: jsonb(),
  },
  (table) => [
    index('idx_share_links_attachment_id').using(
      'btree',
      table.attachmentId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_share_links_token').using(
      'btree',
      table.token.asc().nullsLast().op('text_ops')
    ),
    index('idx_share_links_is_active').using(
      'btree',
      table.isActive.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [attachments.id],
      name: 'share_links_attachment_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'share_links_created_by_fk',
    }).onDelete('restrict'),
  ]
)

// Download logs for attachments
export const downloadLogs = pgTable(
  'download_logs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    attachmentId: uuid().notNull(),
    downloadedBy: uuid(),
    downloadedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    ipAddress: varchar({ length: 45 }),
    userAgent: text(),
    shareLinkId: uuid(),
    metadata: jsonb(),
  },
  (table) => [
    index('idx_download_logs_attachment_id').using(
      'btree',
      table.attachmentId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_download_logs_downloaded_by').using(
      'btree',
      table.downloadedBy.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_download_logs_share_link_id').using(
      'btree',
      table.shareLinkId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [attachments.id],
      name: 'download_logs_attachment_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.downloadedBy],
      foreignColumns: [users.id],
      name: 'download_logs_downloaded_by_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.shareLinkId],
      foreignColumns: [shareLinks.id],
      name: 'download_logs_share_link_id_fk',
    }).onDelete('set null'),
  ]
)

// Reservations table (for individual service bookings)
export const reservations = pgTable(
  'reservations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookingId: uuid(),
    customerId: uuid().notNull(),
    salonId: uuid().notNull(),
    serviceId: uuid().notNull(),
    staffId: uuid().notNull(),
    startTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    endTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    duration: integer().notNull(),
    status: varchar({ length: 50 }).default('pending').notNull(),
    amount: integer().notNull(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    cancelledAt: timestamp({ withTimezone: true, mode: 'string' }),
    cancelledBy: uuid(),
    cancellationReason: text(),
  },
  (table) => [
    index('idx_reservations_booking_id').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_customer_id').using(
      'btree',
      table.customerId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_salon_id').using(
      'btree',
      table.salonId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_staff_id').using(
      'btree',
      table.staffId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_service_id').using(
      'btree',
      table.serviceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_start_time').using(
      'btree',
      table.startTime.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.id],
      name: 'reservations_booking_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'reservations_customer_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.salonId],
      foreignColumns: [salons.id],
      name: 'reservations_salon_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'reservations_service_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staff.id],
      name: 'reservations_staff_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.cancelledBy],
      foreignColumns: [users.id],
      name: 'reservations_cancelled_by_fk',
    }).onDelete('set null'),
  ]
)
