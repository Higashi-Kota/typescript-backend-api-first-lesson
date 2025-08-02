import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import * as promClient from 'prom-client'
import { match } from 'ts-pattern'

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export type MetricDefinition =
  | {
      type: 'counter'
      name: string
      help: string
      labelNames?: string[]
    }
  | {
      type: 'gauge'
      name: string
      help: string
      labelNames?: string[]
    }
  | {
      type: 'histogram'
      name: string
      help: string
      buckets?: number[]
      labelNames?: string[]
    }
  | {
      type: 'summary'
      name: string
      help: string
      percentiles?: number[]
      maxAgeSeconds?: number
      ageBuckets?: number
      labelNames?: string[]
    }

export type MetricOperation =
  | {
      type: 'increment'
      metric: string
      value?: number
      labels?: Record<string, string>
    }
  | {
      type: 'decrement'
      metric: string
      value?: number
      labels?: Record<string, string>
    }
  | {
      type: 'set'
      metric: string
      value: number
      labels?: Record<string, string>
    }
  | {
      type: 'observe'
      metric: string
      value: number
      labels?: Record<string, string>
    }
  | { type: 'startTimer'; metric: string; labels?: Record<string, string> }

export type SystemMetrics = {
  httpRequestsTotal: promClient.Counter<string>
  httpRequestDurationSeconds: promClient.Histogram<string>
  httpRequestsInFlight: promClient.Gauge<string>
  httpResponseSizeBytes: promClient.Histogram<string>
  dbConnectionPoolActive: promClient.Gauge<string>
  dbConnectionPoolIdle: promClient.Gauge<string>
  dbQueryDurationSeconds: promClient.Histogram<string>
  errorTotal: promClient.Counter<string>
}

export type BusinessMetrics = {
  reservationsTotal: promClient.Counter<string>
  reservationsCancelled: promClient.Counter<string>
  activeUsers: promClient.Gauge<string>
  revenueTotal: promClient.Counter<string>
  averageServiceDuration: promClient.Histogram<string>
  customerSatisfactionScore: promClient.Gauge<string>
  staffUtilizationRate: promClient.Gauge<string>
}

export type MetricsService = {
  init: () => Result<void, Error>
  registerMetric: (definition: MetricDefinition) => Result<void, Error>
  recordMetric: (operation: MetricOperation) => Result<void, Error>
  getMetrics: () => Promise<string>
  getContentType: () => string
  system: SystemMetrics
  business: BusinessMetrics
}

const createSystemMetrics = (): SystemMetrics => ({
  httpRequestsTotal: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),
  httpRequestDurationSeconds: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    labelNames: ['method', 'route', 'status_code'],
  }),
  httpRequestsInFlight: new promClient.Gauge({
    name: 'http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    labelNames: ['method', 'route'],
  }),
  httpResponseSizeBytes: new promClient.Histogram({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    buckets: [100, 1000, 10000, 100000, 1000000],
    labelNames: ['method', 'route', 'status_code'],
  }),
  dbConnectionPoolActive: new promClient.Gauge({
    name: 'db_connection_pool_active',
    help: 'Number of active database connections',
    labelNames: ['pool_name'],
  }),
  dbConnectionPoolIdle: new promClient.Gauge({
    name: 'db_connection_pool_idle',
    help: 'Number of idle database connections',
    labelNames: ['pool_name'],
  }),
  dbQueryDurationSeconds: new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    labelNames: ['operation', 'table'],
  }),
  errorTotal: new promClient.Counter({
    name: 'error_total',
    help: 'Total number of errors',
    labelNames: ['type', 'code'],
  }),
})

const createBusinessMetrics = (): BusinessMetrics => ({
  reservationsTotal: new promClient.Counter({
    name: 'reservations_total',
    help: 'Total number of reservations created',
    labelNames: ['salon_id', 'service_type'],
  }),
  reservationsCancelled: new promClient.Counter({
    name: 'reservations_cancelled_total',
    help: 'Total number of reservations cancelled',
    labelNames: ['salon_id', 'reason'],
  }),
  activeUsers: new promClient.Gauge({
    name: 'active_users',
    help: 'Number of active users',
    labelNames: ['user_type'],
  }),
  revenueTotal: new promClient.Counter({
    name: 'revenue_total_cents',
    help: 'Total revenue in cents',
    labelNames: ['salon_id', 'service_type'],
  }),
  averageServiceDuration: new promClient.Histogram({
    name: 'service_duration_minutes',
    help: 'Duration of services in minutes',
    buckets: [15, 30, 45, 60, 90, 120, 180],
    labelNames: ['salon_id', 'service_type'],
  }),
  customerSatisfactionScore: new promClient.Gauge({
    name: 'customer_satisfaction_score',
    help: 'Average customer satisfaction score (1-5)',
    labelNames: ['salon_id'],
  }),
  staffUtilizationRate: new promClient.Gauge({
    name: 'staff_utilization_rate',
    help: 'Staff utilization rate as a percentage',
    labelNames: ['salon_id', 'staff_id'],
  }),
})

export const createMetricsService = (): MetricsService => {
  const customMetrics = new Map<string, promClient.Metric<string>>()
  let isInitialized = false

  const system = createSystemMetrics()
  const business = createBusinessMetrics()

  const init = (): Result<void, Error> => {
    if (isInitialized) {
      return ok(undefined)
    }

    try {
      // デフォルトメトリクスの収集を有効化
      promClient.collectDefaultMetrics({
        prefix: 'beauty_salon_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      })

      isInitialized = true
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error('Failed to initialize metrics')
      )
    }
  }

  const registerMetric = (
    definition: MetricDefinition
  ): Result<void, Error> => {
    if (customMetrics.has(definition.name)) {
      return err(new Error(`Metric ${definition.name} already registered`))
    }

    try {
      const metric = match(definition)
        .with(
          { type: 'counter' },
          ({ name, help, labelNames }) =>
            new promClient.Counter({ name, help, labelNames })
        )
        .with(
          { type: 'gauge' },
          ({ name, help, labelNames }) =>
            new promClient.Gauge({ name, help, labelNames })
        )
        .with(
          { type: 'histogram' },
          ({ name, help, buckets, labelNames }) =>
            new promClient.Histogram({ name, help, buckets, labelNames })
        )
        .with(
          { type: 'summary' },
          ({
            name,
            help,
            percentiles,
            maxAgeSeconds,
            ageBuckets,
            labelNames,
          }) =>
            new promClient.Summary({
              name,
              help,
              percentiles,
              maxAgeSeconds,
              ageBuckets,
              labelNames,
            })
        )
        .exhaustive()

      customMetrics.set(definition.name, metric)
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to register metric ${definition.name}`)
      )
    }
  }

  const recordMetric = (operation: MetricOperation): Result<void, Error> => {
    try {
      return match(operation)
        .with({ type: 'increment' }, ({ metric, value = 1, labels }) => {
          const m =
            customMetrics.get(metric) ?? getSystemOrBusinessMetric(metric)
          if (!m || !(m instanceof promClient.Counter)) {
            return err(new Error(`Counter metric ${metric} not found`))
          }
          if (labels) {
            m.inc(labels, value)
          } else {
            m.inc(value)
          }
          return ok(undefined)
        })
        .with({ type: 'decrement' }, ({ metric, value = 1, labels }) => {
          const m =
            customMetrics.get(metric) ?? getSystemOrBusinessMetric(metric)
          if (!m || !(m instanceof promClient.Gauge)) {
            return err(new Error(`Gauge metric ${metric} not found`))
          }
          if (labels) {
            m.dec(labels, value)
          } else {
            m.dec(value)
          }
          return ok(undefined)
        })
        .with({ type: 'set' }, ({ metric, value, labels }) => {
          const m =
            customMetrics.get(metric) ?? getSystemOrBusinessMetric(metric)
          if (!m || !(m instanceof promClient.Gauge)) {
            return err(new Error(`Gauge metric ${metric} not found`))
          }
          if (labels) {
            m.set(labels, value)
          } else {
            m.set(value)
          }
          return ok(undefined)
        })
        .with({ type: 'observe' }, ({ metric, value, labels }) => {
          const m =
            customMetrics.get(metric) ?? getSystemOrBusinessMetric(metric)
          if (
            !m ||
            !(
              m instanceof promClient.Histogram ||
              m instanceof promClient.Summary
            )
          ) {
            return err(
              new Error(`Histogram/Summary metric ${metric} not found`)
            )
          }
          if (labels) {
            m.observe(labels, value)
          } else {
            m.observe(value)
          }
          return ok(undefined)
        })
        .with({ type: 'startTimer' }, ({ metric, labels }) => {
          const m =
            customMetrics.get(metric) ?? getSystemOrBusinessMetric(metric)
          if (
            !m ||
            !(
              m instanceof promClient.Histogram ||
              m instanceof promClient.Summary
            )
          ) {
            return err(
              new Error(`Histogram/Summary metric ${metric} not found`)
            )
          }
          // タイマーを開始（実際の使用時は返されたタイマーオブジェクトを別途管理が必要）
          if (labels) {
            m.startTimer(labels)
          } else {
            m.startTimer()
          }
          return ok(undefined)
        })
        .exhaustive()
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to record metric')
      )
    }
  }

  const getSystemOrBusinessMetric = (
    name: string
  ): promClient.Metric<string> | undefined => {
    const allMetrics = { ...system, ...business }
    return Object.entries(allMetrics).find(
      ([_, metric]) => 'name' in metric && metric.name === name
    )?.[1]
  }

  const getMetrics = async (): Promise<string> => {
    return promClient.register.metrics()
  }

  const getContentType = (): string => {
    return promClient.register.contentType
  }

  return {
    init,
    registerMetric,
    recordMetric,
    getMetrics,
    getContentType,
    system,
    business,
  }
}
