import { relations } from 'drizzle-orm/relations'
import {
  bookingServices,
  bookingStatusHistories,
  bookings,
  customerAllergies,
  customerPoints,
  customerPreferences,
  customers,
  dailySummaries,
  inventory,
  inventoryTransactions,
  membershipTiers,
  openingHours,
  paymentMethods,
  paymentTransactions,
  products,
  reviews,
  sales,
  salesDetails,
  salons,
  serviceCategories,
  serviceOptions,
  services,
  sessions,
  staff,
  staffPerformances,
  staffSchedules,
  staffSkills,
  treatmentMaterials,
  treatmentPhotos,
  treatmentRecords,
  users,
} from './schema'

export const staffPerformancesRelations = relations(
  staffPerformances,
  ({ one }) => ({
    staff: one(staff, {
      fields: [staffPerformances.staffId],
      references: [staff.id],
    }),
  }),
)

export const staffRelations = relations(staff, ({ one, many }) => ({
  staffPerformances: many(staffPerformances),
  reviews: many(reviews),
  salesDetails: many(salesDetails),
  sales: many(sales),
  treatmentRecords: many(treatmentRecords),
  bookingServices: many(bookingServices),
  bookings: many(bookings),
  customerPreferences: many(customerPreferences),
  salon: one(salons, {
    fields: [staff.salonId],
    references: [salons.id],
  }),
  users: many(users),
  staffSkills: many(staffSkills),
  staffSchedules: many(staffSchedules),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  customer: one(customers, {
    fields: [users.customerId],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [users.staffId],
    references: [staff.id],
  }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  salon: one(salons, {
    fields: [reviews.salonId],
    references: [salons.id],
  }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  staff: one(staff, {
    fields: [reviews.staffId],
    references: [staff.id],
  }),
}))

export const salonsRelations = relations(salons, ({ many }) => ({
  reviews: many(reviews),
  sales: many(sales),
  paymentMethods: many(paymentMethods),
  inventoryTransactions: many(inventoryTransactions),
  inventories: many(inventory),
  products: many(products),
  bookings: many(bookings),
  services: many(services),
  serviceCategories: many(serviceCategories),
  openingHours: many(openingHours),
  membershipTiers: many(membershipTiers),
  staff: many(staff),
  dailySummaries: many(dailySummaries),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  reviews: many(reviews),
  sales: many(sales),
  treatmentRecords: many(treatmentRecords),
  bookings: many(bookings),
  customerPreferences: many(customerPreferences),
  customerPoints: many(customerPoints),
  customerAllergies: many(customerAllergies),
  users: many(users),
  customer: one(customers, {
    fields: [customers.referredBy],
    references: [customers.id],
    relationName: 'customers_referredBy_customers_id',
  }),
  customers: many(customers, {
    relationName: 'customers_referredBy_customers_id',
  }),
}))

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  reviews: many(reviews),
  sales: many(sales),
  bookingStatusHistories: many(bookingStatusHistories),
  treatmentRecords: many(treatmentRecords),
  bookingServices: many(bookingServices),
  salon: one(salons, {
    fields: [bookings.salonId],
    references: [salons.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [bookings.staffId],
    references: [staff.id],
  }),
}))

export const salesDetailsRelations = relations(salesDetails, ({ one }) => ({
  sale: one(sales, {
    fields: [salesDetails.saleId],
    references: [sales.id],
  }),
  staff: one(staff, {
    fields: [salesDetails.staffId],
    references: [staff.id],
  }),
}))

export const salesRelations = relations(sales, ({ one, many }) => ({
  salesDetails: many(salesDetails),
  paymentTransactions: many(paymentTransactions),
  salon: one(salons, {
    fields: [sales.salonId],
    references: [salons.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [sales.staffId],
    references: [staff.id],
  }),
  booking: one(bookings, {
    fields: [sales.bookingId],
    references: [bookings.id],
  }),
}))

export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    sale: one(sales, {
      fields: [paymentTransactions.saleId],
      references: [sales.id],
    }),
    paymentMethod: one(paymentMethods, {
      fields: [paymentTransactions.paymentMethodId],
      references: [paymentMethods.id],
    }),
  }),
)

export const paymentMethodsRelations = relations(
  paymentMethods,
  ({ one, many }) => ({
    paymentTransactions: many(paymentTransactions),
    salon: one(salons, {
      fields: [paymentMethods.salonId],
      references: [salons.id],
    }),
  }),
)

export const inventoryTransactionsRelations = relations(
  inventoryTransactions,
  ({ one }) => ({
    salon: one(salons, {
      fields: [inventoryTransactions.salonId],
      references: [salons.id],
    }),
    product: one(products, {
      fields: [inventoryTransactions.productId],
      references: [products.id],
    }),
    inventory: one(inventory, {
      fields: [inventoryTransactions.inventoryId],
      references: [inventory.id],
    }),
  }),
)

export const productsRelations = relations(products, ({ one, many }) => ({
  inventoryTransactions: many(inventoryTransactions),
  inventories: many(inventory),
  salon: one(salons, {
    fields: [products.salonId],
    references: [salons.id],
  }),
  treatmentMaterials: many(treatmentMaterials),
}))

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  inventoryTransactions: many(inventoryTransactions),
  salon: one(salons, {
    fields: [inventory.salonId],
    references: [salons.id],
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}))

export const bookingStatusHistoriesRelations = relations(
  bookingStatusHistories,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [bookingStatusHistories.bookingId],
      references: [bookings.id],
    }),
  }),
)

export const treatmentPhotosRelations = relations(
  treatmentPhotos,
  ({ one }) => ({
    treatmentRecord: one(treatmentRecords, {
      fields: [treatmentPhotos.treatmentRecordId],
      references: [treatmentRecords.id],
    }),
  }),
)

export const treatmentRecordsRelations = relations(
  treatmentRecords,
  ({ one, many }) => ({
    treatmentPhotos: many(treatmentPhotos),
    treatmentMaterials: many(treatmentMaterials),
    booking: one(bookings, {
      fields: [treatmentRecords.bookingId],
      references: [bookings.id],
    }),
    customer: one(customers, {
      fields: [treatmentRecords.customerId],
      references: [customers.id],
    }),
    staff: one(staff, {
      fields: [treatmentRecords.staffId],
      references: [staff.id],
    }),
  }),
)

export const treatmentMaterialsRelations = relations(
  treatmentMaterials,
  ({ one }) => ({
    treatmentRecord: one(treatmentRecords, {
      fields: [treatmentMaterials.treatmentRecordId],
      references: [treatmentRecords.id],
    }),
    product: one(products, {
      fields: [treatmentMaterials.productId],
      references: [products.id],
    }),
  }),
)

export const bookingServicesRelations = relations(
  bookingServices,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [bookingServices.bookingId],
      references: [bookings.id],
    }),
    service: one(services, {
      fields: [bookingServices.serviceId],
      references: [services.id],
    }),
    staff: one(staff, {
      fields: [bookingServices.staffId],
      references: [staff.id],
    }),
  }),
)

export const servicesRelations = relations(services, ({ one, many }) => ({
  bookingServices: many(bookingServices),
  serviceOptions: many(serviceOptions),
  salon: one(salons, {
    fields: [services.salonId],
    references: [salons.id],
  }),
  serviceCategory: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}))

export const serviceOptionsRelations = relations(serviceOptions, ({ one }) => ({
  service: one(services, {
    fields: [serviceOptions.serviceId],
    references: [services.id],
  }),
}))

export const serviceCategoriesRelations = relations(
  serviceCategories,
  ({ one, many }) => ({
    services: many(services),
    salon: one(salons, {
      fields: [serviceCategories.salonId],
      references: [salons.id],
    }),
    serviceCategory: one(serviceCategories, {
      fields: [serviceCategories.parentId],
      references: [serviceCategories.id],
      relationName: 'serviceCategories_parentId_serviceCategories_id',
    }),
    serviceCategories: many(serviceCategories, {
      relationName: 'serviceCategories_parentId_serviceCategories_id',
    }),
  }),
)

export const openingHoursRelations = relations(openingHours, ({ one }) => ({
  salon: one(salons, {
    fields: [openingHours.salonId],
    references: [salons.id],
  }),
}))

export const membershipTiersRelations = relations(
  membershipTiers,
  ({ one }) => ({
    salon: one(salons, {
      fields: [membershipTiers.salonId],
      references: [salons.id],
    }),
  }),
)

export const customerPreferencesRelations = relations(
  customerPreferences,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerPreferences.customerId],
      references: [customers.id],
    }),
    staff: one(staff, {
      fields: [customerPreferences.preferredStaffId],
      references: [staff.id],
    }),
  }),
)

export const customerPointsRelations = relations(customerPoints, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPoints.customerId],
    references: [customers.id],
  }),
}))

export const customerAllergiesRelations = relations(
  customerAllergies,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerAllergies.customerId],
      references: [customers.id],
    }),
  }),
)

export const staffSkillsRelations = relations(staffSkills, ({ one }) => ({
  staff: one(staff, {
    fields: [staffSkills.staffId],
    references: [staff.id],
  }),
}))

export const staffSchedulesRelations = relations(staffSchedules, ({ one }) => ({
  staff: one(staff, {
    fields: [staffSchedules.staffId],
    references: [staff.id],
  }),
}))

export const dailySummariesRelations = relations(dailySummaries, ({ one }) => ({
  salon: one(salons, {
    fields: [dailySummaries.salonId],
    references: [salons.id],
  }),
}))
