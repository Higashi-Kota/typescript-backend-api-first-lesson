import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { test as base } from 'vitest'
import { SchemaIsolation } from '../testcontainers/schema-isolation.js'
import { TestEnvironment } from '../testcontainers/test-environment.js'

export interface DatabaseFixture {
  /**
   * PostgreSQL接続クライアント
   */
  db: PostgresJsDatabase

  /**
   * 現在のテスト用スキーマ名
   */
  schemaName: string

  /**
   * スキーマにsearch_pathを設定
   */
  setSearchPath: () => Promise<void>
}

export const test = base.extend<{
  database: DatabaseFixture
}>({
  // biome-ignore lint/correctness/noEmptyPattern: vitestのfixtureパターン
  database: async ({}, use) => {
    // テスト環境のセットアップ
    const testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // データベース接続
    const client = postgres(connectionString, {
      onnotice: () => {}, // NOTICEログを抑制
    })
    const db = drizzle(client)

    // スキーマ分離のセットアップ
    const schemaIsolation = new SchemaIsolation(db)
    const schemaName = await schemaIsolation.createIsolatedSchema()

    // フィクスチャオブジェクト
    const fixture: DatabaseFixture = {
      db,
      schemaName,
      setSearchPath: async () => {
        await db.execute(`SET search_path TO "${schemaName}", public`)
      },
    }

    // テストで使用
    await use(fixture)

    // クリーンアップ
    await schemaIsolation.dropSchema(schemaName)
    await client.end()
  },
})
