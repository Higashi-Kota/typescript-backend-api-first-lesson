import { relations } from 'drizzle-orm/relations'
import {
  attachments,
  booking_reservations,
  bookings,
  customers,
  download_logs,
  opening_hours,
  reservations,
  reviews,
  salons,
  service_categories,
  services,
  sessions,
  share_links,
  staff,
  staff_working_hours,
  users,
} from './schema.js'

export const usersRelations = relations(users, ({ one, many }) => ({
  customer: one(customers, {
    fields: [users.customer_id],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [users.staff_id],
    references: [staff.id],
  }),
  attachments: many(attachments),
  download_logs: many(download_logs),
  share_links: many(share_links),
  sessions: many(sessions),
}))

export const customersRelations = relations(customers, ({ many }) => ({
  users: many(users),
  bookings: many(bookings),
  reservations: many(reservations),
  reviews: many(reviews),
}))

export const staffRelations = relations(staff, ({ one, many }) => ({
  users: many(users),
  reservations: many(reservations),
  salon: one(salons, {
    fields: [staff.salon_id],
    references: [salons.id],
  }),
  reviews: many(reviews),
  staff_working_hours: many(staff_working_hours),
}))

export const attachmentsRelations = relations(attachments, ({ one, many }) => ({
  user: one(users, {
    fields: [attachments.uploaded_by],
    references: [users.id],
  }),
  salon: one(salons, {
    fields: [attachments.salon_id],
    references: [salons.id],
  }),
  download_logs: many(download_logs),
  share_links: many(share_links),
}))

export const salonsRelations = relations(salons, ({ many }) => ({
  attachments: many(attachments),
  bookings: many(bookings),
  reservations: many(reservations),
  opening_hours: many(opening_hours),
  staff: many(staff),
  services: many(services),
  reviews: many(reviews),
}))

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  salon: one(salons, {
    fields: [bookings.salon_id],
    references: [salons.id],
  }),
  customer: one(customers, {
    fields: [bookings.customer_id],
    references: [customers.id],
  }),
  booking_reservations: many(booking_reservations),
}))

export const booking_reservationsRelations = relations(
  booking_reservations,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [booking_reservations.booking_id],
      references: [bookings.id],
    }),
    reservation: one(reservations, {
      fields: [booking_reservations.reservation_id],
      references: [reservations.id],
    }),
  })
)

export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    booking_reservations: many(booking_reservations),
    salon: one(salons, {
      fields: [reservations.salon_id],
      references: [salons.id],
    }),
    customer: one(customers, {
      fields: [reservations.customer_id],
      references: [customers.id],
    }),
    staff: one(staff, {
      fields: [reservations.staff_id],
      references: [staff.id],
    }),
    service: one(services, {
      fields: [reservations.service_id],
      references: [services.id],
    }),
    reviews: many(reviews),
  })
)

export const servicesRelations = relations(services, ({ one, many }) => ({
  reservations: many(reservations),
  salon: one(salons, {
    fields: [services.salon_id],
    references: [salons.id],
  }),
  service_category: one(service_categories, {
    fields: [services.category_id],
    references: [service_categories.id],
  }),
}))

export const download_logsRelations = relations(download_logs, ({ one }) => ({
  attachment: one(attachments, {
    fields: [download_logs.attachment_id],
    references: [attachments.id],
  }),
  share_link: one(share_links, {
    fields: [download_logs.share_link_id],
    references: [share_links.id],
  }),
  user: one(users, {
    fields: [download_logs.downloaded_by],
    references: [users.id],
  }),
}))

export const share_linksRelations = relations(share_links, ({ one, many }) => ({
  download_logs: many(download_logs),
  attachment: one(attachments, {
    fields: [share_links.attachment_id],
    references: [attachments.id],
  }),
  user: one(users, {
    fields: [share_links.created_by],
    references: [users.id],
  }),
}))

export const opening_hoursRelations = relations(opening_hours, ({ one }) => ({
  salon: one(salons, {
    fields: [opening_hours.salon_id],
    references: [salons.id],
  }),
}))

export const service_categoriesRelations = relations(
  service_categories,
  ({ many }) => ({
    services: many(services),
  })
)

export const reviewsRelations = relations(reviews, ({ one }) => ({
  salon: one(salons, {
    fields: [reviews.salon_id],
    references: [salons.id],
  }),
  customer: one(customers, {
    fields: [reviews.customer_id],
    references: [customers.id],
  }),
  reservation: one(reservations, {
    fields: [reviews.reservation_id],
    references: [reservations.id],
  }),
  staff: one(staff, {
    fields: [reviews.staff_id],
    references: [staff.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}))

export const staff_working_hoursRelations = relations(
  staff_working_hours,
  ({ one }) => ({
    staff: one(staff, {
      fields: [staff_working_hours.staff_id],
      references: [staff.id],
    }),
  })
)
