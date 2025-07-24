import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
import { TestDatabaseSetup } from '../testcontainers/test-database-setup.js'
import { TestEnvironment } from '../testcontainers/test-environment.js'

export interface TestGlobalContext {
  testEnv: TestEnvironment
  databaseSetup: TestDatabaseSetup
}

/**
 * 共通のグローバルセットアップ
 * 各パッケージのvitest.config.tsから呼び出される
 */
export default async function sharedGlobalSetup(): Promise<void> {
  console.log('🚀 Starting shared global test setup...')

  try {
    // Load environment variables from project root .env.test file
    // Find project root by looking for package.json with name "beauty-salon-reservation-app"
    let currentDir = process.cwd()
    let projectRoot = currentDir

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf-8')
        )
        if (packageJson.name === 'beauty-salon-reservation-app') {
          projectRoot = currentDir
          break
        }
      }
      currentDir = path.dirname(currentDir)
    }

    const envTestPath = path.join(projectRoot, '.env.test')

    if (fs.existsSync(envTestPath)) {
      dotenv.config({ path: envTestPath })
      console.log(`📋 Loaded environment variables from ${envTestPath}`)
    } else {
      console.error(`❌ .env.test not found at ${envTestPath}`)
      throw new Error('.env.test file is required for tests')
    }

    // Testcontainersの初期化
    const testEnv = await TestEnvironment.getInstance()

    // データベースセットアップの初期化（マイグレーションも実行）
    const databaseSetup = await TestDatabaseSetup.getInstance()
    await databaseSetup.runMigrationsOnce()

    // Override DATABASE_URL with testcontainer URL
    process.env.DATABASE_URL = testEnv.getPostgresConnectionString()

    // グローバル変数に保存（クリーンアップ時に使用）
    // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
    const globalAny = global as any
    globalAny.__TEST_GLOBAL_CONTEXT__ = {
      testEnv,
      databaseSetup,
    } as TestGlobalContext

    console.log('✅ Shared global test setup completed')
  } catch (error) {
    console.error('❌ Shared global test setup failed:', error)
    throw error
  }
}

/**
 * 共通のグローバルティアダウン
 * vitestのafterAllフックで呼び出される（globalTeardownが効かないため）
 */
export async function sharedGlobalTeardown(): Promise<void> {
  console.log('🧹 Starting shared global test teardown...')

  try {
    // biome-ignore lint/suspicious/noExplicitAny: Global object type is not well-defined
    const globalAny = global as any
    const context = globalAny.__TEST_GLOBAL_CONTEXT__ as
      | TestGlobalContext
      | undefined

    if (context) {
      // データベースセットアップのクリーンアップ
      if (context.databaseSetup) {
        await context.databaseSetup.cleanup()
      }

      // Testcontainersの停止
      if (context.testEnv) {
        await context.testEnv.stop()
      }

      globalAny.__TEST_GLOBAL_CONTEXT__ = undefined
    }

    console.log('✅ Shared global test teardown completed')
  } catch (error) {
    console.error('❌ Shared global test teardown failed:', error)
    // ティアダウンでのエラーは握りつぶす（テスト結果に影響させない）
  }
}

/**
 * vitest設定で使用するセットアップファイル
 * このファイルをsetupFilesに追加することで、afterAllフックでティアダウンを実行
 */
export function setupTestHooks(): void {
  // グローバルティアダウンをafterAllで実行
  // biome-ignore lint/suspicious/noExplicitAny: afterAll is global in test environment
  const globalAny = globalThis as any
  if (typeof globalAny.afterAll !== 'undefined') {
    globalAny.afterAll(async () => {
      await sharedGlobalTeardown()
    }, 30000)
  }
}
