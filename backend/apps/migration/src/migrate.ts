import { env } from '@beauty-salon-backend/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ProgrammaticMigration } from './programmatic-migration.js'

async function runMigrations() {
  console.log('Running database migrations...')
  console.log('DATABASE_URL:', env.DATABASE_URL)

  const migrationClient = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(migrationClient)

  try {
    const migration = new ProgrammaticMigration(db)

    // Run the migration with default options (public schema)
    await migration.up()

    console.log('Migrations completed successfully')
    await migrationClient.end()
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    await migrationClient.end()
    process.exit(1)
  }
}

runMigrations()
