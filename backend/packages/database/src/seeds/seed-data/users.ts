import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export interface UserSeedResult {
  userIds: string[]
  adminUserId: string
  managerUserId: string
  staffUserIds: string[]
  customerUserIds: string[]
}

export async function seedUsers(
  db: PostgresJsDatabase<typeof schema>,
): Promise<UserSeedResult> {
  // Create admin user
  const adminUser = await db
    .insert(schema.users)
    .values({
      email: 'admin@beautysalon.jp',
      passwordHash:
        '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK', // password: "password123"
      role: 'admin',
      status: 'active',
      emailVerified: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      permissions: ['all'],
      metadata: { createdBy: 'seed' },
    })
    .returning({ id: schema.users.id })

  // Create manager user
  const managerUser = await db
    .insert(schema.users)
    .values({
      email: 'manager@beautysalon.jp',
      passwordHash:
        '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
      role: 'manager',
      status: 'active',
      emailVerified: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      permissions: ['manage_staff', 'manage_bookings', 'view_reports'],
      metadata: { createdBy: 'seed' },
    })
    .returning({ id: schema.users.id })

  // Create staff users
  const staffUsers = await db
    .insert(schema.users)
    .values([
      {
        email: 'stylist1@beautysalon.jp',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'staff',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: ['view_bookings', 'manage_own_schedule'],
        metadata: { createdBy: 'seed' },
      },
      {
        email: 'stylist2@beautysalon.jp',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'staff',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: ['view_bookings', 'manage_own_schedule'],
        metadata: { createdBy: 'seed' },
      },
      {
        email: 'therapist@beautysalon.jp',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'staff',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: ['view_bookings', 'manage_own_schedule'],
        metadata: { createdBy: 'seed' },
      },
    ])
    .returning({ id: schema.users.id })

  // Create customer users
  const customerUsers = await db
    .insert(schema.users)
    .values([
      {
        email: 'customer1@example.com',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: [],
        metadata: { createdBy: 'seed' },
      },
      {
        email: 'customer2@example.com',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: [],
        metadata: { createdBy: 'seed' },
      },
      {
        email: 'customer3@example.com',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
        permissions: [],
        metadata: { createdBy: 'seed' },
      },
      {
        email: 'vip.customer@example.com',
        passwordHash:
          '$2b$10$K7L1OJ0TfmQjGt2RGk/f9eJgzgVpFZhXXvKqKvKqKvKqKvKqKvKqK',
        role: 'customer',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: true,
        twoFactorSecret: 'DUMMY_SECRET_FOR_SEED',
        failedLoginAttempts: 0,
        permissions: [],
        metadata: { createdBy: 'seed', vip: true },
      },
    ])
    .returning({ id: schema.users.id })

  const adminUserId = adminUser[0]?.id ?? ''
  const managerUserId = managerUser[0]?.id ?? ''
  const staffUserIds = staffUsers.map((u) => u.id)
  const customerUserIds = customerUsers.map((u) => u.id)
  const allUserIds = [
    adminUserId,
    managerUserId,
    ...staffUserIds,
    ...customerUserIds,
  ]

  return {
    userIds: allUserIds,
    adminUserId,
    managerUserId,
    staffUserIds,
    customerUserIds,
  }
}
