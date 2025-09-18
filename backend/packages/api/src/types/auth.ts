import type { UserRole } from '../middleware/auth.middleware'

export type AuthenticatedUser = {
  id: string
  email: string
  role: UserRole
}
