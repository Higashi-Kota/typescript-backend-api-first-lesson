#!/usr/bin/env tsx
import * as fs from 'node:fs'
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

// Parse command line arguments
const args = process.argv.slice(2)
const sqlFile = args[0]

async function main() {
  console.log('🚀 Starting database migration...')

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  // Create a postgres connection
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    if (sqlFile) {
      // Single SQL file execution mode
      await executeSingleSqlFile(sql, sqlFile)
    } else {
      // Migration mode - execute all SQL files in sql/migrations folder, then drizzle migrations
      await executeAllSqlMigrations(sql)
      await executeDrizzleMigrations(sql)
    }

    console.log('✅ All migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    // Close the connection
    await sql.end()
  }
}

/**
 * Execute a single SQL file
 */
async function executeSingleSqlFile(sql: postgres.Sql, sqlFile: string) {
  console.log(`📄 Executing single SQL file: ${sqlFile}`)

  const sqlPath = path.isAbsolute(sqlFile)
    ? sqlFile
    : path.join(process.cwd(), sqlFile)

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`)
    process.exit(1)
  }

  // Read and execute SQL file
  const sqlContent = fs.readFileSync(sqlPath, 'utf8')
  console.log(`📝 Executing SQL file (${sqlContent.length} characters)...`)

  await sql.unsafe(sqlContent)
  console.log('✅ SQL file executed successfully!')
}

/**
 * Execute all SQL migration files in ascending order
 */
async function executeAllSqlMigrations(sql: postgres.Sql) {
  const sqlMigrationsDir = path.join(__dirname, '../../sql/migrations')

  if (!fs.existsSync(sqlMigrationsDir)) {
    console.log('📁 No sql/migrations directory found, skipping SQL migrations')
    return
  }

  // Get all SQL files and sort them by filename (ascending order)
  const sqlFiles = fs
    .readdirSync(sqlMigrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  if (sqlFiles.length === 0) {
    console.log('📁 No SQL migration files found in sql/migrations directory')
    return
  }

  console.log(`📝 Found ${sqlFiles.length} SQL migration files`)
  console.log('🔄 Executing SQL migrations in ascending order...')

  for (const file of sqlFiles) {
    const filePath = path.join(sqlMigrationsDir, file)
    console.log(`  📄 Executing: ${file}`)

    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8')
      await sql.unsafe(sqlContent)
      console.log(`  ✅ Completed: ${file}`)
    } catch (error) {
      console.error(`  ❌ Failed to execute ${file}:`, error)
      throw error
    }
  }

  console.log('✅ All SQL migrations completed successfully!')
}

/**
 * Execute Drizzle ORM migrations
 */
async function executeDrizzleMigrations(sql: postgres.Sql) {
  const drizzleMigrationsDir = path.join(__dirname, '../../migrations')

  if (!fs.existsSync(drizzleMigrationsDir)) {
    console.log(
      '📁 No drizzle migrations directory found, skipping Drizzle migrations'
    )
    return
  }

  // Create drizzle instance
  const db = drizzle(sql)

  console.log('🔄 Running Drizzle ORM migrations...')
  console.log(`📝 Migrations from: ${drizzleMigrationsDir}`)

  await migrate(db, {
    migrationsFolder: drizzleMigrationsDir,
  })

  console.log('✅ Drizzle migrations completed successfully!')
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Migration Script

Usage:
  pnpm db:migrate [sql-file-path]     # Execute specific SQL file
  pnpm db:migrate                     # Execute all migrations

Arguments:
  sql-file-path   Optional path to a specific SQL file to execute
                  Can be absolute or relative to current directory

Migration Order (when no specific file provided):
  1. Execute all SQL files in sql/migrations/ (ascending filename order)
  2. Execute Drizzle ORM migrations from migrations/

Examples:
  pnpm db:migrate                                    # Run all migrations
  pnpm db:migrate ./sql/migrations/fix_users.sql    # Run specific SQL file
  pnpm db:migrate /absolute/path/to/migration.sql   # Run specific SQL file (absolute path)
`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
