/**
 * Database migration utilities
 */

// Re-export drizzle migrator for traditional migrations
export { migrate } from 'drizzle-orm/postgres-js/migrator'
export { type MigrationOptions, ProgrammaticMigration } from './migration'
