// Export SQL script utilities for use in other packages
import { DROP_SQL, RESET_SQL, SETUP_SQL } from './sql-content'

/**
 * Get the setup SQL script
 * Contains all table definitions, indexes, and constraints
 */
export function getSetupSql(): string {
  return SETUP_SQL
}

/**
 * Get the drop SQL script
 * Drops all tables and types
 */
export function getDropSql(): string {
  return DROP_SQL
}

/**
 * Get the reset SQL script
 * Combination of drop and recreate
 */
export function getResetSql(): string {
  return RESET_SQL
}

/**
 * Parse SQL into individual statements
 * Splits on semicolons and filters out empty statements and comments
 */
export function parseStatements(sql: string): string[] {
  // Handle multi-line statements properly
  const statements = []
  let currentStatement = ''

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue
    }

    currentStatement += `${line}\n`

    // Check if line ends with semicolon
    if (trimmedLine.endsWith(';')) {
      const finalStatement = currentStatement.trim()
      if (finalStatement.length > 0) {
        statements.push(finalStatement.replace(/;$/, ''))
      }
      currentStatement = ''
    }
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim())
  }

  return statements
}

/**
 * Extract enum type creation statements from setup SQL
 */
export function getEnumStatements(): string[] {
  const setupSql = getSetupSql()
  const statements = parseStatements(setupSql)
  return statements.filter((stmt) => stmt.includes('CREATE TYPE'))
}

/**
 * Extract table creation statements from setup SQL
 */
export function getTableStatements(): string[] {
  const setupSql = getSetupSql()
  const statements = parseStatements(setupSql)
  return statements.filter(
    (stmt) =>
      stmt.includes('CREATE TABLE') ||
      stmt.includes('ALTER TABLE') ||
      stmt.includes('CREATE INDEX')
  )
}

/**
 * Get migrations SQL for test setup
 * For tests, we use the complete setup.sql which already includes all migrations
 * This is the current state of the schema with all migrations applied
 */
export function getMigrationsSql(): string {
  // The setup.sql file is generated from the current schema state
  // and already includes all migrations applied to the database
  // No need to apply migrations separately as they're already incorporated
  return getSetupSql()
}

/**
 * Get test setup SQL that uses the current schema state
 * This ensures test schema matches production exactly by using
 * the generated setup.sql which includes all applied migrations
 */
export function getTestSetupSql(): string {
  // Use the current schema state from setup.sql
  // This file is generated from Drizzle schema and includes all migrations
  return getMigrationsSql()
}

// Export all functions as SqlScripts namespace for backward compatibility
export const SqlScripts = {
  getSetupSql,
  getDropSql,
  getResetSql,
  parseStatements,
  getEnumStatements,
  getTableStatements,
  getMigrationsSql,
  getTestSetupSql,
}
