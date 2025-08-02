import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export interface MigrationOptions {
  schemaName?: string
}

export class ProgrammaticMigration {
  constructor(private readonly db: PostgresJsDatabase) {}

  /**
   * Get the path to the scripts directory
   */
  private getScriptsPath(): string {
    const currentFile = fileURLToPath(import.meta.url)
    const currentDir = dirname(currentFile)

    // Try multiple possible locations for the scripts directory
    const possiblePaths = [
      join(currentDir, '../scripts'), // When running from dist
      join(currentDir, 'scripts'), // When bundled
      join(currentDir, '../../scripts'), // From nested dist directory
      join(currentDir, '../../../apps/migration/scripts'), // From test-utils context
      join(currentDir, '../../../apps/migration/dist/scripts'), // From test-utils context (dist)
    ]

    // Find the first existing path
    for (const path of possiblePaths) {
      try {
        const sqlFile = join(path, '20250730_000001_initial_schema.sql')
        readFileSync(sqlFile, 'utf-8')
        return path
      } catch {
        // Continue to next path
      }
    }

    // If no path found, return the default and let it fail with a descriptive error
    return join(currentDir, '../scripts')
  }

  /**
   * Create schema and set search path
   */
  private async setupSchema(schemaName: string): Promise<void> {
    if (schemaName !== 'public') {
      // Create schema if it doesn't exist
      await this.db.execute(
        sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
      )
    }

    // Set search path for the session
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
  }

  /**
   * Create all enums in the current schema
   */
  private async createEnums(schemaName: string): Promise<void> {
    // Ensure search path is set
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )

    // Create enums using raw SQL - they'll be created in the current schema
    const enumSql = `
      -- Drop existing types if they exist
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS day_of_week CASCADE;
      DROP TYPE IF EXISTS reservation_status CASCADE;
      DROP TYPE IF EXISTS service_category CASCADE;
      DROP TYPE IF EXISTS two_factor_status CASCADE;
      DROP TYPE IF EXISTS user_account_status CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS file_type CASCADE;

      -- Create enum types
      CREATE TYPE booking_status AS ENUM('draft', 'confirmed', 'cancelled', 'completed', 'no_show');
      CREATE TYPE day_of_week AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
      CREATE TYPE reservation_status AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
      CREATE TYPE service_category AS ENUM('cut', 'color', 'perm', 'treatment', 'spa', 'other');
      CREATE TYPE two_factor_status AS ENUM('disabled', 'pending', 'enabled');
      CREATE TYPE user_account_status AS ENUM('active', 'unverified', 'locked', 'suspended', 'deleted');
      CREATE TYPE user_role AS ENUM('customer', 'staff', 'admin');
      CREATE TYPE file_type AS ENUM('image', 'document', 'other');
    `

    try {
      await this.db.execute(sql.raw(enumSql))
    } catch (error) {
      console.error('Failed to create enums:', error)
      throw error
    }
  }

  /**
   * Create all tables and constraints
   */
  private async createTables(schemaName: string): Promise<void> {
    // Ensure search path is set
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
    // Read the migration SQL file
    const scriptsPath = this.getScriptsPath()
    const migrationPath = join(
      scriptsPath,
      '20250730_000001_initial_schema.sql'
    )
    let migrationSql = readFileSync(migrationPath, 'utf-8')

    // Remove all schema qualifiers - we're already in the correct search path
    migrationSql = migrationSql
      // Remove schema from type definitions
      .replace(/"public"\./g, '')
      // Remove schema from foreign key references in table definitions
      .replace(/REFERENCES\s+"public"\./g, 'REFERENCES ')
      // Remove schema from ALTER TABLE foreign key constraints
      .replace(/REFERENCES\s+"public"\."(\w+)"/g, 'REFERENCES "$1"')
      // Skip enum creation (we already created them)
      .replace(/DROP TYPE IF EXISTS[^;]+;/g, '')
      .replace(/CREATE TYPE[^;]+;/g, '')

    // Execute the cleaned migration SQL
    await this.db.execute(sql.raw(migrationSql))
  }

  /**
   * Run the migration to set up the database schema
   */
  async up(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName ?? 'public'

    try {
      // Setup schema and search path
      await this.setupSchema(schemaName)

      // Create enums first
      await this.createEnums(schemaName)

      // Create tables
      await this.createTables(schemaName)
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  /**
   * Drop all tables and types in the schema
   */
  async down(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName ?? 'public'

    if (schemaName === 'public') {
      // For public schema, drop individual objects
      const scriptsPath = this.getScriptsPath()
      const cleanupPath = join(scriptsPath, 'cleanup_schema.sql')
      const cleanupSql = readFileSync(cleanupPath, 'utf-8')

      await this.db.execute(sql.raw(cleanupSql))
    } else {
      // For test schemas, just drop the entire schema
      await this.db.execute(
        sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
      )
    }
  }
}
