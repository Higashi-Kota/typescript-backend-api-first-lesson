import { TestEnvironment } from '@beauty-salon-backend/test-utils'

export default async function globalSetup() {
  console.log('🚀 Starting global test setup for infrastructure...')

  try {
    // Get testcontainers instance (singleton)
    const testEnv = await TestEnvironment.getInstance()

    // Set environment variables for tests
    process.env.DATABASE_URL = testEnv.getPostgresConnectionString()

    // Store in global for teardown
    // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
    ;(global as any).__TEST_ENV__ = testEnv

    console.log('✅ Global test setup completed')
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}
