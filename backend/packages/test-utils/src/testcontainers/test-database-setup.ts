import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { TestEnvironment } from './test-environment.js'

export interface TestContext {
  db: PostgresJsDatabase
  client: postgres.Sql
  cleanup: () => Promise<void>
}

export interface ParallelTestContext extends TestContext {
  schemaName: string
}

/**
 * 統合されたテストデータベースセットアップ
 * Sequential（トランザクションベース）とParallel（スキーマベース）の両方をサポート
 */
export class TestDatabaseSetup {
  private static instance: TestDatabaseSetup
  private testEnv!: TestEnvironment
  private masterClient!: postgres.Sql
  private masterDb!: PostgresJsDatabase
  private initialized = false
  private activeSchemas = new Set<string>()
  private migrationsRun = false

  private constructor() {}

  static async getInstance(): Promise<TestDatabaseSetup> {
    if (!TestDatabaseSetup.instance) {
      TestDatabaseSetup.instance = new TestDatabaseSetup()
      await TestDatabaseSetup.instance.initialize()
    }
    // テスト実行ごとにマイグレーションフラグをリセット
    TestDatabaseSetup.instance.migrationsRun = false
    return TestDatabaseSetup.instance
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    this.testEnv = await TestEnvironment.getInstance()
    const connectionString = this.testEnv.getPostgresConnectionString()

    this.masterClient = postgres(connectionString, {
      max: 50, // 並列実行のための十分なコネクション数
      onnotice: () => {},
    })
    this.masterDb = drizzle(this.masterClient)

    this.initialized = true
  }

  /**
   * publicスキーマでマイグレーションを実行（一度だけ）
   */
  async runMigrationsOnce(): Promise<void> {
    if (this.migrationsRun) return

    console.log('🔄 Running migrations once on public schema...')

    try {
      // まず既存の型やテーブルを削除（CASCADE付きで依存関係も含めて削除）
      const cleanupStatements = [
        // 依存関係のあるテーブルから先に削除
        'DROP TABLE IF EXISTS public.download_logs CASCADE',
        'DROP TABLE IF EXISTS public.share_links CASCADE',
        'DROP TABLE IF EXISTS public.attachments CASCADE',
        'DROP TABLE IF EXISTS public.auth_audit_logs CASCADE',
        'DROP TABLE IF EXISTS public.booking_reservations CASCADE',
        'DROP TABLE IF EXISTS public.bookings CASCADE',
        'DROP TABLE IF EXISTS public.email_verification_tokens CASCADE',
        'DROP TABLE IF EXISTS public.failed_login_attempts CASCADE',
        'DROP TABLE IF EXISTS public.opening_hours CASCADE',
        'DROP TABLE IF EXISTS public.password_reset_tokens CASCADE',
        'DROP TABLE IF EXISTS public.reservations CASCADE',
        'DROP TABLE IF EXISTS public.reviews CASCADE',
        'DROP TABLE IF EXISTS public.services CASCADE',
        'DROP TABLE IF EXISTS public.service_categories CASCADE',
        'DROP TABLE IF EXISTS public.sessions CASCADE',
        'DROP TABLE IF EXISTS public.staff_working_hours CASCADE',
        'DROP TABLE IF EXISTS public.staff CASCADE',
        'DROP TABLE IF EXISTS public.trusted_ip_addresses CASCADE',
        'DROP TABLE IF EXISTS public.user_2fa_secrets CASCADE',
        'DROP TABLE IF EXISTS public.user_sessions CASCADE',
        'DROP TABLE IF EXISTS public.users CASCADE',
        'DROP TABLE IF EXISTS public.customers CASCADE',
        'DROP TABLE IF EXISTS public.salons CASCADE',
        // 型を削除
        'DROP TYPE IF EXISTS public.booking_status CASCADE',
        'DROP TYPE IF EXISTS public.day_of_week CASCADE',
        'DROP TYPE IF EXISTS public.file_type CASCADE',
        'DROP TYPE IF EXISTS public.reservation_status CASCADE',
        'DROP TYPE IF EXISTS public.service_category CASCADE',
        'DROP TYPE IF EXISTS public.two_factor_status CASCADE',
        'DROP TYPE IF EXISTS public.user_account_status CASCADE',
        'DROP TYPE IF EXISTS public.user_role CASCADE',
      ]

      for (const stmt of cleanupStatements) {
        try {
          await this.masterDb.execute(sql.raw(stmt))
        } catch (_error) {
          // エラーは無視（オブジェクトが存在しない場合）
        }
      }

      // infrastructureパッケージのスキーマから生成されたmigrationファイルを実行
      const migrationFiles = ['20250724_000001_initial_schema.sql']

      const basePath = new URL(
        '../../../../apps/migration/scripts/',
        import.meta.url
      ).pathname

      for (const file of migrationFiles) {
        try {
          const { readFileSync } = await import('node:fs')
          const migrationContent = readFileSync(`${basePath}${file}`, 'utf-8')

          // Split by --> statement-breakpoint and execute each statement
          const statements = migrationContent.split('--> statement-breakpoint')

          for (const statement of statements) {
            const trimmedStatement = statement.trim()
            if (trimmedStatement) {
              try {
                await this.masterDb.execute(sql.raw(trimmedStatement))
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error)
                // エラーが発生した場合は詳細を出力
                console.error(
                  `Error executing statement from ${file}:`,
                  errorMessage
                )
                // 型エラーの詳細を出力
                if (error && typeof error === 'object' && 'query' in error) {
                  console.error(
                    'Failed query:',
                    (error as { query: string }).query
                  )
                }
                if (error && typeof error === 'object' && 'params' in error) {
                  console.error(
                    'params:',
                    (error as { params: unknown }).params
                  )
                }
              }
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          console.error(`Error processing migration ${file}:`, errorMessage)
        }
      }

      this.migrationsRun = true
      console.log('✅ Migrations completed')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * トランザクションベースのテストコンテキストを作成（Sequential実行用）
   */
  async createTransactionalContext(): Promise<TestContext> {
    await this.runMigrationsOnce()

    const connectionString = this.testEnv.getPostgresConnectionString()
    const testClient = postgres(connectionString, {
      onnotice: () => {},
      max: 1, // トランザクション使用時に必要
    })
    const testDb = drizzle(testClient)

    // トランザクションを開始
    await testClient`BEGIN`

    const cleanup = async () => {
      try {
        await testClient`ROLLBACK`
      } finally {
        await testClient.end()
      }
    }

    return { db: testDb, client: testClient, cleanup }
  }

  /**
   * クリーンなテーブルでのテストコンテキストを作成（トランザクションなし）
   */
  async createCleanContext(): Promise<TestContext> {
    await this.runMigrationsOnce()

    const connectionString = this.testEnv.getPostgresConnectionString()
    const testClient = postgres(connectionString, {
      onnotice: () => {},
      max: 1, // シングル接続
    })
    const testDb = drizzle(testClient)

    // 全テーブルのデータをクリア
    await this.cleanAllTables(testDb)

    const cleanup = async () => {
      await testClient.end()
    }

    return { db: testDb, client: testClient, cleanup }
  }

  /**
   * スキーマ分離されたテストコンテキストを作成（Parallel実行用）
   */
  async createParallelContext(): Promise<ParallelTestContext> {
    await this.runMigrationsOnce()

    const schemaName = `test_${randomUUID().replace(/-/g, '_')}`

    // 新しいスキーマを作成
    await this.masterDb.execute(
      sql`CREATE SCHEMA ${sql.identifier(schemaName)}`
    )

    // publicスキーマから構造をコピー
    await this.copySchemaStructure('public', schemaName)

    // テスト用の接続を作成
    const connectionString = this.testEnv.getPostgresConnectionString()
    const testClient = postgres(connectionString, {
      onnotice: () => {},
    })

    // search_pathを設定
    await testClient`SET search_path TO ${testClient(schemaName)}, public`

    const testDb = drizzle(testClient)

    this.activeSchemas.add(schemaName)

    const cleanup = async () => {
      try {
        await testClient.end()
        await this.masterDb.execute(
          sql`DROP SCHEMA ${sql.identifier(schemaName)} CASCADE`
        )
        this.activeSchemas.delete(schemaName)
      } catch (error) {
        console.error(`Failed to cleanup schema ${schemaName}:`, error)
      }
    }

    return { db: testDb, client: testClient, schemaName, cleanup }
  }

  private async copySchemaStructure(
    sourceSchema: string,
    targetSchema: string
  ): Promise<void> {
    const copyQuery = sql`
      DO $$
      DECLARE
        obj record;
        query text;
      BEGIN
        -- Copy tables
        FOR obj IN
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = ${sourceSchema}
            AND table_type = 'BASE TABLE'
        LOOP
          query := format(
            'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
            ${targetSchema}, obj.table_name, ${sourceSchema}, obj.table_name
          );
          EXECUTE query;
        END LOOP;
        
        -- Copy sequences
        FOR obj IN
          SELECT sequence_name
          FROM information_schema.sequences
          WHERE sequence_schema = ${sourceSchema}
        LOOP
          query := format(
            'CREATE SEQUENCE %I.%I START WITH 1',
            ${targetSchema}, obj.sequence_name
          );
          EXECUTE query;
        END LOOP;
      END $$;
    `

    await this.masterDb.execute(copyQuery)
  }

  private async cleanAllTables(db: PostgresJsDatabase): Promise<void> {
    // 依存関係の逆順で削除
    const tablesToClean = [
      // Authentication related tables (dependent on users)
      'user_sessions',
      'sessions',
      'password_reset_tokens',
      'email_verification_tokens',
      'user_2fa_secrets',
      'failed_login_attempts',
      'auth_audit_logs',
      'trusted_ip_addresses',

      // File related tables
      'download_logs',
      'share_links',
      'attachments',

      // Business tables (in dependency order)
      'reviews',
      'booking_reservations',
      'bookings',
      'reservations',
      'services',
      'service_categories',
      'staff_working_hours',
      'staff',
      'opening_hours',

      // Core tables
      'users',
      'customers',
      'salons',
    ]

    for (const table of tablesToClean) {
      try {
        await db.execute(sql`DELETE FROM ${sql.identifier(table)}`)
      } catch (_e) {
        // Table might not exist, ignore
      }
    }
  }

  async cleanup(): Promise<void> {
    // すべてのアクティブなスキーマをクリーンアップ
    for (const schemaName of this.activeSchemas) {
      try {
        await this.masterDb.execute(
          sql`DROP SCHEMA ${sql.identifier(schemaName)} CASCADE`
        )
      } catch (error) {
        console.error(`Failed to cleanup schema ${schemaName}:`, error)
      }
    }

    this.activeSchemas.clear()
    await this.masterClient.end()
  }
}

// 便利なヘルパー関数
export async function createTestContext(): Promise<TestContext> {
  const setup = await TestDatabaseSetup.getInstance()
  return setup.createTransactionalContext()
}

export async function createCleanTestContext(): Promise<TestContext> {
  const setup = await TestDatabaseSetup.getInstance()
  return setup.createCleanContext()
}

export async function createParallelTestContext(): Promise<ParallelTestContext> {
  const setup = await TestDatabaseSetup.getInstance()
  return setup.createParallelContext()
}
