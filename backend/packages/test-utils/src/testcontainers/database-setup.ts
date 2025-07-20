import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export class TestDatabaseSetup {
  constructor(private readonly db: PostgresJsDatabase) {}

  async createEnums(): Promise<void> {
    // Create all enum types used in the schema
    await this.db.execute(sql`
      DO $$ 
      BEGIN
        -- User related enums
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_account_status') THEN
          CREATE TYPE user_account_status AS ENUM ('active', 'unverified', 'locked', 'suspended', 'deleted');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'two_factor_status') THEN
          CREATE TYPE two_factor_status AS ENUM ('disabled', 'pending', 'enabled');
        END IF;
        
        -- Other enums
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
          CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
          CREATE TYPE service_category AS ENUM ('cut', 'color', 'perm', 'treatment', 'spa', 'other');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
          CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
          CREATE TYPE booking_status AS ENUM ('draft', 'confirmed', 'cancelled', 'completed', 'no_show');
        END IF;
      END$$;
    `)
  }

  async createUsersTable(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'customer',
        status user_account_status NOT NULL DEFAULT 'unverified',
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token TEXT,
        email_verification_token_expiry TIMESTAMP,
        two_factor_status two_factor_status NOT NULL DEFAULT 'disabled',
        two_factor_secret TEXT,
        backup_codes JSONB,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_at TIMESTAMP,
        password_reset_token TEXT,
        password_reset_token_expiry TIMESTAMP,
        last_password_change_at TIMESTAMP,
        password_history JSONB,
        trusted_ip_addresses JSONB,
        customer_id UUID,
        staff_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        last_login_ip TEXT
      )
    `)
  }

  async setupDatabase(): Promise<void> {
    await this.createEnums()
    await this.createUsersTable()
  }

  async cleanupDatabase(): Promise<void> {
    // Drop all tables (this will cascade to dependent objects)
    await this.db.execute(sql`
      DROP TABLE IF EXISTS users CASCADE
    `)
  }
}
