/**
 * Test Application Setup
 * Creates Express app instance for testing
 */

import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import salonRoutes from '../../routes/salon'

// 依存関係の型
export type AppDependencies = {
  database: import('@beauty-salon-backend/infrastructure').Database
  logger?: ReturnType<typeof import('pino').pino>
}

export const createApp = (deps: AppDependencies): Express => {
  const app = express()

  // Store dependencies in app.locals for route access
  app.locals.database = deps.database
  app.locals.logger = deps.logger

  // Basic middleware
  app.use(helmet())
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
      credentials: true,
    }),
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
