import { env as config } from '@beauty-salon-backend/config'
import { db } from '@beauty-salon-backend/infrastructure/database'
import { sql } from 'drizzle-orm'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { match } from 'ts-pattern'
import { createStructuredLogger } from '../utils/structured-logger.js'

const router = Router()
const logger = createStructuredLogger('health')

export type HealthStatus =
  | { type: 'healthy' }
  | { type: 'degraded'; issues: string[] }
  | { type: 'unhealthy'; issues: string[] }

export type HealthCheckResult = {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: ComponentHealth
    redis?: ComponentHealth
    storage?: ComponentHealth
    email?: ComponentHealth
  }
}

export type ComponentHealth =
  | { status: 'healthy'; latency?: number }
  | { status: 'degraded'; message: string; latency?: number }
  | { status: 'unhealthy'; message: string; error?: string }

const checkDatabase = async (): Promise<ComponentHealth> => {
  const startTime = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    const latency = Date.now() - startTime

    if (latency > 1000) {
      return {
        status: 'degraded',
        message: 'Database response time is high',
        latency,
      }
    }

    return {
      status: 'healthy',
      latency,
    }
  } catch (error) {
    logger.logError(error as Error, { component: 'database' })
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

const checkRedis = async (): Promise<ComponentHealth | undefined> => {
  // Redis実装時に追加
  return undefined
}

const checkStorage = async (): Promise<ComponentHealth | undefined> => {
  // MinIO/S3チェック実装時に追加
  if (config.STORAGE_ENDPOINT == null) {
    return undefined
  }

  // TODO: MinIOへの接続チェック
  return {
    status: 'healthy',
  }
}

const checkEmail = async (): Promise<ComponentHealth | undefined> => {
  // メールサービスチェック実装時に追加
  if (config.NODE_ENV === 'development') {
    return {
      status: 'healthy',
    }
  }

  // TODO: Mailgunへの接続チェック
  return undefined
}

const determineOverallStatus = (
  checks: HealthCheckResult['checks']
): HealthStatus => {
  const issues: string[] = []
  let hasUnhealthy = false
  let hasDegraded = false

  for (const [component, health] of Object.entries(checks)) {
    if (health == null) continue

    match(health)
      .with({ status: 'unhealthy' }, ({ message }) => {
        hasUnhealthy = true
        issues.push(`${component}: ${message}`)
      })
      .with({ status: 'degraded' }, ({ message }) => {
        hasDegraded = true
        issues.push(`${component}: ${message}`)
      })
      .with({ status: 'healthy' }, () => {})
      .exhaustive()
  }

  if (hasUnhealthy) {
    return { type: 'unhealthy', issues }
  }

  if (hasDegraded) {
    return { type: 'degraded', issues }
  }

  return { type: 'healthy' }
}

// 基本的なヘルスチェック（Kubernetesのliveness probe用）
router.get('/', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// 詳細なヘルスチェック（Kubernetesのreadiness probe用）
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [dbHealth, redisHealth, storageHealth, emailHealth] =
      await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkStorage(),
        checkEmail(),
      ])

    const checks: HealthCheckResult['checks'] = {
      database: dbHealth,
      ...(redisHealth && { redis: redisHealth }),
      ...(storageHealth && { storage: storageHealth }),
      ...(emailHealth && { email: emailHealth }),
    }

    const overallStatus = determineOverallStatus(checks)

    const result: HealthCheckResult = {
      status: match(overallStatus)
        .with({ type: 'healthy' }, () => 'healthy' as const)
        .with({ type: 'degraded' }, () => 'degraded' as const)
        .with({ type: 'unhealthy' }, () => 'unhealthy' as const)
        .exhaustive(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      uptime: process.uptime(),
      checks,
    }

    const statusCode = match(overallStatus)
      .with({ type: 'healthy' }, () => 200)
      .with({ type: 'degraded' }, () => 200) // degradedでも200を返す（トラフィックは受け付ける）
      .with({ type: 'unhealthy' }, () => 503)
      .exhaustive()

    res.status(statusCode).json(result)
  } catch (error) {
    logger.logError(error as Error, { endpoint: '/health/ready' })
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      uptime: process.uptime(),
      checks: {
        database: {
          status: 'unhealthy',
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    })
  }
})

// デバッグ用の詳細情報（本番環境では無効化すべき）
router.get('/debug', async (_req: Request, res: Response) => {
  if (config.NODE_ENV === 'production') {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' })
    return
  }

  res.json({
    environment: config.NODE_ENV,
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
  })
})

export { router as healthRouter }
