import { createMetricsService } from '@beauty-salon-backend/infrastructure/services'
import type { NextFunction, Request, Response } from 'express'
import { match } from 'ts-pattern'

const metricsService = createMetricsService()
metricsService.init()

export type RequestMetrics = {
  method: string
  route: string
  statusCode: number
  duration: number
  responseSize: number
}

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now()
  const route = req.route?.path ?? req.path ?? 'unknown'

  // リクエスト開始時のメトリクス
  metricsService.system.httpRequestsInFlight.inc({ method: req.method, route })

  // レスポンス送信時のメトリクス収集
  const originalSend = res.send
  res.send = function (data: unknown): Response {
    const duration = (Date.now() - startTime) / 1000 // 秒単位
    const statusCode = res.statusCode.toString()
    const responseSize = Buffer.byteLength(JSON.stringify(data))

    // リクエスト完了時のメトリクス
    metricsService.system.httpRequestsInFlight.dec({
      method: req.method,
      route,
    })
    metricsService.system.httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    })
    metricsService.system.httpRequestDurationSeconds.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    )
    metricsService.system.httpResponseSizeBytes.observe(
      { method: req.method, route, status_code: statusCode },
      responseSize
    )

    // エラーメトリクス
    if (res.statusCode >= 400) {
      const errorType = match(res.statusCode)
        .when(
          (code) => code >= 400 && code < 500,
          () => 'client_error'
        )
        .when(
          (code) => code >= 500,
          () => 'server_error'
        )
        .otherwise(() => 'unknown')

      metricsService.system.errorTotal.inc({
        type: errorType,
        code: statusCode,
      })
    }

    return originalSend.call(this, data)
  }

  next()
}

// Prometheusメトリクスエンドポイントのハンドラー
export const metricsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const metrics = await metricsService.getMetrics()
    res.set('Content-Type', metricsService.getContentType())
    res.end(metrics)
  } catch (_error) {
    res.status(500).json({
      code: 'METRICS_ERROR',
      message: 'Failed to collect metrics',
    })
  }
}
