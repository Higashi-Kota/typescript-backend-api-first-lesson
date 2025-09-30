import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import type { Environment } from './env'

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Load environment-specific configuration file
 * @param environment - The target environment (defaults to NODE_ENV or 'localhost')
 * @returns The loaded environment
 */
export function loadEnvConfig(environment?: Environment): Environment {
  // Determine the environment
  const env =
    environment || (process.env.NODE_ENV as Environment) || 'localhost'

  // Validate environment
  const validEnvironments: Environment[] = [
    'production',
    'staging',
    'development',
    'test',
    'localhost',
  ]
  if (!validEnvironments.includes(env)) {
    console.warn(`Invalid environment: ${env}, falling back to localhost`)
    return loadEnvConfig('localhost')
  }

  // Find the root path (where .env files are located)
  // From backend/packages/config/src to root is 4 levels up
  const rootPath = path.resolve(__dirname, '..', '..', '..', '..')

  // Priority 1: Check if .env file exists (highest priority)
  const baseEnvPath = path.join(rootPath, '.env')
  if (fs.existsSync(baseEnvPath)) {
    console.log(`Loading base .env file (priority override)`)
    dotenv.config({ path: baseEnvPath })

    // Still return the intended environment for consistency
    // but the values will be from .env file
    return env
  }

  // Priority 2: Load environment-specific file
  const envFile = `.env.${env}`
  const envPath = path.join(rootPath, envFile)

  // Check if environment file exists
  if (!fs.existsSync(envPath)) {
    console.warn(
      `Environment file ${envFile} not found at ${envPath}, falling back to .env.localhost`,
    )
    const localhostPath = path.join(rootPath, '.env.localhost')
    if (fs.existsSync(localhostPath)) {
      dotenv.config({ path: localhostPath })
      return 'localhost'
    }
  }

  // Load the environment file
  console.log(`Loading environment: ${env} from ${envFile}`)
  dotenv.config({ path: envPath })

  return env
}

/**
 * Get database connection URL based on environment
 */
export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
      process.env.POSTGRES_PASSWORD || 'postgres'
    }@${process.env.DB_HOST || 'localhost'}:${
      process.env.POSTGRES_PORT || 5432
    }/${process.env.POSTGRES_DB || 'beauty_salon'}`
  )
}
