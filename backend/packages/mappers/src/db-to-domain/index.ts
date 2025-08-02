/**
 * DB to Domain Mappers
 * DBエンティティからドメインモデルへの変換
 */

// Customer Mappers
export {
  mapDbCustomerToDomain,
  mapDecryptedDbCustomerToDomain,
  mapDbCustomersToDomain,
  type DbCustomer,
} from './customer.mapper.js'

// User Mappers
export {
  mapDbUserToDomain,
  mapDbUsersToDomain,
  type DbUser,
} from './user.mapper.js'

// Salon Mappers
export {
  mapDbSalonToDomain,
  mapDbSalonsToDomain,
  type DbSalon,
} from './salon.mapper.js'

// TODO: Add other entity mappers as they are migrated
// - Reservation
// - Review
// - Staff
// - Service
