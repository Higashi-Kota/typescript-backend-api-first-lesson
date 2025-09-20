-- Migration to align database enums with TypeSpec API definitions
-- Date: 2025-09-20 21:32
-- Purpose: Fix enum misalignments identified between TypeSpec and database

-- 1. Fix service_category enum - add missing values from TypeSpec
ALTER TYPE "public"."service_category" ADD VALUE IF NOT EXISTS 'styling';
ALTER TYPE "public"."service_category" ADD VALUE IF NOT EXISTS 'extension';

-- 2. Fix booking_status enum - add 'draft' status from TypeSpec
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';

-- 3. Fix payment_status enum - rename 'partial' to 'partial_refund' to match TypeSpec
-- Note: PostgreSQL doesn't allow renaming enum values directly, so we need to:
-- a) Create new type
-- b) Convert columns
-- c) Drop old type
-- d) Rename new type

DO $$
BEGIN
    -- Check if we need to update payment_status enum
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'partial'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    ) THEN
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
        -- First, drop the default constraint on sales.paymentStatus
        ALTER TABLE "sales" ALTER COLUMN "paymentStatus" DROP DEFAULT;

        ALTER TABLE "payment_transactions"
            ALTER COLUMN "status" TYPE "public"."payment_status_new"
            USING CASE
                WHEN "status"::text = 'partial' THEN 'partial_refund'::payment_status_new
                ELSE "status"::text::payment_status_new
            END;

        ALTER TABLE "sales"
            ALTER COLUMN "paymentStatus" TYPE "public"."payment_status_new"
            USING CASE
                WHEN "paymentStatus"::text = 'partial' THEN 'partial_refund'::payment_status_new
                ELSE "paymentStatus"::text::payment_status_new
            END;

        -- Restore the default constraint
        ALTER TABLE "sales" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'::payment_status_new;

        -- Drop the old type
        DROP TYPE "public"."payment_status";

        -- Rename the new type to the original name
        ALTER TYPE "public"."payment_status_new" RENAME TO "payment_status";
    END IF;
END $$;

-- 4. Fix account_status enum - add 'unverified' and 'locked' from TypeSpec UserAccountStatusType
ALTER TYPE "public"."account_status" ADD VALUE IF NOT EXISTS 'unverified' AFTER 'active';
ALTER TYPE "public"."account_status" ADD VALUE IF NOT EXISTS 'locked' AFTER 'inactive';

-- 5. Create missing enum types from TypeSpec

-- Create enum for point transaction types (missing in TypeSpec but needed in DB)
-- Keep this as-is since it's DB-specific for tracking
-- No changes needed

-- Create notification channel type to match TypeSpec NotificationType
-- The existing notification_type in DB is actually for notification categories
-- We need a separate enum for notification channels
CREATE TYPE "public"."notification_channel" AS ENUM(
    'email',
    'sms',
    'push',
    'line'
);

-- 6. Add column for notification channel if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notification_logs'
        AND column_name = 'notificationChannel'
    ) THEN
        -- Rename existing channel column to avoid confusion
        ALTER TABLE "notification_logs" RENAME COLUMN "channel" TO "channelOld";

        -- Add new column with proper enum type
        ALTER TABLE "notification_logs"
            ADD COLUMN "notificationChannel" "public"."notification_channel";

        -- Migrate data
        UPDATE "notification_logs"
        SET "notificationChannel" = CASE
            WHEN "channelOld" = 'email' THEN 'email'::notification_channel
            WHEN "channelOld" = 'sms' THEN 'sms'::notification_channel
            WHEN "channelOld" = 'push' THEN 'push'::notification_channel
            WHEN "channelOld" = 'line' THEN 'line'::notification_channel
            ELSE 'email'::notification_channel  -- default fallback
        END;

        -- Make it NOT NULL after migration
        ALTER TABLE "notification_logs"
            ALTER COLUMN "notificationChannel" SET NOT NULL;

        -- Drop old column
        ALTER TABLE "notification_logs" DROP COLUMN "channelOld";
    END IF;
END $$;

-- 7. Create enums for TypeSpec types that don't exist in database yet

-- Hair type enum from customer model
CREATE TYPE "public"."hair_type" AS ENUM(
    'straight',
    'wavy',
    'curly',
    'coily'
);

-- Hair thickness enum from customer model
CREATE TYPE "public"."hair_thickness" AS ENUM(
    'thin',
    'medium',
    'thick'
);

-- Scalp condition enum from customer model
CREATE TYPE "public"."scalp_condition" AS ENUM(
    'normal',
    'dry',
    'oily',
    'sensitive',
    'dandruff'
);

-- Allergy severity enum from customer model
CREATE TYPE "public"."allergy_severity" AS ENUM(
    'mild',
    'moderate',
    'severe',
    'life_threatening'
);

-- Customer status enum from customer model
CREATE TYPE "public"."customer_status" AS ENUM(
    'active',
    'inactive',
    'vip',
    'blacklisted'
);

-- Two-factor status enum from auth model
CREATE TYPE "public"."two_factor_status" AS ENUM(
    'disabled',
    'pending',
    'enabled'
);

-- Authentication state enum from auth model
CREATE TYPE "public"."authentication_state" AS ENUM(
    'unauthenticated',
    'authenticated',
    'pending_two_factor',
    'locked'
);

-- Service option type enum from service model
CREATE TYPE "public"."service_option_type" AS ENUM(
    'addon',
    'upgrade',
    'duration_extension',
    'product_choice'
);

-- Booking requirement type enum from service model
CREATE TYPE "public"."booking_requirement" AS ENUM(
    'consultation_required',
    'patch_test_required',
    'advance_booking_required',
    'deposit_required'
);

-- Service availability type enum from service model
CREATE TYPE "public"."service_availability" AS ENUM(
    'always',
    'weekdays_only',
    'weekends_only',
    'by_appointment_only',
    'seasonal'
);

-- Service status type enum from service model
CREATE TYPE "public"."service_status" AS ENUM(
    'active',
    'inactive',
    'coming_soon',
    'discontinued'
);

-- Pricing strategy type enum from service model
CREATE TYPE "public"."pricing_strategy" AS ENUM(
    'fixed',
    'variable',
    'tiered',
    'dynamic',
    'consultation_based'
);

-- 8. Add missing columns to support new TypeSpec model fields

-- Add hair and scalp information columns to customers table
ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "hairType" "public"."hair_type",
    ADD COLUMN IF NOT EXISTS "hairThickness" "public"."hair_thickness",
    ADD COLUMN IF NOT EXISTS "scalpCondition" "public"."scalp_condition",
    ADD COLUMN IF NOT EXISTS "customerStatus" "public"."customer_status" DEFAULT 'active';

-- Update allergy severity in customer_allergies to use enum
ALTER TABLE "customer_allergies"
    ADD COLUMN IF NOT EXISTS "severityType" "public"."allergy_severity";

-- Migrate severity integer to enum
UPDATE "customer_allergies"
SET "severityType" = CASE
    WHEN "severity" <= 2 THEN 'mild'::allergy_severity
    WHEN "severity" <= 3 THEN 'moderate'::allergy_severity
    WHEN "severity" <= 4 THEN 'severe'::allergy_severity
    ELSE 'life_threatening'::allergy_severity
END
WHERE "severityType" IS NULL;

-- Add two-factor status to users table
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "twoFactorStatus" "public"."two_factor_status" DEFAULT 'disabled';

-- Add authentication state tracking
ALTER TABLE "sessions"
    ADD COLUMN IF NOT EXISTS "authenticationState" "public"."authentication_state" DEFAULT 'authenticated';

-- Add service metadata columns
ALTER TABLE "services"
    ADD COLUMN IF NOT EXISTS "pricingStrategy" "public"."pricing_strategy" DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS "serviceStatus" "public"."service_status" DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "availability" "public"."service_availability" DEFAULT 'always',
    ADD COLUMN IF NOT EXISTS "bookingRequirements" "public"."booking_requirement"[];

-- Add service option type column
ALTER TABLE "service_options"
    ADD COLUMN IF NOT EXISTS "optionType" "public"."service_option_type" DEFAULT 'addon';

-- 9. Create indexes for new enum columns
CREATE INDEX IF NOT EXISTS "idx_customers_customer_status" ON "customers" ("customerStatus");
CREATE INDEX IF NOT EXISTS "idx_customers_hair_type" ON "customers" ("hairType");
CREATE INDEX IF NOT EXISTS "idx_services_pricing_strategy" ON "services" ("pricingStrategy");
CREATE INDEX IF NOT EXISTS "idx_services_service_status" ON "services" ("serviceStatus");
CREATE INDEX IF NOT EXISTS "idx_services_availability" ON "services" ("availability");
CREATE INDEX IF NOT EXISTS "idx_users_two_factor_status" ON "users" ("twoFactorStatus");
CREATE INDEX IF NOT EXISTS "idx_sessions_authentication_state" ON "sessions" ("authenticationState");

-- 10. Add comments for documentation
COMMENT ON TYPE "public"."notification_channel" IS 'Notification delivery channel types matching TypeSpec NotificationType';
COMMENT ON TYPE "public"."hair_type" IS 'Hair type categories for customer profiles';
COMMENT ON TYPE "public"."hair_thickness" IS 'Hair thickness categories for customer profiles';
COMMENT ON TYPE "public"."scalp_condition" IS 'Scalp condition types for customer health tracking';
COMMENT ON TYPE "public"."allergy_severity" IS 'Severity levels for customer allergies';
COMMENT ON TYPE "public"."customer_status" IS 'Customer account status types';
COMMENT ON TYPE "public"."two_factor_status" IS 'Two-factor authentication status';
COMMENT ON TYPE "public"."authentication_state" IS 'User authentication state tracking';
COMMENT ON TYPE "public"."service_option_type" IS 'Types of service options/addons';
COMMENT ON TYPE "public"."booking_requirement" IS 'Special requirements for service bookings';
COMMENT ON TYPE "public"."service_availability" IS 'Service availability schedule types';
COMMENT ON TYPE "public"."service_status" IS 'Service status lifecycle states';
COMMENT ON TYPE "public"."pricing_strategy" IS 'Pricing strategy types for services';