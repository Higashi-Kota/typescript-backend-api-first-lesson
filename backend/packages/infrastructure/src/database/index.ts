import { env } from '@beauty-salon-backend/config'
import * as schema from '@beauty-salon-backend/database'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })
export type Database = typeof db

export const getDb = () => db
