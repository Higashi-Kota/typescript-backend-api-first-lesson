#!/usr/bin/env tsx

import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema'
import { truncateAll } from '../seeds/index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env.localhost') })

// Parse DATABASE_URL or use individual environment variables
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
    process.env.POSTGRES_PASSWORD || 'postgres'
  }@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${
    process.env.POSTGRES_DB || 'beauty_salon'
  }`

async function main() {
  console.log('🗑️  Truncating all database tables...')
  console.log('⚠️  This will remove all data but preserve the schema')
  console.log('')

  const sql = postgres(databaseUrl)
  const db = drizzle(sql, { schema })

  try {
    await truncateAll(db)

    console.log('')
    console.log('✅ Database truncation completed successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ Database truncation failed:', error)
    await sql.end()
    process.exit(1)
  }
}

// Show help if requested
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Truncation Script

Usage: pnpm db:truncate

This script clears all data from all tables while preserving the database schema.
It handles foreign key constraints properly during the truncation process.

Examples:
  pnpm db:truncate              # Clear all data from database
`)
  process.exit(0)
}

main()
