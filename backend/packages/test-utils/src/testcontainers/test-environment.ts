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
      .withReuse()
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

  getJwtSecret(): string {
    return 'test-jwt-secret-for-integration-tests-minimum-32-chars'
  }

  async stop(): Promise<void> {
    await this.postgresContainer?.stop()
  }
}

// Global setup for Vitest
export async function globalSetup() {
  // Load environment variables from .env.test file
  const dotenv = await import('dotenv')
  const path = await import('node:path')
  const fs = await import('node:fs')

  // Try to load .env.test from project root
  const projectRoot = path.resolve(process.cwd(), '../..')
  const envTestPath = path.join(projectRoot, '.env.test')

  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath })
  } else {
    // Fallback: try current working directory
    dotenv.config({ path: '.env.test' })
  }

  const testEnv = await TestEnvironment.getInstance()

  // Override DATABASE_URL with testcontainer URL
  process.env.DATABASE_URL = testEnv.getPostgresConnectionString()

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
