import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: '../../packages/database/src/schema.ts',
  out: './scripts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
