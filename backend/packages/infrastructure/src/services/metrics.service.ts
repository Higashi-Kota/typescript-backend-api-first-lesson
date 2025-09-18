/**
 * Metrics Service
 * Provides application metrics collection and reporting
 */

import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client'

// Create a registry for metrics
export const metricsRegistry = new Registry()

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: metricsRegistry })

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
})

// HTTP request counter
export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
})

// Business metrics
export const businessMetrics = {
  bookingsCreated: new Counter({
    name: 'bookings_created_total',
    help: 'Total number of bookings created',
    labelNames: ['salon_id', 'service_type'],
    registers: [metricsRegistry],
  }),

  bookingsCancelled: new Counter({
    name: 'bookings_cancelled_total',
    help: 'Total number of bookings cancelled',
    labelNames: ['salon_id', 'reason'],
    registers: [metricsRegistry],
  }),

  customersRegistered: new Counter({
    name: 'customers_registered_total',
    help: 'Total number of new customer registrations',
    registers: [metricsRegistry],
  }),

  paymentProcessed: new Counter({
    name: 'payments_processed_total',
    help: 'Total number of payments processed',
    labelNames: ['method', 'status'],
    registers: [metricsRegistry],
  }),

  paymentAmount: new Histogram({
    name: 'payment_amount',
    help: 'Payment amounts in the system',
    labelNames: ['method'],
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    registers: [metricsRegistry],
  }),
}

// Export helper to get metrics
export function getMetrics(): string {
  return metricsRegistry.metrics()
}

// Export helper for content type
export function getMetricsContentType(): string {
  return metricsRegistry.contentType
}
