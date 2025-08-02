import * as path from 'node:path'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import * as dotenv from 'dotenv'

export class TestEnvironment {
  private static instance: TestEnvironment
  private postgresContainer?: StartedPostgreSqlContainer

  private constructor() {}

  static async getInstance(): Promise<TestEnvironment> {
    if (TestEnvironment.instance == null) {
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
    if (this.postgresContainer == null) {
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
  // Load .env.test file from project root
  const projectRoot = path.resolve(__dirname, '../../../../../')
  const envTestPath = path.join(projectRoot, '.env.test')

  // Load environment variables from .env.test
  dotenv.config({ path: envTestPath })

  const testEnv = await TestEnvironment.getInstance()

  // Override DATABASE_URL with testcontainer connection
  process.env.DATABASE_URL = testEnv.getPostgresConnectionString()

  // Store in global for teardown
  // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
  ;(global as any).__TEST_ENV__ = testEnv
}
