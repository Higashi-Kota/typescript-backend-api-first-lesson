import type { openingHours, salons } from '@beauty-salon-backend/database'
import type { components, operations } from '@beauty-salon-backend/generated'
import type { Brand, DeepRequired } from '@beauty-salon-backend/utility'

// Brand type for SalonId
export const salonIdBrand: unique symbol = Symbol('SalonId')
export type SalonId = Brand<string, typeof salonIdBrand>
export function toSalonID(raw: string): SalonId {
  return raw as SalonId
}

// API types from generated schemas
export type ApiSalon = components['schemas']['Models.Salon']
export type ApiCreateSalonRequest =
  components['schemas']['Models.CreateSalonRequest']
export type ApiUpdateSalonRequest =
  components['schemas']['Models.UpdateSalonRequest']
export type ApiSalonSummary = components['schemas']['Models.SalonSummary']
export type ApiAddress = components['schemas']['Models.Address']
export type ApiContactInfo = components['schemas']['Models.ContactInfo']
export type ApiOpeningHours = components['schemas']['Models.OpeningHours']
export type ApiBusinessHours = components['schemas']['Models.BusinessHours']

// Database types from Drizzle schema
export type DbSalon = DeepRequired<typeof salons.$inferSelect>
export type DbNewSalon = DeepRequired<Omit<typeof salons.$inferInsert, 'id'>>
export type DbOpeningHours = DeepRequired<typeof openingHours.$inferSelect>
export type DbNewOpeningHours = DeepRequired<
  Omit<typeof openingHours.$inferInsert, 'id'>
>

// Use generated search params from TypeSpec
export type SalonSearchParams = NonNullable<
  operations['SalonCrud_search']['parameters']['query']
>
