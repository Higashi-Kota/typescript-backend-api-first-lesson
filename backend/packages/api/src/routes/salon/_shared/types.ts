import type { components, operations } from '@beauty-salon-backend/generated'

// ============================================================================
// Operation Types - Maps to API endpoints
// ============================================================================
export type ListSalonsOperation = operations['SalonCrud_list']
export type GetSalonOperation = operations['SalonCrud_get']
export type DeleteSalonOperation = operations['SalonCrud_delete']
export type CreateSalonOperation = operations['SalonCrud_create']
export type UpdateSalonOperation = operations['SalonCrud_update']
export type SearchSalonsOperation = operations['SalonCrud_search']

// ============================================================================
// Model Types - Core domain models
// ============================================================================
export type Salon = components['schemas']['Models.Salon']
export type CreateSalonRequest =
  components['schemas']['Models.CreateSalonRequest']
export type UpdateSalonRequest =
  components['schemas']['Models.UpdateSalonRequest']
export type ServiceCategoryType =
  components['schemas']['Models.ServiceCategoryType']

// ============================================================================
// Response Types - API response structures
// ============================================================================
export type CursorPaginationResponse<T> = {
  data: T[]
  meta: components['schemas']['Models.PaginationMeta']
  links: components['schemas']['Models.PaginationLinks']
}

export type GetSalonResponse = Extract<
  GetSalonOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>

export type CreateSalonResponse = Extract<
  CreateSalonOperation['responses']['201']['content']['application/json'],
  { data: unknown }
>

export type UpdateSalonResponse = Extract<
  UpdateSalonOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>

export type DeleteSalonResponse =
  DeleteSalonOperation['responses']['204']['content']

export type SearchSalonsResponse = Extract<
  SearchSalonsOperation['responses']['200']['content']['application/json'],
  { results: unknown }
>

// ============================================================================
// Query Parameter Types
// ============================================================================
export type ListSalonsQuery = NonNullable<
  ListSalonsOperation['parameters']['query']
>
export type SearchSalonsQuery = NonNullable<
  SearchSalonsOperation['parameters']['query']
>

// ============================================================================
// Error Types
// ============================================================================
export type ErrorResponse = components['schemas']['Models.ProblemDetails']
