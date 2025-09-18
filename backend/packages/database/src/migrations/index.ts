/**
 * Database migration utilities
 */

export { ProgrammaticMigration, type MigrationOptions } from './migration'

// Re-export drizzle migrator for traditional migrations
export { migrate } from 'drizzle-orm/postgres-js/migrator'
