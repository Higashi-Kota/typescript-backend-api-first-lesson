import { ProgrammaticMigration } from '@beauty-salon-backend/migration'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export class TestDatabaseSetup {
  private readonly migration: ProgrammaticMigration

  constructor(
    db: PostgresJsDatabase,
    private readonly schemaName?: string
  ) {
    this.migration = new ProgrammaticMigration(db)
  }

  async setupDatabase(): Promise<void> {
    // Run programmatic migration with dynamic schema
    await this.migration.up({ schemaName: this.schemaName })
  }

  async cleanupDatabase(): Promise<void> {
    // Run programmatic cleanup
    await this.migration.down({ schemaName: this.schemaName })
  }
}
