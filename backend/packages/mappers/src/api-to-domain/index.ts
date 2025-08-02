/**
 * API to Domain Mappers
 * APIリクエストからドメインモデルへの変換
 */

// Customer Mappers
export {
  mapCreateCustomerRequest,
  mapUpdateCustomerRequest,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type UpdateCustomerUseCaseInput,
} from './customer.mapper.js'

// TODO: Add other entity mappers as they are migrated
// - Salon
// - Reservation
// - Review
// - Staff
// - Service
