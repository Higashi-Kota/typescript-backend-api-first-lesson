import {
  type ParallelTestContext,
  type TestContext,
  createCleanTestContext,
  createParallelTestContext,
  createTestContext,
} from '../testcontainers/test-database-setup.js'

/**
 * 統合テスト用のヘルパー
 * デフォルトではトランザクションベースのコンテキストを作成
 */
export async function setupTestDatabase(): Promise<TestContext> {
  return createTestContext()
}

/**
 * クリーンなデータベースでのテスト用
 */
export async function setupCleanTestDatabase(): Promise<TestContext> {
  return createCleanTestContext()
}

/**
 * 並列実行可能なテスト用（スキーマ分離）
 */
export async function setupParallelTestDatabase(): Promise<ParallelTestContext> {
  return createParallelTestContext()
}

/**
 * テストのサンプル使用例
 * @example
 * ```typescript
 * import { describe, it, expect } from 'vitest'
 * import { setupTestDatabase } from '@beauty-salon-backend/test-utils'
 *
 * describe('UserRepository', () => {
 *   it('should create a user', async () => {
 *     // 各テストで独立したスキーマを使用
 *     const { db, cleanup } = await setupTestDatabase()
 *
 *     try {
 *       // テストの実装
 *       const user = await db.insert(users).values({
 *         id: 'test-user-id',
 *         email: 'test@example.com',
 *         // ...
 *       }).returning()
 *
 *       expect(user).toBeDefined()
 *     } finally {
 *       // 必ずクリーンアップを実行
 *       await cleanup()
 *     }
 *   })
 * })
 * ```
 */
export const testDatabaseExample = null
