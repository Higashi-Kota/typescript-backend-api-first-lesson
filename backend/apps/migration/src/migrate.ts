import { env } from '@beauty-salon-backend/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function runMigrations() {
  console.log('Running database migrations...')
  console.log('DATABASE_URL:', env.DATABASE_URL)

  const migrationClient = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(migrationClient)

  try {
    // Use absolute path to scripts folder in the migration package
    const migrationsFolder = new URL('../scripts', import.meta.url).pathname
    console.log('Migrations folder:', migrationsFolder)

    await migrate(db, { migrationsFolder })
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
