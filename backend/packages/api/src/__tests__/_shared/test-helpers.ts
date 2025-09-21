import type { Database } from '@beauty-salon-backend/infrastructure'
import type { Express } from 'express'
import request from 'supertest'
import { createApp } from './app'
import type { TestSchema } from './test-schema-manager'

// Global type declarations for testing
declare global {
  var __TEST_DB__: Database | undefined
  var __TEST_QUERY_CLIENT__: import('postgres').Sql | undefined
  var __TEST_SCHEMA__: TestSchema | undefined
  var __TEST_CONTAINER__:
    | import('@testcontainers/postgresql').StartedPostgreSqlContainer
    | undefined
  var __SCHEMA_MANAGER__:
    | import('./test-schema-manager').TestSchemaManager
    | undefined
}

/**
 * Get the current test's isolated database connection
 */
export function getTestDb(): Database {
  if (!globalThis.__TEST_DB__) {
    throw new Error(
      'Test database not initialized. Make sure setup.ts has run.'
    )
  }
  return globalThis.__TEST_DB__
}

/**
 * Get the current test's schema information
 */
export function getTestSchema(): TestSchema {
  if (!globalThis.__TEST_SCHEMA__) {
    throw new Error('Test schema not initialized. Make sure setup.ts has run.')
  }
  return globalThis.__TEST_SCHEMA__
}

/**
 * Create an Express app instance for testing
 */
export function createTestApp(): Express {
  const db = getTestDb()
  return createApp({ database: db })
}

/**
 * Apply seed data to the current test schema
 */
export async function seedTestDatabase() {
  const schemaManager = globalThis.__SCHEMA_MANAGER__
  const testSchema = getTestSchema()

  if (!schemaManager) {
    throw new Error('Schema manager not initialized')
  }

  await schemaManager.applySeedData(testSchema.name)
}

/**
 * Execute raw SQL in the test schema
 */
export async function executeTestSql(sqlQuery: string) {
  const db = getTestDb()
  const { sql } = await import('drizzle-orm')
  return db.execute(sql.raw(sqlQuery))
}

/**
 * Get test database statistics
 */
export function getTestStats() {
  const schemaManager = globalThis.__SCHEMA_MANAGER__
  if (!schemaManager) {
    return { activeSchemas: 0, schemaNames: [] }
  }
  return schemaManager.getStats()
}

export { request }
