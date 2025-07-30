import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface MigrationOptions {
  schemaName?: string
}

export class ProgrammaticMigration {
  constructor(private readonly db: PostgresJsDatabase) {}

  /**
   * Get the path to the scripts directory
   */
  private getScriptsPath(): string {
    const currentFile = fileURLToPath(import.meta.url)
    const currentDir = dirname(currentFile)
    return join(currentDir, '../scripts')
  }

  /**
   * Create schema and set search path
   */
  private async setupSchema(schemaName: string): Promise<void> {
    if (schemaName !== 'public') {
      // Create schema if it doesn't exist
      await this.db.execute(
        sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
      )
    }

    // Set search path for the session
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
  }

  /**
   * Create all enums in the current schema
   */
  private async createEnums(schemaName: string): Promise<void> {
    // Ensure search path is set
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )

    // Create enums using raw SQL - they'll be created in the current schema
    const enumSql = `
      -- Drop existing types if they exist
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS day_of_week CASCADE;
      DROP TYPE IF EXISTS reservation_status CASCADE;
      DROP TYPE IF EXISTS service_category CASCADE;
      DROP TYPE IF EXISTS two_factor_status CASCADE;
      DROP TYPE IF EXISTS user_account_status CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS file_type CASCADE;

      -- Create enum types
      CREATE TYPE booking_status AS ENUM('draft', 'confirmed', 'cancelled', 'completed', 'no_show');
      CREATE TYPE day_of_week AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
      CREATE TYPE reservation_status AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
      CREATE TYPE service_category AS ENUM('cut', 'color', 'perm', 'treatment', 'spa', 'other');
      CREATE TYPE two_factor_status AS ENUM('disabled', 'pending', 'enabled');
      CREATE TYPE user_account_status AS ENUM('active', 'unverified', 'locked', 'suspended', 'deleted');
      CREATE TYPE user_role AS ENUM('customer', 'staff', 'admin');
      CREATE TYPE file_type AS ENUM('image', 'document', 'other');
    `

    try {
      await this.db.execute(sql.raw(enumSql))
    } catch (error) {
      console.error('Failed to create enums:', error)
      throw error
    }
  }

  /**
   * Create all tables and constraints
   */
  private async createTables(schemaName: string): Promise<void> {
    // Ensure search path is set
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
    // Read the migration SQL file
    const scriptsPath = this.getScriptsPath()
    const migrationPath = join(
      scriptsPath,
      '20250730_000001_initial_schema.sql'
    )
    let migrationSql = readFileSync(migrationPath, 'utf-8')

    // Remove all schema qualifiers - we're already in the correct search path
    migrationSql = migrationSql
      // Remove schema from type definitions
      .replace(/"public"\./g, '')
      // Remove schema from foreign key references in table definitions
      .replace(/REFERENCES\s+"public"\./g, 'REFERENCES ')
      // Remove schema from ALTER TABLE foreign key constraints
      .replace(/REFERENCES\s+"public"\."(\w+)"/g, 'REFERENCES "$1"')
      // Skip enum creation (we already created them)
      .replace(/DROP TYPE IF EXISTS[^;]+;/g, '')
      .replace(/CREATE TYPE[^;]+;/g, '')

    // Execute the cleaned migration SQL
    await this.db.execute(sql.raw(migrationSql))
  }

  /**
   * Run the migration to set up the database schema
   */
  async up(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName || 'public'

    try {
      // Setup schema and search path
      await this.setupSchema(schemaName)

      // Create enums first
      await this.createEnums(schemaName)

      // Create tables
      await this.createTables(schemaName)

      // Add file upload tables if missing from initial migration
      await this.addFileUploadTables(schemaName)
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  /**
   * Add file upload related tables
   */
  private async addFileUploadTables(schemaName: string): Promise<void> {
    // Ensure search path is set
    await this.db.execute(
      sql`SET search_path TO ${sql.identifier(schemaName)}, public`
    )
    const fileUploadSql = `
      -- Create attachments table if not exists
      CREATE TABLE IF NOT EXISTS attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        key text NOT NULL UNIQUE,
        filename text NOT NULL,
        content_type text NOT NULL,
        size integer NOT NULL,
        file_type file_type NOT NULL,
        uploaded_by uuid NOT NULL,
        salon_id uuid,
        metadata jsonb,
        tags jsonb,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT attachments_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE restrict ON UPDATE no action,
        CONSTRAINT attachments_salon_id_salons_id_fk FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE cascade ON UPDATE no action
      );

      -- Create share_links table if not exists
      CREATE TABLE IF NOT EXISTS share_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        token text NOT NULL UNIQUE,
        attachment_id uuid NOT NULL,
        expires_at timestamp,
        max_downloads integer,
        download_count integer DEFAULT 0 NOT NULL,
        password_hash text,
        allowed_emails jsonb,
        created_by uuid NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT share_links_attachment_id_attachments_id_fk FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE cascade ON UPDATE no action,
        CONSTRAINT share_links_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE restrict ON UPDATE no action
      );

      -- Create download_logs table if not exists
      CREATE TABLE IF NOT EXISTS download_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        attachment_id uuid NOT NULL,
        share_link_id uuid,
        downloaded_by uuid,
        ip_address text,
        user_agent text,
        downloaded_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT download_logs_attachment_id_attachments_id_fk FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE cascade ON UPDATE no action,
        CONSTRAINT download_logs_share_link_id_share_links_id_fk FOREIGN KEY (share_link_id) REFERENCES share_links(id) ON DELETE cascade ON UPDATE no action,
        CONSTRAINT download_logs_downloaded_by_users_id_fk FOREIGN KEY (downloaded_by) REFERENCES users(id) ON DELETE set null ON UPDATE no action
      );

      -- Create indexes for file upload tables
      CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_attachments_salon_id ON attachments(salon_id);
      CREATE INDEX IF NOT EXISTS idx_share_links_attachment_id ON share_links(attachment_id);
      CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
      CREATE INDEX IF NOT EXISTS idx_download_logs_attachment_id ON download_logs(attachment_id);
    `

    await this.db.execute(sql.raw(fileUploadSql))
  }

  /**
   * Drop all tables and types in the schema
   */
  async down(options?: MigrationOptions): Promise<void> {
    const schemaName = options?.schemaName || 'public'

    if (schemaName === 'public') {
      // For public schema, drop individual objects
      const scriptsPath = this.getScriptsPath()
      const cleanupPath = join(scriptsPath, 'cleanup_schema.sql')
      const cleanupSql = readFileSync(cleanupPath, 'utf-8')

      await this.db.execute(sql.raw(cleanupSql))
    } else {
      // For test schemas, just drop the entire schema
      await this.db.execute(
        sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
      )
    }
  }
}
