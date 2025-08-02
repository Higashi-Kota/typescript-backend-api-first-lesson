/**
 * Domain to DB Mappers
 * ドメインモデルからDBエンティティへの変換
 */

// Customer Mappers
export {
  mapDomainCustomerToDbInsert,
  mapDomainCustomerToDbUpdate,
  mapPartialUpdateToDb,
  type DbNewCustomer,
  type DbUpdateCustomer,
} from './customer.mapper.js'

// User Mappers
export {
  mapDomainUserToDbInsert,
  mapDomainUserToDbUpdate,
  mapPartialUserUpdateToDb,
  type DbNewUser,
  type DbUpdateUser,
} from './user.mapper.js'

// Salon Mappers
export {
  mapDomainSalonToDbInsert,
  mapDomainSalonToDbUpdate,
  mapPartialSalonUpdateToDb,
  type DbNewSalon,
  type DbUpdateSalon,
} from './salon.mapper.js'

// TODO: Add other entity mappers as they are migrated
// - Reservation
// - Review
// - Staff
// - Service
