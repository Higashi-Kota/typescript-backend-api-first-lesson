import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const booking_status = pgEnum('booking_status', [
  'draft',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export const day_of_week = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export const file_type = pgEnum('file_type', ['image', 'document', 'other'])
export const reservation_status = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export const service_category = pgEnum('service_category', [
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'other',
])
export const two_factor_status = pgEnum('two_factor_status', [
  'disabled',
  'pending',
  'enabled',
])
export const user_account_status = pgEnum('user_account_status', [
  'active',
  'unverified',
  'locked',
  'suspended',
  'deleted',
])
export const user_role = pgEnum('user_role', ['customer', 'staff', 'admin'])

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text().notNull(),
    name: text().notNull(),
    password_hash: text().notNull(),
    role: user_role().default('customer').notNull(),
    email_verified: boolean().default(false).notNull(),
    email_verification_token: text(),
    email_verification_token_expiry: timestamp({
      withTimezone: true,
      mode: 'string',
    }),
    two_factor_secret: text(),
    backup_codes: jsonb(),
    failed_login_attempts: integer().default(0).notNull(),
    locked_at: timestamp({ withTimezone: true, mode: 'string' }),
    password_reset_token: text(),
    password_reset_token_expiry: timestamp({
      withTimezone: true,
      mode: 'string',
    }),
    last_password_change_at: timestamp({ withTimezone: true, mode: 'string' }),
    password_history: jsonb(),
    trusted_ip_addresses: jsonb(),
    customer_id: uuid(),
    staff_id: uuid(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    last_login_at: timestamp({ withTimezone: true, mode: 'string' }),
    last_login_ip: text(),
  },
  (table) => [
    index('idx_users_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.customer_id],
      foreignColumns: [customers.id],
      name: 'users_customer_id_customers_id_fk',
    }),
    foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
      name: 'users_staff_id_staff_id_fk',
    }),
    unique('users_email_unique').on(table.email),
  ]
)

export const attachments = pgTable(
  'attachments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    key: text().notNull(),
    filename: text().notNull(),
    content_type: text().notNull(),
    size: integer().notNull(),
    uploaded_by: uuid().notNull(),
    salon_id: uuid(),
    metadata: jsonb(),
    tags: jsonb(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_attachments_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_attachments_uploaded_by').using(
      'btree',
      table.uploaded_by.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.uploaded_by],
      foreignColumns: [users.id],
      name: 'attachments_uploaded_by_users_id_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'attachments_salon_id_salons_id_fk',
    }).onDelete('cascade'),
    unique('attachments_key_key').on(table.key),
  ]
)

export const salons = pgTable(
  'salons',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    address: jsonb().notNull(),
    email: text().notNull(),
    phone_number: text().notNull(),
    alternative_phone: text(),
    image_urls: jsonb(),
    features: jsonb(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [unique('salons_email_unique').on(table.email)]
)

export const bookings = pgTable(
  'bookings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    customer_id: uuid().notNull(),
    total_amount: integer().notNull(),
    discount_amount: integer().default(0),
    final_amount: integer().notNull(),
    payment_method: text(),
    payment_status: text().default('pending').notNull(),
    notes: text(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [
    index('idx_bookings_customer_id').using(
      'btree',
      table.customer_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_bookings_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'bookings_salon_id_salons_id_fk',
    }),
    foreignKey({
      columns: [table.customer_id],
      foreignColumns: [customers.id],
      name: 'bookings_customer_id_customers_id_fk',
    }),
  ]
)

export const booking_reservations = pgTable(
  'booking_reservations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    booking_id: uuid().notNull(),
    reservation_id: uuid().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.booking_id],
      foreignColumns: [bookings.id],
      name: 'booking_reservations_booking_id_bookings_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.reservation_id],
      foreignColumns: [reservations.id],
      name: 'booking_reservations_reservation_id_reservations_id_fk',
    }).onDelete('restrict'),
  ]
)

export const reservations = pgTable(
  'reservations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    customer_id: uuid().notNull(),
    staff_id: uuid().notNull(),
    service_id: uuid().notNull(),
    start_time: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    end_time: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    notes: text(),
    total_amount: integer().notNull(),
    deposit_amount: integer(),
    is_paid: boolean().default(false).notNull(),
    cancellation_reason: text(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [
    index('idx_reservations_customer_id').using(
      'btree',
      table.customer_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_staff_id').using(
      'btree',
      table.staff_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reservations_start_time').using(
      'btree',
      table.start_time.asc().nullsLast().op('timestamptz_ops')
    ),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'reservations_salon_id_salons_id_fk',
    }),
    foreignKey({
      columns: [table.customer_id],
      foreignColumns: [customers.id],
      name: 'reservations_customer_id_customers_id_fk',
    }),
    foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
      name: 'reservations_staff_id_staff_id_fk',
    }),
    foreignKey({
      columns: [table.service_id],
      foreignColumns: [services.id],
      name: 'reservations_service_id_services_id_fk',
    }),
  ]
)

export const customers = pgTable(
  'customers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    phone_number: text().notNull(),
    alternative_phone: text(),
    preferences: text(),
    notes: text(),
    tags: jsonb(),
    loyalty_points: integer().default(0).notNull(),
    membership_level: text(),
    birth_date: date(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [unique('customers_email_unique').on(table.email)]
)

export const download_logs = pgTable(
  'download_logs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    attachment_id: uuid().notNull(),
    share_link_id: uuid(),
    downloaded_by: uuid(),
    ip_address: text(),
    user_agent: text(),
    downloaded_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_download_logs_attachment_id').using(
      'btree',
      table.attachment_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.attachment_id],
      foreignColumns: [attachments.id],
      name: 'download_logs_attachment_id_attachments_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.share_link_id],
      foreignColumns: [share_links.id],
      name: 'download_logs_share_link_id_share_links_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.downloaded_by],
      foreignColumns: [users.id],
      name: 'download_logs_downloaded_by_users_id_fk',
    }).onDelete('set null'),
  ]
)

export const share_links = pgTable(
  'share_links',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    token: text().notNull(),
    attachment_id: uuid().notNull(),
    expires_at: timestamp({ withTimezone: true, mode: 'string' }),
    max_downloads: integer(),
    download_count: integer().default(0).notNull(),
    password_hash: text(),
    allowed_emails: jsonb(),
    created_by: uuid().notNull(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_share_links_attachment_id').using(
      'btree',
      table.attachment_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_share_links_token').using(
      'btree',
      table.token.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.attachment_id],
      foreignColumns: [attachments.id],
      name: 'share_links_attachment_id_attachments_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.created_by],
      foreignColumns: [users.id],
      name: 'share_links_created_by_users_id_fk',
    }).onDelete('restrict'),
    unique('share_links_token_key').on(table.token),
  ]
)

export const opening_hours = pgTable(
  'opening_hours',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    open_time: time().notNull(),
    close_time: time().notNull(),
    is_holiday: boolean().default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'opening_hours_salon_id_salons_id_fk',
    }).onDelete('cascade'),
  ]
)

export const staff = pgTable(
  'staff',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    phone_number: text().notNull(),
    alternative_phone: text(),
    specialties: jsonb().default([]).notNull(),
    bio: text(),
    image_url: text(),
    years_of_experience: integer(),
    certifications: jsonb(),
    is_active: boolean().default(true).notNull(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [
    index('idx_staff_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'staff_salon_id_salons_id_fk',
    }).onDelete('cascade'),
  ]
)

export const services = pgTable(
  'services',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    duration: integer().notNull(),
    price: integer().notNull(),
    category_id: uuid(),
    image_url: text(),
    required_staff_level: integer(),
    is_active: boolean().default(true).notNull(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [
    index('idx_services_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'services_salon_id_salons_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.category_id],
      foreignColumns: [service_categories.id],
      name: 'services_category_id_service_categories_id_fk',
    }),
  ]
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    salon_id: uuid().notNull(),
    customer_id: uuid().notNull(),
    reservation_id: uuid().notNull(),
    staff_id: uuid(),
    rating: integer().notNull(),
    comment: text(),
    service_rating: integer(),
    staff_rating: integer(),
    atmosphere_rating: integer(),
    images: jsonb(),
    is_verified: boolean().default(false).notNull(),
    helpful_count: integer().default(0).notNull(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    created_by: text(),
    updated_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_by: text(),
  },
  (table) => [
    index('idx_reviews_customer_id').using(
      'btree',
      table.customer_id.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_reviews_rating').using(
      'btree',
      table.rating.asc().nullsLast().op('int4_ops')
    ),
    index('idx_reviews_salon_id').using(
      'btree',
      table.salon_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.salon_id],
      foreignColumns: [salons.id],
      name: 'reviews_salon_id_salons_id_fk',
    }),
    foreignKey({
      columns: [table.customer_id],
      foreignColumns: [customers.id],
      name: 'reviews_customer_id_customers_id_fk',
    }),
    foreignKey({
      columns: [table.reservation_id],
      foreignColumns: [reservations.id],
      name: 'reviews_reservation_id_reservations_id_fk',
    }),
    foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
      name: 'reviews_staff_id_staff_id_fk',
    }),
    unique('reviews_reservation_id_unique').on(table.reservation_id),
  ]
)

export const service_categories = pgTable('service_categories', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  description: text().notNull(),
  parent_id: uuid(),
  display_order: integer().notNull(),
  is_active: boolean().default(true).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  created_by: text(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_by: text(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    user_id: uuid().notNull(),
    refresh_token: text().notNull(),
    ip_address: text().notNull(),
    user_agent: text().notNull(),
    expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    remember_me: boolean().default(false).notNull(),
    created_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    last_activity_at: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_sessions_expires_at').using(
      'btree',
      table.expires_at.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_sessions_refresh_token').using(
      'btree',
      table.refresh_token.asc().nullsLast().op('text_ops')
    ),
    index('idx_sessions_user_id').using(
      'btree',
      table.user_id.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: 'sessions_user_id_users_id_fk',
    }).onDelete('cascade'),
    unique('sessions_refresh_token_unique').on(table.refresh_token),
  ]
)

export const staff_working_hours = pgTable(
  'staff_working_hours',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    staff_id: uuid().notNull(),
    start_time: time().notNull(),
    end_time: time().notNull(),
    break_start: time(),
    break_end: time(),
  },
  (table) => [
    foreignKey({
      columns: [table.staff_id],
      foreignColumns: [staff.id],
      name: 'staff_working_hours_staff_id_staff_id_fk',
    }).onDelete('cascade'),
  ]
)
