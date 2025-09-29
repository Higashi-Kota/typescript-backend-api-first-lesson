#!/usr/bin/env tsx
import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import * as dotenv from 'dotenv'

const execAsync = promisify(exec)

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env.localhost') })

async function main() {
  console.log('🏗️ Generating setup.sql from current schema...')
  console.log(
    'This will create sql/setup.sql from the current schema definition',
  )
  console.log('')

  try {
    // Run Drizzle Kit export to generate SQL
    console.log('📝 Running drizzle-kit export...')
    const { stdout, stderr } = await execAsync(
      'pnpm drizzle-kit export --dialect postgresql --schema ./src/schema.ts --sql',
      {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
        },
      },
    )

    if (stderr) {
      console.error('Warning:', stderr)
    }

    if (!stdout || stdout.trim().length === 0) {
      throw new Error('No SQL output generated from drizzle-kit export')
    }

    // Add header comment to the generated SQL
    const header = `-- Generated setup.sql from Drizzle ORM schema
-- This file contains the complete database schema including:
-- - All enum types
-- - All tables with columns, constraints, and defaults
-- - All foreign key relationships
-- - All indexes
-- Generated on: ${new Date().toISOString()}
-- Source: backend/packages/database/src/schema.ts

`

    // Prepare the final SQL content
    const finalSql = header + stdout.trim()

    // Write to sql/setup.sql
    const sqlDir = path.resolve(__dirname, '../../sql')
    const setupSqlPath = path.join(sqlDir, 'setup.sql')

    // Ensure sql directory exists
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true })
    }

    fs.writeFileSync(setupSqlPath, finalSql)

    console.log('✅ Successfully generated setup.sql!')
    console.log('')
    console.log(`📄 Output written to: ${setupSqlPath}`)
    console.log(`📊 File size: ${finalSql.length} characters`)
    console.log('📋 Generated from schema: src/schema.ts')
    console.log('')
    console.log('ℹ️  You can now use this file with:')
    console.log('   pnpm db:setup    # Execute the generated setup.sql')
    console.log('   pnpm db:reset    # Reset database and run setup.sql')
  } catch (error) {
    console.error('❌ Failed to generate setup.sql:', error)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
