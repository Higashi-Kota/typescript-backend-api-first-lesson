import { OptimizedTestSetup } from '@beauty-salon-backend/test-utils'

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')

  // Clean up optimized test setup
  await OptimizedTestSetup.globalTeardown()

  // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
  const testEnv = (global as any).__TEST_ENV__
  if (testEnv) {
    try {
      await testEnv.stop()
      console.log('✅ Global test teardown completed')
    } catch (error) {
      console.error('❌ Global test teardown failed:', error)
    }
  }
}
