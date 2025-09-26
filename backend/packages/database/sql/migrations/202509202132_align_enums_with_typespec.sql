-- ====================================================================
-- Migration: 202509202132_align_enums_with_typespec.sql
-- Date: 2025-09-20 21:32
-- Purpose: Fix enum misalignments identified between TypeSpec and database
-- Modified: Added idempotency checks for safe re-execution
-- ====================================================================

-- Helper function to check if enum value exists
CREATE OR REPLACE FUNCTION enum_value_exists(enum_type text, enum_value text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = enum_value
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_type)
    );
END;
$$ LANGUAGE plpgsql;

-- 1. Fix service_category enum - add missing values from TypeSpec
DO $$
BEGIN
    -- Check if enum type exists first
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
        -- Add values only if they don't exist
        IF NOT enum_value_exists('service_category', 'styling') THEN
            ALTER TYPE "public"."service_category" ADD VALUE 'styling';
        END IF;
        
        IF NOT enum_value_exists('service_category', 'extension') THEN
            ALTER TYPE "public"."service_category" ADD VALUE 'extension';
        END IF;
    END IF;
END $$;

-- 2. Fix booking_status enum - add 'draft' status from TypeSpec
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        IF NOT enum_value_exists('booking_status', 'draft') THEN
            -- Note: BEFORE clause may not work in all PostgreSQL versions
            -- Using simple ADD VALUE instead
            ALTER TYPE "public"."booking_status" ADD VALUE 'draft';
        END IF;
    END IF;
END $$;

-- 3. Fix payment_status enum - rename 'partial' to 'partial_refund' to match TypeSpec
DO $$
BEGIN
    -- Check if we need to update payment_status enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') 
       AND enum_value_exists('payment_status', 'partial')
       AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_new') THEN
        
        -- Create new enum type with correct values
        CREATE TYPE "public"."payment_status_new" AS ENUM(
            'pending',
            'processing',
            'completed',
            'failed',
            'refunded',
            'partial_refund'
        );

        -- Update all columns that use the old enum
        -- First, drop the default constraint on sales.paymentStatus if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' AND column_name = 'paymentStatus'
        ) THEN
            ALTER TABLE "sales" ALTER COLUMN "paymentStatus" DROP DEFAULT;
        END IF;

        -- Update payment_transactions table if exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
            ALTER TABLE "payment_transactions"
                ALTER COLUMN "status" TYPE "public"."payment_status_new"
                USING CASE
                    WHEN "status"::text = 'partial' THEN 'partial_refund'::payment_status_new
                    ELSE "status"::text::payment_status_new
                END;
        END IF;

        -- Update sales table if exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
            ALTER TABLE "sales"
                ALTER COLUMN "paymentStatus" TYPE "public"."payment_status_new"
                USING CASE
                    WHEN "paymentStatus"::text = 'partial' THEN 'partial_refund'::payment_status_new
                    ELSE "paymentStatus"::text::payment_status_new
                END;

            -- Restore the default constraint
            ALTER TABLE "sales" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'::payment_status_new;
        END IF;

        -- Drop the old type
        DROP TYPE "public"."payment_status";

        -- Rename the new type to the original name
        ALTER TYPE "public"."payment_status_new" RENAME TO "payment_status";
    END IF;
END $$;

-- 4. Fix account_status enum - add 'unverified' and 'locked' from TypeSpec UserAccountStatusType
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        IF NOT enum_value_exists('account_status', 'unverified') THEN
            ALTER TYPE "public"."account_status" ADD VALUE 'unverified';
        END IF;
        
        IF NOT enum_value_exists('account_status', 'locked') THEN
            ALTER TYPE "public"."account_status" ADD VALUE 'locked';
        END IF;
    END IF;
END $$;

-- 5. Create missing enum types from TypeSpec (only if they don't exist)

-- Create notification channel type to match TypeSpec NotificationType
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE "public"."notification_channel" AS ENUM(
            'email',
            'sms',
            'push',
            'line'
        );
    END IF;
END $$;

-- 6. Add column for notification channel if not exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_logs')
       AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'notification_logs'
           AND column_name = 'notificationChannel'
       ) THEN
        
        -- Check if old channel column exists before renaming
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notification_logs' AND column_name = 'channel'
        ) THEN
            -- Rename existing channel column to avoid confusion
            ALTER TABLE "notification_logs" RENAME COLUMN "channel" TO "channelOld";
        END IF;

        -- Add new column with proper enum type
        ALTER TABLE "notification_logs"
            ADD COLUMN "notificationChannel" "public"."notification_channel";

        -- Migrate data if old column existed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notification_logs' AND column_name = 'channelOld'
        ) THEN
            UPDATE "notification_logs"
            SET "notificationChannel" = CASE
                WHEN "channelOld" = 'email' THEN 'email'::notification_channel
                WHEN "channelOld" = 'sms' THEN 'sms'::notification_channel
                WHEN "channelOld" = 'push' THEN 'push'::notification_channel
                WHEN "channelOld" = 'line' THEN 'line'::notification_channel
                ELSE 'email'::notification_channel  -- default fallback
            END;

            -- Drop old column
            ALTER TABLE "notification_logs" DROP COLUMN "channelOld";
        END IF;

        -- Make it NOT NULL after migration
        ALTER TABLE "notification_logs"
            ALTER COLUMN "notificationChannel" SET NOT NULL;
    END IF;
END $$;

-- 7. Create enums for TypeSpec types that don't exist in database yet

-- Hair type enum from customer model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hair_type') THEN
        CREATE TYPE "public"."hair_type" AS ENUM(
            'straight',
            'wavy',
            'curly',
            'coily'
        );
    END IF;
END $$;

-- Hair thickness enum from customer model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hair_thickness') THEN
        CREATE TYPE "public"."hair_thickness" AS ENUM(
            'thin',
            'medium',
            'thick'
        );
    END IF;
END $$;

-- Scalp condition enum from customer model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scalp_condition') THEN
        CREATE TYPE "public"."scalp_condition" AS ENUM(
            'normal',
            'dry',
            'oily',
            'sensitive',
            'dandruff'
        );
    END IF;
END $$;

-- Allergy severity enum from customer model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allergy_severity') THEN
        CREATE TYPE "public"."allergy_severity" AS ENUM(
            'mild',
            'moderate',
            'severe',
            'life_threatening'
        );
    END IF;
END $$;

-- Customer status enum from customer model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE "public"."customer_status" AS ENUM(
            'active',
            'inactive',
            'vip',
            'blacklisted'
        );
    END IF;
END $$;

-- Two-factor status enum from auth model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'two_factor_status') THEN
        CREATE TYPE "public"."two_factor_status" AS ENUM(
            'disabled',
            'pending',
            'enabled'
        );
    END IF;
END $$;

-- Authentication state enum from auth model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authentication_state') THEN
        CREATE TYPE "public"."authentication_state" AS ENUM(
            'unauthenticated',
            'authenticated',
            'pending_two_factor',
            'locked'
        );
    END IF;
END $$;

-- Service option type enum from service model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_option_type') THEN
        CREATE TYPE "public"."service_option_type" AS ENUM(
            'addon',
            'upgrade',
            'duration_extension',
            'product_choice'
        );
    END IF;
END $$;

-- Booking requirement type enum from service model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_requirement') THEN
        CREATE TYPE "public"."booking_requirement" AS ENUM(
            'consultation_required',
            'patch_test_required',
            'advance_booking_required',
            'deposit_required'
        );
    END IF;
END $$;

-- Service availability type enum from service model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_availability') THEN
        CREATE TYPE "public"."service_availability" AS ENUM(
            'always',
            'weekdays_only',
            'weekends_only',
            'by_appointment_only',
            'seasonal'
        );
    END IF;
END $$;

-- Service status type enum from service model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
        CREATE TYPE "public"."service_status" AS ENUM(
            'active',
            'inactive',
            'coming_soon',
            'discontinued'
        );
    END IF;
END $$;

-- Pricing strategy type enum from service model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_strategy') THEN
        CREATE TYPE "public"."pricing_strategy" AS ENUM(
            'fixed',
            'variable',
            'tiered',
            'dynamic',
            'consultation_based'
        );
    END IF;
END $$;

-- 8. Add missing columns to support new TypeSpec model fields (idempotent)

-- Add hair and scalp information columns to customers table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        -- Add columns only if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'hairType') THEN
            ALTER TABLE "customers" ADD COLUMN "hairType" "public"."hair_type";
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'hairThickness') THEN
            ALTER TABLE "customers" ADD COLUMN "hairThickness" "public"."hair_thickness";
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'scalpCondition') THEN
            ALTER TABLE "customers" ADD COLUMN "scalpCondition" "public"."scalp_condition";
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customerStatus') THEN
            ALTER TABLE "customers" ADD COLUMN "customerStatus" "public"."customer_status" DEFAULT 'active';
        END IF;
    END IF;
END $$;

-- Update allergy severity in customer_allergies to use enum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_allergies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_allergies' AND column_name = 'severityType') THEN
            ALTER TABLE "customer_allergies" ADD COLUMN "severityType" "public"."allergy_severity";

            -- Migrate severity integer to enum if severity column exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_allergies' AND column_name = 'severity') THEN
                UPDATE "customer_allergies"
                SET "severityType" = CASE
                    WHEN "severity" <= 2 THEN 'mild'::allergy_severity
                    WHEN "severity" <= 3 THEN 'moderate'::allergy_severity
                    WHEN "severity" <= 4 THEN 'severe'::allergy_severity
                    ELSE 'life_threatening'::allergy_severity
                END
                WHERE "severityType" IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Add two-factor status to users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twoFactorStatus') THEN
            ALTER TABLE "users" ADD COLUMN "twoFactorStatus" "public"."two_factor_status" DEFAULT 'disabled';
        END IF;
    END IF;
END $$;

-- Add authentication state tracking
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'authenticationState') THEN
            ALTER TABLE "sessions" ADD COLUMN "authenticationState" "public"."authentication_state" DEFAULT 'authenticated';
        END IF;
    END IF;
END $$;

-- Add service metadata columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'pricingStrategy') THEN
            ALTER TABLE "services" ADD COLUMN "pricingStrategy" "public"."pricing_strategy" DEFAULT 'fixed';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'serviceStatus') THEN
            ALTER TABLE "services" ADD COLUMN "serviceStatus" "public"."service_status" DEFAULT 'active';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'availability') THEN
            ALTER TABLE "services" ADD COLUMN "availability" "public"."service_availability" DEFAULT 'always';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'bookingRequirements') THEN
            ALTER TABLE "services" ADD COLUMN "bookingRequirements" "public"."booking_requirement"[];
        END IF;
    END IF;
END $$;

-- Add service option type column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_options') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_options' AND column_name = 'optionType') THEN
            ALTER TABLE "service_options" ADD COLUMN "optionType" "public"."service_option_type" DEFAULT 'addon';
        END IF;
    END IF;
END $$;

-- 9. Create indexes for new enum columns (idempotent)
CREATE INDEX IF NOT EXISTS "idx_customers_customer_status" ON "customers" ("customerStatus");
CREATE INDEX IF NOT EXISTS "idx_customers_hair_type" ON "customers" ("hairType");
CREATE INDEX IF NOT EXISTS "idx_services_pricing_strategy" ON "services" ("pricingStrategy");
CREATE INDEX IF NOT EXISTS "idx_services_service_status" ON "services" ("serviceStatus");
CREATE INDEX IF NOT EXISTS "idx_services_availability" ON "services" ("availability");
CREATE INDEX IF NOT EXISTS "idx_users_two_factor_status" ON "users" ("twoFactorStatus");
CREATE INDEX IF NOT EXISTS "idx_sessions_authentication_state" ON "sessions" ("authenticationState");

-- 10. Add comments for documentation (idempotent - will overwrite existing comments)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        COMMENT ON TYPE "public"."notification_channel" IS 'Notification delivery channel types matching TypeSpec NotificationType';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hair_type') THEN
        COMMENT ON TYPE "public"."hair_type" IS 'Hair type categories for customer profiles';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hair_thickness') THEN
        COMMENT ON TYPE "public"."hair_thickness" IS 'Hair thickness categories for customer profiles';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scalp_condition') THEN
        COMMENT ON TYPE "public"."scalp_condition" IS 'Scalp condition types for customer health tracking';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allergy_severity') THEN
        COMMENT ON TYPE "public"."allergy_severity" IS 'Severity levels for customer allergies';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        COMMENT ON TYPE "public"."customer_status" IS 'Customer account status types';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'two_factor_status') THEN
        COMMENT ON TYPE "public"."two_factor_status" IS 'Two-factor authentication status';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authentication_state') THEN
        COMMENT ON TYPE "public"."authentication_state" IS 'User authentication state tracking';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_option_type') THEN
        COMMENT ON TYPE "public"."service_option_type" IS 'Types of service options/addons';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_requirement') THEN
        COMMENT ON TYPE "public"."booking_requirement" IS 'Special requirements for service bookings';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_availability') THEN
        COMMENT ON TYPE "public"."service_availability" IS 'Service availability schedule types';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
        COMMENT ON TYPE "public"."service_status" IS 'Service status lifecycle states';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_strategy') THEN
        COMMENT ON TYPE "public"."pricing_strategy" IS 'Pricing strategy types for services';
    END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS enum_value_exists(text, text);