#!/usr/bin/env tsx
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env') })

async function main() {
  console.log('🚀 Starting database migration...')

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  // Create a postgres connection
  const sql = postgres(databaseUrl, { max: 1 })

  // Create drizzle instance
  const db = drizzle(sql)

  try {
    // Run migrations
    console.log(
      '📝 Running migrations from:',
      path.join(__dirname, '../../migrations')
    )
    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../../migrations'),
    })
    console.log('✅ Migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    // Close the connection
    await sql.end()
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
