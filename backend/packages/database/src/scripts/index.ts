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
 * Get a simplified test setup SQL without enums
 * For use in isolated test environments
 */
export function getTestSetupSql(): string {
  return `
-- Simplified test setup SQL with essential tables only
-- Salons table (matching production schema with camelCase columns)
CREATE TABLE "salons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "nameKana" varchar(255),
  "description" text,
  "postalCode" varchar(10),
  "prefecture" varchar(50) NOT NULL,
  "city" varchar(100) NOT NULL,
  "address" varchar(255) NOT NULL,
  "building" varchar(255),
  "latitude" numeric(10, 8),
  "longitude" numeric(11, 8),
  "phoneNumber" varchar(20) NOT NULL,
  "alternativePhone" varchar(20),
  "email" varchar(255) NOT NULL,
  "websiteUrl" varchar(500),
  "logoUrl" varchar(500),
  "imageUrls" jsonb DEFAULT '[]'::jsonb,
  "features" jsonb DEFAULT '[]'::jsonb,
  "amenities" jsonb DEFAULT '[]'::jsonb,
  "businessHours" jsonb,
  "rating" numeric(3, 2),
  "reviewCount" integer DEFAULT 0,
  "timezone" varchar(50) DEFAULT 'Asia/Tokyo' NOT NULL,
  "currency" varchar(3) DEFAULT 'JPY' NOT NULL,
  "taxRate" numeric(5, 2) DEFAULT '10.00' NOT NULL,
  "cancellationPolicy" jsonb,
  "bookingPolicy" jsonb,
  "isActive" boolean DEFAULT true NOT NULL,
  "deletedAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "salons_email_unique" UNIQUE("email")
);

-- Opening hours table (required for salon operations)
CREATE TABLE "opening_hours" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salonId" uuid NOT NULL,
  "dayOfWeek" varchar(20),
  "specificDate" date,
  "openTime" time,
  "closeTime" time,
  "isHoliday" boolean DEFAULT false NOT NULL,
  "holidayName" varchar(100),
  "notes" text,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "opening_hours_salon_id_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE
);

-- Customers table (simplified, matching production naming)
CREATE TABLE "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firstName" varchar(100) NOT NULL,
  "lastName" varchar(100) NOT NULL,
  "firstNameKana" varchar(100),
  "lastNameKana" varchar(100),
  "email" varchar(255) NOT NULL,
  "phoneNumber" varchar(20) NOT NULL,
  "dateOfBirth" date,
  "gender" varchar(10),
  "postalCode" varchar(10),
  "prefecture" varchar(50),
  "city" varchar(100),
  "addressLine1" varchar(255),
  "addressLine2" varchar(255),
  "notes" text,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "loyaltyPoints" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customers_email_unique" UNIQUE("email"),
  CONSTRAINT "customers_phone_unique" UNIQUE("phoneNumber")
);
  `.trim()
}

// Export all functions as SqlScripts namespace for backward compatibility
export const SqlScripts = {
  getSetupSql,
  getDropSql,
  getResetSql,
  parseStatements,
  getEnumStatements,
  getTableStatements,
  getTestSetupSql,
}
