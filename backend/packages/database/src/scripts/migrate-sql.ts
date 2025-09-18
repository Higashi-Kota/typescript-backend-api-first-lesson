#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import postgres from 'postgres'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env') })

async function main() {
  const sqlFile = process.argv[2]

  if (!sqlFile) {
    console.error('❌ Please provide a SQL file path as argument')
    console.log('Usage: pnpm migration:sql <path-to-sql-file>')
    process.exit(1)
  }

  const sqlPath = path.isAbsolute(sqlFile)
    ? sqlFile
    : path.join(process.cwd(), sqlFile)

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`)
    process.exit(1)
  }

  console.log('🚀 Starting manual SQL migration...')
  console.log('📄 SQL file:', sqlPath)

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  // Create a postgres connection
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    // Read SQL file
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log(`📝 Executing SQL file (${sqlContent.length} characters)...`)

    // Execute SQL
    await sql.unsafe(sqlContent)

    console.log('✅ SQL migration completed successfully!')
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
