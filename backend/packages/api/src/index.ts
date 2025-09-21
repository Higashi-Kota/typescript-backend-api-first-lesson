/**
 * Express Application Setup
 */

import compression from 'compression'
import cors from 'cors'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import express, { type Express } from 'express'
import helmet from 'helmet'
import salonRoutes from './routes/salon.routes'

// 依存関係の型
export type AppDependencies = {
  database: PostgresJsDatabase<Record<string, unknown>>
  logger?: ReturnType<typeof import('pino').pino>
}

export const createApp = (_deps: AppDependencies): Express => {
  const app = express()

  // Basic middleware
  app.use(helmet())
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
      credentials: true,
    })
  )
  app.use(compression())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // API routes
  app.use('/api/v1', salonRoutes)

  return app
}
