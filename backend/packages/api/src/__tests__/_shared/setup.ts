import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { type TestSchema, TestSchemaManager } from './test-schema-manager'

let container: StartedPostgreSqlContainer
let schemaManager: TestSchemaManager
let currentTestSchema: TestSchema | null = null

/**
 * Global setup - Start PostgreSQL container once for all tests
 */
beforeAll(async () => {
  console.log('🚀 Starting PostgreSQL container...')

  // Set environment variables to bypass Docker credential helpers
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true'
  process.env.DOCKER_CONFIG = '/dev/null'

  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .withExposedPorts(5432)
    .withStartupTimeout(120000)
    .start()

  const connectionUri = container.getConnectionUri()
  console.log('✅ PostgreSQL container started')

  // Initialize schema manager
  schemaManager = new TestSchemaManager(connectionUri)

  // Initialize enum types once for all test schemas
  await schemaManager.initializeEnums()

  // Store in global for tests to access
  globalThis.__TEST_CONTAINER__ = container
  globalThis.__SCHEMA_MANAGER__ = schemaManager
})

/**
 * Per-test setup - Create isolated schema for each test
 */
beforeEach(async (context) => {
  const testName = context.task?.name || 'unknown'
  console.log(`📦 Creating isolated schema for test: ${testName}`)

  // Use simplified setup by default for faster tests
  currentTestSchema = await schemaManager.createTestSchema(true)

  // Make available to test
  globalThis.__TEST_DB__ = currentTestSchema.db
  globalThis.__TEST_QUERY_CLIENT__ = currentTestSchema.queryClient
  globalThis.__TEST_SCHEMA__ = currentTestSchema

  console.log(`✅ Schema ${currentTestSchema.name} created`)
})

/**
 * Per-test teardown - Clean up test schema
 */
afterEach(async () => {
  if (currentTestSchema) {
    console.log(`🧹 Cleaning up schema ${currentTestSchema.name}`)
    await currentTestSchema.cleanup()
    currentTestSchema = null

    // Clear globals
    globalThis.__TEST_DB__ = undefined
    globalThis.__TEST_QUERY_CLIENT__ = undefined
    globalThis.__TEST_SCHEMA__ = undefined
  }
})

/**
 * Global teardown - Stop container and clean up
 */
afterAll(async () => {
  console.log('🛑 Stopping test environment...')

  if (schemaManager) {
    const stats = schemaManager.getStats()
    console.log(`📊 Cleaning up ${stats.activeSchemas} remaining schemas`)
    await schemaManager.cleanupAll()
  }

  if (container) {
    await container.stop()
    console.log('✅ PostgreSQL container stopped')
  }
})
