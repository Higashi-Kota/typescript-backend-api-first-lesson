import * as path from 'node:path'
import * as dotenv from 'dotenv'
import type { Config } from 'drizzle-kit'

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../')
dotenv.config({ path: path.join(rootPath, '.env.localhost') })

// Parse DATABASE_URL or use individual environment variables
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'beauty_salon'}`

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
