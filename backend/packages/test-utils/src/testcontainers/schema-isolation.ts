import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'

export interface TestContext {
  schemaName: string
  cleanup: () => Promise<void>
}

export class SchemaIsolation {
  private readonly schemaPrefix = 'test_'

  // biome-ignore lint/suspicious/noExplicitAny: Database type comes from external package
  constructor(private readonly db: any) {} // Using any to avoid circular dependency

  async createIsolatedSchema(): Promise<string> {
    const schemaName = `${this.schemaPrefix}${randomUUID().replace(/-/g, '_')}`

    // Create new schema
    await this.db.execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
    )

    // Set search path to the new schema, including public for extensions
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )

    // Apply migrations to the new schema
    await this.applyMigrations(schemaName)

    return schemaName
  }

  async dropSchema(schemaName: string): Promise<void> {
    // Drop schema and all its contents
    await this.db.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
    )
  }

  async applyMigrations(schemaName: string): Promise<void> {
    // Set the schema for migrations
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )

    // Import and use TestDatabaseSetup to create tables
    const { TestDatabaseSetup } = await import('./database-setup.js')
    const dbSetup = new TestDatabaseSetup(this.db)

    // Create enums and tables in the isolated schema
    await dbSetup.createEnums()
    await dbSetup.createUsersTable()
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
