import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'

export class TestEnvironment {
  private static instance: TestEnvironment
  private postgresContainer?: StartedPostgreSqlContainer

  private constructor() {}

  static async getInstance(): Promise<TestEnvironment> {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment()
      await TestEnvironment.instance.start()
    }
    return TestEnvironment.instance
  }

  async start(): Promise<void> {
    // Start PostgreSQL container with optimized settings for tests
    this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withExposedPorts(5432)
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .withReuse() // Reuse container for faster tests
      .withCommand([
        'postgres',
        '-c',
        'max_connections=200',
        '-c',
        'shared_buffers=256MB',
        '-c',
        'fsync=off', // Safe for tests, improves performance
        '-c',
        'synchronous_commit=off',
        '-c',
        'full_page_writes=off',
        '-c',
        'wal_buffers=16MB',
      ])
      .start()

    // Create extensions once in public schema
    const { sql } = await import('drizzle-orm')
    const postgres = await import('postgres')
    const { drizzle } = await import('drizzle-orm/postgres-js')

    const client = postgres.default(this.postgresContainer.getConnectionUri())
    const db = drizzle(client)

    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    await client.end()
  }

  getPostgresConnectionString(): string {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started')
    }
    return this.postgresContainer.getConnectionUri()
  }

  async stop(): Promise<void> {
    await this.postgresContainer?.stop()
  }
}

// Global setup for Vitest
export async function globalSetup() {
  const testEnv = await TestEnvironment.getInstance()

  // Set environment variables for tests
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = testEnv.getPostgresConnectionString()
  process.env.JWT_SECRET =
    'test-jwt-secret-for-integration-tests-minimum-32-chars'
  process.env.JWT_EXPIRES_IN = '7d'
  process.env.JWT_ACCESS_TOKEN_EXPIRY_MINUTES = '15'
  process.env.JWT_REFRESH_TOKEN_EXPIRY_DAYS = '7'
  process.env.LOG_LEVEL = 'error' // Quiet logs during tests
  process.env.PORT = '3000'
  process.env.CORS_ORIGIN = 'http://localhost:3001'

  // Storage config for tests
  process.env.STORAGE_PROVIDER = 'minio'
  process.env.STORAGE_ENDPOINT = 'http://localhost:9000'
  process.env.STORAGE_BUCKET = 'test-bucket'
  process.env.STORAGE_ACCESS_KEY = 'minioadmin'
  process.env.STORAGE_SECRET_KEY = 'minioadmin'

  // Email config for tests
  process.env.EMAIL_PROVIDER = 'development'
  process.env.FROM_EMAIL = 'test@beauty-salon.test'
  process.env.FROM_NAME = 'Test Beauty Salon'

  // Store in global for teardown
  // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
  ;(global as any).__TEST_ENV__ = testEnv
}

// Global teardown for Vitest
export async function globalTeardown() {
  // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
  const testEnv = (global as any).__TEST_ENV__
  if (testEnv) {
    await testEnv.stop()
  }
}
