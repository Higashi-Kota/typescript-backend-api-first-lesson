import console from 'node:console'
import { randomUUID } from 'node:crypto'
import * as schema from '@beauty-salon-backend/database'
import { SqlScripts } from '@beauty-salon-backend/database'
import type { Database } from '@beauty-salon-backend/infrastructure'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export interface TestSchema {
  name: string
  db: Database
  queryClient: postgres.Sql
  cleanup: () => Promise<void>
}

/**
 * Manages isolated test schemas for each test
 * Each test gets its own PostgreSQL schema for complete isolation
 */
export class TestSchemaManager {
  private adminClient: postgres.Sql
  private adminDb: Database
  private schemas: Map<string, TestSchema> = new Map()

  constructor(private connectionUri: string) {
    this.adminClient = postgres(connectionUri)
    this.adminDb = drizzle(this.adminClient, { schema }) as Database
  }

  /**
   * Initialize all enum types in the public schema once
   * Should be called once during global setup
   */
  async initializeEnums() {
    try {
      const enumStatements = SqlScripts.getEnumStatements()
      let successCount = 0
      let skippedCount = 0

      // Create all enum types in public schema with idempotent approach
      for (const statement of enumStatements) {
        const created = await this.createEnumIfNotExists(statement)
        if (created) {
          successCount++
        } else {
          skippedCount++
        }
      }

      console.log(
        `✅ ${successCount} Enum types ready in public schema (${skippedCount} skipped)`
      )

      // Verify enums exist
      const result = await this.adminDb.execute(sql`
        SELECT typname FROM pg_type
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'e'
      `)
      console.log(`✅ Found ${result.length} enum types in database`)
    } catch (error) {
      throw new Error(`Failed to initialize enum types: ${error}`)
    }
  }

  /**
   * Create a single enum type if it doesn't exist
   * @param enumDefinition - The CREATE TYPE statement
   * @returns true if created or already exists, false on error
   */
  private async createEnumIfNotExists(
    enumDefinition: string
  ): Promise<boolean> {
    // Extract enum name from the CREATE TYPE statement
    const match = enumDefinition.match(/CREATE TYPE "public"\."(\w+)" AS ENUM/)
    if (!match) {
      console.warn('Invalid enum definition:', enumDefinition)
      return false
    }

    const enumName = match[1]

    try {
      // Check if the enum already exists
      const existsResult = await this.adminDb.execute(sql`
        SELECT 1 FROM pg_type 
        WHERE typname = ${enumName} 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `)

      if (existsResult.length > 0) {
        // Enum already exists, skip creation
        return true
      }

      // Create the enum
      await this.adminDb.execute(sql.raw(enumDefinition))
      return true
    } catch (error) {
      console.warn(`Failed to create enum ${enumName}:`, error)
      return false
    }
  }

  /**
   * Create a new isolated schema for a test
   * @param useSimplifiedSetup - Use simplified setup for faster tests (default: true)
   * @returns TestSchema with isolated database connection
   */
  async createTestSchema(useSimplifiedSetup = true): Promise<TestSchema> {
    const schemaName = `test_${randomUUID().replace(/-/g, '_')}`

    try {
      // Create the schema
      await this.adminDb.execute(sql.raw(`CREATE SCHEMA ${schemaName}`))

      // Set up connection with schema search path
      const schemaUrl = new URL(this.connectionUri)
      schemaUrl.searchParams.set('search_path', `${schemaName},public`)

      const queryClient = postgres(schemaUrl.toString())
      const db = drizzle(queryClient, { schema }) as Database

      // Apply database setup SQL
      await this.applyDatabaseSetup(db, schemaName, useSimplifiedSetup)

      const testSchema: TestSchema = {
        name: schemaName,
        db,
        queryClient,
        cleanup: async () => {
          await queryClient.end()
          await this.dropSchema(schemaName)
        },
      }

      this.schemas.set(schemaName, testSchema)
      return testSchema
    } catch (error) {
      // Cleanup on error
      await this.dropSchema(schemaName).catch(() => {})
      throw new Error(`Failed to create test schema: ${error}`)
    }
  }

  /**
   * Apply database setup SQL to the test schema
   */
  private async applyDatabaseSetup(
    db: Database,
    schemaName: string,
    useSimplifiedSetup = true
  ) {
    try {
      // Set search path to include both test schema and public (for enums)
      await db.execute(sql.raw(`SET search_path TO ${schemaName}, public`))

      let statements: string[]

      if (useSimplifiedSetup) {
        // Use simplified test setup for faster tests
        const testSql = SqlScripts.getTestSetupSql()
        statements = SqlScripts.parseStatements(testSql)

        // Filter out CREATE TYPE statements since enums are already created in public schema
        statements = statements.filter((stmt) => !stmt.includes('CREATE TYPE'))

        // Fix foreign key references to use current schema instead of public
        statements = statements.map((stmt) => {
          // Replace REFERENCES "public"."table" with REFERENCES "table" to use search path
          if (stmt.includes('REFERENCES "public"."')) {
            return stmt.replace(
              /REFERENCES "public"\."(\w+)"/g,
              'REFERENCES "$1"'
            )
          }
          return stmt
        })
      } else {
        // Use full setup with proper enum handling
        const tableStatements = SqlScripts.getTableStatements()

        // Modify table creation to use test schema
        statements = tableStatements.map((stmt) => {
          // Replace CREATE TABLE "tablename" with CREATE TABLE schemaname."tablename"
          if (stmt.includes('CREATE TABLE')) {
            return stmt.replace(
              /CREATE TABLE "(\w+)"/g,
              `CREATE TABLE ${schemaName}."$1"`
            )
          }
          // For ALTER TABLE and CREATE INDEX, they'll use the search path
          return stmt
        })
      }

      // Execute all statements
      for (const statement of statements) {
        await db.execute(sql.raw(statement))
      }

      console.log(`✅ Database setup applied to schema ${schemaName}`)
    } catch (error) {
      console.log(JSON.stringify(error, null, 2))
      throw new Error(`Failed to apply database setup: ${error}`)
    }
  }

  /**
   * Apply seed data to a test schema
   */
  async applySeedData(schemaName: string) {
    const schema = this.schemas.get(schemaName)
    if (!schema) {
      throw new Error(`Schema ${schemaName} not found`)
    }

    try {
      // TODO: Implement seed data when available
      console.log('Seed data application not yet implemented')
    } catch (error) {
      console.warn('Seed data not available or failed:', error)
      // Continue without seed data
    }
  }

  /**
   * Drop a schema and all its contents
   */
  private async dropSchema(schemaName: string) {
    try {
      await this.adminDb.execute(
        sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
      )
      this.schemas.delete(schemaName)
    } catch (error) {
      console.error(`Failed to drop schema ${schemaName}:`, error)
    }
  }

  /**
   * Clean up all test schemas
   */
  async cleanupAll() {
    const cleanupPromises = Array.from(this.schemas.values()).map((schema) =>
      schema.cleanup()
    )

    await Promise.allSettled(cleanupPromises)
    await this.adminClient.end()
  }

  /**
   * Get statistics about current test schemas
   */
  getStats() {
    return {
      activeSchemas: this.schemas.size,
      schemaNames: Array.from(this.schemas.keys()),
    }
  }
}
