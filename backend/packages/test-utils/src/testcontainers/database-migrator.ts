import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export class TestDatabaseMigrator {
  private db: PostgresJsDatabase

  constructor(connectionString: string) {
    const sql = postgres(connectionString, { max: 1 })
    this.db = drizzle(sql)
  }

  async runMigrations(schemaName?: string): Promise<void> {
    try {
      // Set search path if schema is provided
      if (schemaName) {
        await this.db.execute(`SET search_path TO ${schemaName}, public`)
      }

      // Find the migrations folder
      const currentDir = dirname(fileURLToPath(import.meta.url))
      const migrationsPath = join(
        currentDir,
        '../../../../apps/migration/scripts'
      )

      console.log('Running migrations from:', migrationsPath)

      await migrate(this.db, { migrationsFolder: migrationsPath })
      console.log('Test migrations completed successfully')
    } catch (error) {
      console.error('Test migration failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    // The connection will be closed automatically
  }
}
