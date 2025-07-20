import type { UserRole } from '../middleware/auth.middleware.js'

export type AuthenticatedUser = {
  id: string
  email: string
  role: UserRole
}
