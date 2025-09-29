#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDatabaseUrl, loadEnvConfig } from '@beauty-salon-backend/config'
import postgres from 'postgres'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment-specific configuration
const environment = loadEnvConfig()

async function main() {
  console.log(
    `🚀 Starting database setup in ${environment.toUpperCase()} environment...`,
  )

  // Get database URL from environment
  const databaseUrl = getDatabaseUrl()

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  // Create a postgres connection
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    // Read setup SQL file
    const sqlPath = path.join(__dirname, '../../sql/setup.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Remove the --> statement-breakpoint comments from the SQL
    const cleanedSql = sqlContent.replace(/-->\s*statement-breakpoint/g, '')

    console.log(`📝 Executing setup SQL (${cleanedSql.length} characters)...`)

    // Execute SQL
    await sql.unsafe(cleanedSql)

    console.log('✅ Database setup completed successfully!')
  } catch (error) {
    console.error('❌ Setup failed:', error)
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
