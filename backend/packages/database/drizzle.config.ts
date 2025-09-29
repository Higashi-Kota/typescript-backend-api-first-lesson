import { getDatabaseUrl, loadEnvConfig } from '@beauty-salon-backend/config'
import type { Config } from 'drizzle-kit'

// Load environment-specific configuration
const environment = loadEnvConfig()

// Get database URL from environment
const databaseUrl = getDatabaseUrl()

// Log which environment is being used
console.log(
  `Using ${environment.toUpperCase()} environment for Drizzle configuration`,
)

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  introspect: {
    casing: 'camel',
  },
} satisfies Config
