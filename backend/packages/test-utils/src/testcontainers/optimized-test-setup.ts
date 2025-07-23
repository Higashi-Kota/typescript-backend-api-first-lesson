import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { SchemaIsolation } from './schema-isolation.js'
import { TestEnvironment } from './test-environment.js'

/**
 * Optimized Test Setup for Integration Tests
 *
 * This module provides an optimized approach to test setup that:
 * 1. Runs migrations once per test suite instead of per test
 * 2. Uses transactions for test isolation
 * 3. Provides helper methods for common test operations
 */

// Module-level state
let setupComplete = false
let testEnv: TestEnvironment
let masterDb: PostgresJsDatabase
let masterClient: postgres.Sql

/**
 * Global setup - runs once for all tests
 */
export async function optimizedGlobalSetup(): Promise<void> {
  if (setupComplete) return

  // Get test environment instance
  testEnv = await TestEnvironment.getInstance()

  // Create master connection
  const connectionString = testEnv.getPostgresConnectionString()
  masterClient = postgres(connectionString, {
    onnotice: () => {}, // Suppress notices
  })
  masterDb = drizzle(masterClient)

  // Run migrations once
  const schemaIsolation = new SchemaIsolation(masterDb)
  await schemaIsolation.createIsolatedSchema()

  setupComplete = true
  console.log('✅ Optimized test setup completed - migrations run once')
}

/**
 * Create a transactional test context
 * Each test runs in its own transaction that gets rolled back
 */
export async function createTestContext() {
  if (!setupComplete) {
    await optimizedGlobalSetup()
  }

  // Create a new connection for this test
  const connectionString = testEnv.getPostgresConnectionString()
  const testClient = postgres(connectionString, {
    onnotice: () => {},
  })
  const testDb = drizzle(testClient)

  // Start a transaction
  await testClient`BEGIN`

  // Create a cleanup function that rolls back the transaction
  const cleanup = async () => {
    try {
      await testClient`ROLLBACK`
    } finally {
      await testClient.end()
    }
  }

  return {
    db: testDb,
    client: testClient,
    cleanup,
  }
}

/**
 * Create a test context with clean tables (no transaction)
 * Useful for tests that need to test transaction behavior
 */
export async function createCleanTestContext() {
  if (!setupComplete) {
    await optimizedGlobalSetup()
  }

  // Create a new connection for this test
  const connectionString = testEnv.getPostgresConnectionString()
  const testClient = postgres(connectionString, {
    onnotice: () => {},
  })
  const testDb = drizzle(testClient)

  // Clean all data from tables (but keep schema)
  await cleanAllTables(testDb)

  // Create a cleanup function
  const cleanup = async () => {
    await testClient.end()
  }

  return {
    db: testDb,
    client: testClient,
    cleanup,
  }
}

/**
 * Clean all data from tables without dropping them
 */
async function cleanAllTables(db: PostgresJsDatabase): Promise<void> {
  // Delete data in reverse dependency order
  const tablesToClean = [
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

  for (const table of tablesToClean) {
    try {
      await db.execute(sql`DELETE FROM ${sql.identifier(table)}`)
    } catch (_e) {
      // Table might not exist, ignore
    }
  }
}

/**
 * Global teardown
 */
export async function optimizedGlobalTeardown(): Promise<void> {
  if (masterClient) {
    await masterClient.end()
  }
}

// Export as a namespace-like object for backward compatibility
export const OptimizedTestSetup = {
  globalSetup: optimizedGlobalSetup,
  globalTeardown: optimizedGlobalTeardown,
  createTestContext,
  createCleanTestContext,
}
