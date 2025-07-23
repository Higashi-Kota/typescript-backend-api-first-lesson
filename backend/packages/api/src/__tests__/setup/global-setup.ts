import {
  TestEnvironment,
  OptimizedTestSetup,
} from '@beauty-salon-backend/test-utils'

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...')

  try {
    // Get testcontainers instance (singleton)
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

    // Run migrations once for all tests
    await OptimizedTestSetup.globalSetup()

    // Store in global for teardown
    // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
    ;(global as any).__TEST_ENV__ = testEnv

    console.log('✅ Global test setup completed')
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}
