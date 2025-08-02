import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: '../../packages/infrastructure/src/database/schema.ts',
  out: './scripts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
