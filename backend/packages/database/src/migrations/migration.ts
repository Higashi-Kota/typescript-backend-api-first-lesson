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
   * Get the path to the SQL directory
   */
  private getSqlPath(): string {
    const currentFile = fileURLToPath(import.meta.url)
    const currentDir = dirname(currentFile)
    return join(currentDir, '../../sql')
  }

  /**
   * Create schema and set search path
   */
  private async setupSchema(schemaName: string): Promise<void> {
    if (schemaName !== 'public') {
      await this.db.execute(
        sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
      )
    }

    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
  }

  /**
   * Run the setup SQL to create all tables and types
   */
  async up(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName ?? 'public'

    try {
      await this.setupSchema(schemaName)

      // Read and execute setup SQL
      const sqlPath = this.getSqlPath()
      const setupPath = join(sqlPath, 'setup.sql')
      const setupSql = readFileSync(setupPath, 'utf-8')

      // Remove the --> statement-breakpoint comments from the SQL
      const cleanedSql = setupSql.replace(/-->\s*statement-breakpoint/g, '')

      await this.db.execute(sql.raw(cleanedSql))

      console.log(
        `Database setup completed successfully in schema: ${schemaName}`
      )
    } catch (error) {
      console.error('Database setup failed:', error)
      throw error
    }
  }

  /**
   * Drop all tables and types in the schema
   */
  async down(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName ?? 'public'

    if (schemaName === 'public') {
      // For public schema, use the drop SQL
      const sqlPath = this.getSqlPath()
      const dropPath = join(sqlPath, 'drop.sql')
      const dropSql = readFileSync(dropPath, 'utf-8')

      await this.db.execute(sql.raw(dropSql))
    } else {
      // For test schemas, just drop the entire schema
      await this.db.execute(
        sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
      )
    }

    console.log(`Schema ${schemaName} dropped successfully`)
  }

  /**
   * Reset the database by dropping and recreating everything
   */
  async reset(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName ?? 'public'

    if (schemaName === 'public') {
      // For public schema, use the reset SQL
      const sqlPath = this.getSqlPath()
      const resetPath = join(sqlPath, 'reset.sql')
      const resetSql = readFileSync(resetPath, 'utf-8')

      await this.db.execute(sql.raw(resetSql))
      console.log('Database reset successfully')
    } else {
      // For test schemas, drop and recreate
      await this.down(options)
      console.log(`Schema ${schemaName} reset successfully`)
    }
  }
}
