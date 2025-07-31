/**
 * 各テストで独立したスキーマを提供するシンプルなフィクスチャ
 *
 * 特徴：
 * - 各テストが独自のPostgreSQLスキーマで実行される
 * - テスト間の干渉がない
 * - 自動的にクリーンアップされる
 * - リポジトリの作成はテスト側で行う（循環依存を避けるため）
 */

import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { test as base } from 'vitest'
import { SchemaIsolation } from '../testcontainers/schema-isolation.js'
import { TestEnvironment } from '../testcontainers/test-environment.js'

export interface IsolatedTestContext {
  /**
   * スキーマ分離されたデータベース接続
   */
  db: PostgresJsDatabase

  /**
   * 現在のテスト用スキーマ名
   */
  schemaName: string
}

/**
 * 各テストで独立したスキーマを提供するフィクスチャ
 *
 * 使用例:
 * ```typescript
 * import { isolatedTest } from '@beauty-salon-backend/test-utils'
 * import { DrizzleUserRepository } from '../../src/repositories/user.repository.js'
 *
 * isolatedTest('should update user data', async ({ db }) => {
 *   // リポジトリを作成
 *   const repository = new DrizzleUserRepository(db)
 *
 *   // テストデータを作成
 *   const user = await createTestUser(repository, { email: 'test@example.com' })
 *
 *   // テスト実装
 *   const result = await repository.update(user.id, { name: 'Updated Name' })
 *   expect(result.type).toBe('ok')
 * })
 * ```
 */
export const isolatedTest = base.extend<{
  isolatedDb: IsolatedTestContext
}>({
  // biome-ignore lint/correctness/noEmptyPattern: vitestのfixtureパターン
  isolatedDb: async ({}, use) => {
    // テスト環境のセットアップ
    const testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // ユニークなスキーマ名を生成（各テストごと）
    const schemaName = `test_${randomUUID().replace(/-/g, '_')}`

    // 管理者接続でスキーマを作成
    const adminClient = postgres(connectionString, {
      onnotice: () => {},
    })
    const adminDb = drizzle(adminClient)

    await adminDb.execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
    )

    // search_pathを接続文字列に含めてテスト用接続を作成
    const testConnectionString = `${connectionString}?options=-c search_path="${schemaName}",public`
    const testClient = postgres(testConnectionString, {
      onnotice: () => {},
    })
    const db = drizzle(testClient)

    // マイグレーションを適用
    const schemaIsolation = new SchemaIsolation(db)
    await schemaIsolation.applyMigrations(schemaName)

    // コンテキストオブジェクト
    const context: IsolatedTestContext = {
      db,
      schemaName,
    }

    // テストで使用
    await use(context)

    // クリーンアップ（各テスト後に自動実行）
    await testClient.end()
    await adminDb.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
    )
    await adminClient.end()
  },
})
