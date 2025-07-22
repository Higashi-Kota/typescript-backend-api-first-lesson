import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'

export interface TestContext {
  schemaName: string
  cleanup: () => Promise<void>
}

export class SchemaIsolation {
  // biome-ignore lint/suspicious/noExplicitAny: Database type comes from external package
  constructor(private readonly db: any) {} // Using any to avoid circular dependency

  async createIsolatedSchema(): Promise<string> {
    // For now, always use public schema with proper cleanup
    // This is simpler and more reliable than schema-based isolation with Drizzle
    await this.cleanupPublicSchema()
    await this.applyMigrations('public')
    return 'public'
  }

  async cleanupPublicSchema(): Promise<void> {
    // Drop all tables using CASCADE to handle foreign keys
    try {
      // Get all tables in public schema
      const tables = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `)

      // Drop each table with CASCADE
      for (const table of tables) {
        try {
          await this.db.execute(
            sql`DROP TABLE IF EXISTS ${sql.identifier(table.table_name)} CASCADE`
          )
        } catch (_e) {
          // Ignore errors for individual tables
        }
      }
    } catch (_e) {
      // If we can't get tables, try dropping known tables
      const knownTables = [
        'download_logs',
        'share_links',
        'attachments',
        'trusted_ip_addresses',
        'auth_audit_logs',
        'failed_login_attempts',
        'user_2fa_secrets',
        'user_sessions',
        'email_verification_tokens',
        'password_reset_tokens',
        'reviews',
        'booking_reservations',
        'bookings',
        'reservations',
        'services',
        'service_categories',
        'staff_working_hours',
        'staff',
        'opening_hours',
        'sessions',
        'users',
        'customers',
        'salons',
      ]

      for (const table of knownTables) {
        try {
          await this.db.execute(
            sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`
          )
        } catch (_e) {
          // Ignore errors
        }
      }
    }

    // Drop all types
    try {
      const types = await this.db.execute(sql`
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'e'
      `)

      for (const type of types) {
        try {
          await this.db.execute(
            sql`DROP TYPE IF EXISTS ${sql.identifier(type.typname)} CASCADE`
          )
        } catch (_e) {
          // Ignore errors
        }
      }
    } catch (_e) {
      // If we can't get types, try dropping known types
      const knownTypes = [
        'file_type',
        'two_factor_status',
        'user_account_status',
        'user_role',
        'booking_status',
        'reservation_status',
        'service_category',
        'day_of_week',
      ]

      for (const type of knownTypes) {
        try {
          await this.db.execute(
            sql`DROP TYPE IF EXISTS ${sql.identifier(type)} CASCADE`
          )
        } catch (_e) {
          // Ignore errors
        }
      }
    }
  }

  async dropSchema(schemaName: string): Promise<void> {
    // If using public schema, just clean it up
    if (schemaName === 'public') {
      await this.cleanupPublicSchema()
    } else {
      // Drop schema and all its contents
      await this.db.execute(
        sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
      )
    }
  }

  async applyMigrations(_schemaName: string): Promise<void> {
    try {
      // Execute SQL files directly since Drizzle migrate isn't working correctly
      // Use relative path from this file to find migrations
      const currentDir = fileURLToPath(new URL('.', import.meta.url))
      const migrationsFolder = resolve(
        currentDir,
        '../../../apps/migration/scripts'
      )

      console.log('Running migrations by executing SQL files directly')
      console.log(`Looking for migrations in: ${migrationsFolder}`)

      // Check if migrations folder exists, if not try alternative paths
      let actualMigrationsFolder = migrationsFolder
      const pathsToTry = [
        migrationsFolder,
        // For CI environment (GitHub Actions)
        resolve(currentDir, '../../../../backend/apps/migration/scripts'),
        // For different project structures
        resolve(process.cwd(), 'backend/apps/migration/scripts'),
        resolve(process.cwd(), 'apps/migration/scripts'),
      ]

      let found = false
      for (const path of pathsToTry) {
        try {
          readdirSync(path)
          actualMigrationsFolder = path
          found = true
          console.log(`Found migrations at: ${path}`)
          break
        } catch (_e) {
          console.log(`Path not found: ${path}`)
        }
      }

      if (!found) {
        throw new Error(
          `Migration folder not found. Tried:\n${pathsToTry.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
        )
      }

      // Get all SQL files in order
      const files = readdirSync(actualMigrationsFolder)
        .filter((f) => f.endsWith('.sql'))
        .sort()

      console.log(`Found migration files: ${files.join(', ')}`)

      // Execute each migration file
      for (const file of files) {
        console.log(`Executing migration: ${file}`)
        const sqlContent = readFileSync(
          join(actualMigrationsFolder, file),
          'utf-8'
        )

        // Split by statement separator and execute each
        const statements = sqlContent.split('--> statement-breakpoint')

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await this.db.execute(sql.raw(statement))
            } catch (error) {
              // Ignore errors about existing types
              if (
                error instanceof Error &&
                error.message?.includes('already exists')
              ) {
                console.log(`Skipping: ${error.message}`)
                continue
              }
              console.error(
                `Error executing statement: ${error instanceof Error ? error.message : String(error)}`
              )
              throw error
            }
          }
        }
      }

      console.log('All migrations executed successfully')

      // Verify tables were created
      const tables = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'sessions', 'auth_audit_logs', 'failed_login_attempts')
        ORDER BY table_name
      `)
      console.log(
        'Tables created:',
        tables.map((t: { table_name: string }) => t.table_name).join(', ')
      )
    } catch (error) {
      console.error('Migration error:', error)
      throw error
    }
  }
}

export class TestEnvironmentWithIsolation {
  private static instance: TestEnvironmentWithIsolation
  private schemaIsolation?: SchemaIsolation

  static async getInstance(): Promise<TestEnvironmentWithIsolation> {
    if (!TestEnvironmentWithIsolation.instance) {
      TestEnvironmentWithIsolation.instance = new TestEnvironmentWithIsolation()
    }
    return TestEnvironmentWithIsolation.instance
  }

  // biome-ignore lint/suspicious/noExplicitAny: Database type comes from external package
  async setupTest(db: any): Promise<TestContext> {
    this.schemaIsolation = new SchemaIsolation(db)

    // Create new isolated schema
    const schemaName = await this.schemaIsolation.createIsolatedSchema()

    return {
      schemaName,
      cleanup: async () => {
        await this.schemaIsolation?.dropSchema(schemaName)
      },
    }
  }
}
