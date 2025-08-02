/**
 * 構造化ログ出力用のロガー
 * CLAUDE.mdのガイドラインに従った実装
 */

import pino from 'pino'

// 環境変数からログレベルを取得
const logLevel = process.env.LOG_LEVEL ?? 'info'

// Pinoロガーの作成
export const logger = pino({
  level: logLevel,
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
          },
        }
      : undefined,
  formatters: {
    level(label: string) {
      return { level: label }
    },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
})

// 子ロガーを作成するヘルパー
export const createLogger = (name: string) => logger.child({ module: name })
