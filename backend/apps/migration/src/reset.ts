import { env } from '@beauty-salon-backend/config'
import postgres from 'postgres'

async function resetDatabase() {
  console.log('Resetting database...')

  const sql = postgres(env.DATABASE_URL, { max: 1 })

  try {
    // Drop all tables
    await sql`DROP SCHEMA public CASCADE`
    await sql`CREATE SCHEMA public`
    await sql`GRANT ALL ON SCHEMA public TO postgres`
    await sql`GRANT ALL ON SCHEMA public TO public`

    console.log('Database reset successfully')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('Database reset failed:', error)
    await sql.end()
    process.exit(1)
  }
}

resetDatabase()
