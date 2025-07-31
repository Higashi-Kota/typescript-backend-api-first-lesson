/**
 * 各テストで独立したスキーマを作成するためのヘルパー関数
 */

import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { SchemaIsolation } from '../testcontainers/schema-isolation.js'
import { TestEnvironment } from '../testcontainers/test-environment.js'

export interface IsolatedSchema {
  /**
   * スキーマ分離されたデータベース接続
   */
  db: PostgresJsDatabase

  /**
   * 現在のテスト用スキーマ名
   */
  schemaName: string

  /**
   * クリーンアップ関数（必ず呼ぶこと）
   */
  cleanup: () => Promise<void>
}

/**
 * 独立したスキーマとデータベース接続を作成
 *
 * 使用例:
 * ```typescript
 * test('should do something', async () => {
 *   const schema = await createIsolatedSchema()
 *   try {
 *     const repository = new DrizzleUserRepository(schema.db)
 *     // テストコード
 *   } finally {
 *     await schema.cleanup()
 *   }
 * })
 * ```
 */
export async function createIsolatedSchema(): Promise<IsolatedSchema> {
  // テスト環境のセットアップ
  const testEnv = await TestEnvironment.getInstance()
  const connectionString = testEnv.getPostgresConnectionString()

  // ユニークなスキーマ名を生成
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

  // クリーンアップ関数
  const cleanup = async () => {
    await testClient.end()
    await adminDb.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
    )
    await adminClient.end()
  }

  return {
    db,
    schemaName,
    cleanup,
  }
}

/**
 * 独立したスキーマでテストを実行するヘルパー
 *
 * 使用例:
 * ```typescript
 * test('should do something', async () => {
 *   await withIsolatedSchema(async ({ db }) => {
 *     const repository = new DrizzleUserRepository(db)
 *     // テストコード
 *   })
 * })
 * ```
 */
export async function withIsolatedSchema<T>(
  fn: (schema: IsolatedSchema) => Promise<T>
): Promise<T> {
  const schema = await createIsolatedSchema()
  try {
    return await fn(schema)
  } finally {
    await schema.cleanup()
  }
}
