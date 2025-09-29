import { env } from '@beauty-salon-backend/config'
import * as schema from '@beauty-salon-backend/database'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// In test environment, don't initialize the database connection immediately
// as testcontainers will provide a dynamic connection string
let db: ReturnType<typeof drizzle> | null = null
let queryClient: ReturnType<typeof postgres> | null = null

if (env.NODE_ENV.value !== 'test') {
  queryClient = postgres(env.DATABASE_URL.value, {
    max: env.DATABASE_POOL_MAX.value,
    idle_timeout: 20,
    connect_timeout: env.DATABASE_CONNECTION_TIMEOUT.value,
  })
  db = drizzle(queryClient, { schema })
}

export type Database = ReturnType<typeof drizzle>

export const getDb = () => {
  if (!db) {
    if (env.NODE_ENV.value === 'test') {
      // In test environment, this should not be called
      // Tests should provide their own database instance
      throw new Error(
        'Database not initialized. In test environment, use test-provided database instance.',
      )
    }
    // Initialize lazily if needed in non-test environments
    queryClient = postgres(env.DATABASE_URL.value, {
      max: env.DATABASE_POOL_MAX.value,
      idle_timeout: 20,
      connect_timeout: env.DATABASE_CONNECTION_TIMEOUT.value,
    })
    db = drizzle(queryClient, { schema })
  }
  return db
}

// Export db conditionally for backward compatibility
export { db }
