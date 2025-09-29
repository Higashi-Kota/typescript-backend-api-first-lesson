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
  console.log('🔍 Starting database introspection...')
  console.log('This will generate schema.ts and relations.ts from the database')
  console.log('')

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')) // Hide password in logs

  try {
    // Run Drizzle introspection
    console.log('📝 Running drizzle-kit introspect...')
    const { stdout, stderr } = await execAsync('pnpm drizzle-kit introspect', {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    })

    if (stdout) {
      console.log(stdout)
    }
    if (stderr) {
      console.error(stderr)
    }

    // Move generated files to src directory
    const migrationsDir = path.resolve(__dirname, '../../migrations')
    const srcDir = path.resolve(__dirname, '..')

    // Check if migration files were generated
    if (fs.existsSync(path.join(migrationsDir, 'schema.ts'))) {
      console.log('📦 Moving generated schema.ts to src/schema.ts...')
      const schemaContent = fs.readFileSync(
        path.join(migrationsDir, 'schema.ts'),
        'utf8',
      )
      fs.writeFileSync(path.join(srcDir, 'schema.ts'), schemaContent)
    }

    if (fs.existsSync(path.join(migrationsDir, 'relations.ts'))) {
      console.log('📦 Moving generated relations.ts to src/relations.ts...')
      const relationsContent = fs.readFileSync(
        path.join(migrationsDir, 'relations.ts'),
        'utf8',
      )
      fs.writeFileSync(path.join(srcDir, 'relations.ts'), relationsContent)
    }

    // Clean up migrations directory if it was created
    if (fs.existsSync(migrationsDir)) {
      console.log('🧹 Cleaning up temporary migrations directory...')
      fs.rmSync(migrationsDir, { recursive: true, force: true })
    }

    console.log('✅ Introspection completed successfully!')
    console.log('')
    console.log('Generated files:')
    console.log('  - backend/packages/database/src/schema.ts')
    console.log('  - backend/packages/database/src/relations.ts')
  } catch (error) {
    console.error('❌ Introspection failed:', error)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
