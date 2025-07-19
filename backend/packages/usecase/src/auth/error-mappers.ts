import type { UserRepositoryError } from '@beauty-salon-backend/domain'

// Map UserRepositoryError to common use case errors
export const mapRepositoryErrorToUserNotFound = (
  _error: UserRepositoryError
): { type: 'userNotFound' } => {
  // For security, we map all repository errors to userNotFound
  // to avoid revealing whether the user exists
  return { type: 'userNotFound' }
}

// Map UserRepositoryError to invalid token error
export const mapRepositoryErrorToInvalidToken = (
  _error: UserRepositoryError
): { type: 'invalidToken' } => {
  // For security, we map all repository errors to invalidToken
  // to avoid revealing details about the system
  return { type: 'invalidToken' }
}

// Map UserRepositoryError for operations that might have alreadyExists
export const mapRepositoryErrorWithAlreadyExists = (
  error: UserRepositoryError
):
  | { type: 'duplicateEmail'; email: string }
  | { type: 'databaseError'; message: string }
  | { type: 'invalidData'; message: string } => {
  switch (error.type) {
    case 'alreadyExists':
      return { type: 'duplicateEmail', email: error.email }
    case 'databaseError':
      return { type: 'databaseError', message: error.message }
    case 'invalidData':
      return { type: 'invalidData', message: error.message }
    case 'notFound':
      // This shouldn't happen in these contexts, but handle it
      return { type: 'databaseError', message: 'Unexpected error' }
  }
}
