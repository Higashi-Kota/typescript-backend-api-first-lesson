#!/usr/bin/env tsx
import { getDatabaseUrl, loadEnvConfig } from '@beauty-salon-backend/config'
import postgres from 'postgres'

// Load environment-specific configuration
const environment = loadEnvConfig()

async function main() {
  console.log(
    `🚀 Starting database reset in ${environment.toUpperCase()} environment...`,
  )

  // Get database URL from environment
  const databaseUrl = getDatabaseUrl()

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
