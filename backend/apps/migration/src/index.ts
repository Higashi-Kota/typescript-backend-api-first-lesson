/**
 * @beauty-salon-backend/migration
 *
 * Database migration utilities for the beauty salon backend.
 * Supports both production migrations and test environment schema isolation.
 */

// Export programmatic migration for dynamic schema support
export {
  ProgrammaticMigration,
  type MigrationOptions,
} from './programmatic-migration.js'

// Re-export drizzle migrator for traditional migrations
export { migrate } from 'drizzle-orm/postgres-js/migrator'
