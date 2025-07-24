import { defineConfig } from 'vitest/config'
import type { ViteUserConfig } from 'vitest/config'

export interface SharedVitestConfigOptions {
  /** パッケージのルートディレクトリへのパス */
  rootDir: string
  /** 追加のエイリアス設定 */
  aliases?: Record<string, string>
  /** 並列実行を有効にするか（デフォルト: true） */
  parallel?: boolean
  /** 統合テストモードか（デフォルト: false） */
  integrationTest?: boolean
}

/**
 * 共通のvitest設定を生成
 */
export function createSharedVitestConfig(
  options: SharedVitestConfigOptions
): ViteUserConfig {
  const {
    rootDir,
    aliases = {},
    parallel = true,
    integrationTest = false,
  } = options

  return defineConfig({
    test: {
      globals: true,
      environment: 'node',
      env: {
        NODE_ENV: 'test',
      },
      // タイムアウト設定
      testTimeout: integrationTest ? 60000 : 10000,
      hookTimeout: integrationTest ? 120000 : 20000,

      // 並列実行設定
      pool: parallel ? 'threads' : 'forks',
      poolOptions: parallel
        ? {
            threads: {
              singleThread: false,
              minThreads: 1,
              maxThreads: 4, // スキーマ分離により並列実行可能
            },
          }
        : {
            forks: {
              singleFork: true,
            },
          },

      // グローバルセットアップ（マイグレーション実行）
      globalSetup: integrationTest
        ? '@beauty-salon-backend/test-utils/setup/shared-global-setup'
        : undefined,

      // setupFilesでafterAllフックを設定（globalTeardownの代替）
      setupFiles: integrationTest
        ? ['@beauty-salon-backend/test-utils/setup/vitest-setup']
        : [],

      // カバレッジ設定
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData.ts',
          '**/*.spec.ts',
          '**/*.test.ts',
          '**/__tests__/**',
          '**/test-utils/**',
        ],
      },

      // レポーター設定
      reporters: process.env.CI ? ['default', 'junit'] : ['default'],
      outputFile: process.env.CI ? 'test-results/junit.xml' : undefined,
    },

    resolve: {
      alias: {
        '@': `${rootDir}/src`,
        ...aliases,
      },
    },
  })
}
