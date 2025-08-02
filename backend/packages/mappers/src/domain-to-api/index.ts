/**
 * Domain to API Mappers
 * ドメインモデルからAPIレスポンスへの変換
 */

// Customer Mappers
export {
  mapCustomerToResponse,
  mapCustomerListToResponse,
  mapCustomerProfileToResponse,
  mapCreateCustomerErrorToResponse,
  mapUpdateCustomerErrorToResponse,
  mapCreateCustomerUseCaseErrorToResponse,
  mapUpdateCustomerUseCaseErrorToResponse,
  type CreateCustomerError,
  type UpdateCustomerError,
} from './customer.mapper.js'

// TODO: Add other entity mappers as they are migrated
// - Salon
// - Reservation
// - Review
// - Staff
// - Service
