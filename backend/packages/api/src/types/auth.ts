import type { UserId } from '@beauty-salon-backend/domain'
import type { UserRole } from '../middleware/auth.middleware.js'

export type AuthenticatedUser = {
  id: UserId
  email: string
  role: UserRole
}
