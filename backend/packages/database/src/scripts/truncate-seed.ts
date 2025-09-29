#!/usr/bin/env tsx

import { getDatabaseUrl, loadEnvConfig } from '@beauty-salon-backend/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema'
import { truncateAll } from '../seeds/index'

// Load environment-specific configuration
const environment = loadEnvConfig()

// Get database URL from environment
const databaseUrl = getDatabaseUrl()

async function main() {
  console.log(
    `🗑️  Truncating all database tables in ${environment.toUpperCase()} environment...`,
  )
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
