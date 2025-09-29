#!/usr/bin/env tsx
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import postgres from 'postgres'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env.localhost') })

async function main() {
  console.log('🚀 Starting database reset...')

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  // Create a postgres connection
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    // Drop all tables in cascade mode
    console.log('📝 Dropping all tables...')
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `

    for (const table of tables) {
      console.log(`  Dropping table: ${table.tablename}`)
      await sql.unsafe(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`)
    }

    // Drop all types
    console.log('📝 Dropping all custom types...')
    const types = await sql`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `

    for (const type of types) {
      console.log(`  Dropping type: ${type.typname}`)
      await sql.unsafe(`DROP TYPE IF EXISTS "${type.typname}" CASCADE`)
    }

    // Drop drizzle migration table if exists
    await sql`DROP TABLE IF EXISTS drizzle_migrations CASCADE`

    console.log('✅ Database reset completed successfully!')
  } catch (error) {
    console.error('❌ Reset failed:', error)
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
