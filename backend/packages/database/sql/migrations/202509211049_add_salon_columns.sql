-- ====================================================================
-- Migration: 202509211049_add_salon_columns.sql  
-- Date: 2025-09-21 10:49
-- Purpose: Add missing columns to salons table
-- Modified: Added idempotency checks for safe re-execution
-- ====================================================================

-- Add missing columns to salons table (idempotent)
DO $$
BEGIN
    -- Check if salons table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salons') THEN
        
        -- Add businessHours column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'salons' AND column_name = 'businessHours'
        ) THEN
            ALTER TABLE "salons" ADD COLUMN "businessHours" jsonb;
        END IF;
        
        -- Add rating column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'salons' AND column_name = 'rating'
        ) THEN
            ALTER TABLE "salons" ADD COLUMN "rating" numeric(3, 2);
        END IF;
        
        -- Add reviewCount column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'salons' AND column_name = 'reviewCount'
        ) THEN
            ALTER TABLE "salons" ADD COLUMN "reviewCount" integer DEFAULT 0;
        END IF;
        
    END IF;
END $$;

-- Add indexes for new columns (idempotent)
CREATE INDEX IF NOT EXISTS "idx_salons_rating" ON "salons" ("rating");
CREATE INDEX IF NOT EXISTS "idx_salons_review_count" ON "salons" ("reviewCount");

-- Add comments for documentation (idempotent - will overwrite existing comments)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salons' AND column_name = 'businessHours'
    ) THEN
        COMMENT ON COLUMN "salons"."businessHours" IS 'Business operating hours in JSON format';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salons' AND column_name = 'rating'
    ) THEN
        COMMENT ON COLUMN "salons"."rating" IS 'Average customer rating (1.00 - 5.00)';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salons' AND column_name = 'reviewCount'
    ) THEN
        COMMENT ON COLUMN "salons"."reviewCount" IS 'Total number of customer reviews';
    END IF;
END $$;