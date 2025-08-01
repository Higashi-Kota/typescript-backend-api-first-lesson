import { env } from '@beauty-salon-backend/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })
export type Database = typeof db

export const getDb = () => db

// Export all database schema and relations
export * from './schema'
export * from './relations'
