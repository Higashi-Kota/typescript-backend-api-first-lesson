-- ====================================================================
-- Migration: 202509240239_rename_specific_date_to_date.sql
-- Date: 2025-09-24 02:00
-- Purpose: Rename specificDate column to date in opening_hours table
-- Modified: Added idempotency checks for safe re-execution
-- ====================================================================

DO $$
BEGIN
  -- Check if specificDate column exists and date column doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opening_hours' AND column_name = 'specificDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opening_hours' AND column_name = 'date'
  ) THEN
    -- Rename the column
    ALTER TABLE opening_hours RENAME COLUMN "specificDate" TO date;

    -- Drop old index if exists
    DROP INDEX IF EXISTS idx_opening_hours_specific_date;

    -- Create new index with updated name
    CREATE INDEX IF NOT EXISTS idx_opening_hours_date ON opening_hours(date);
  END IF;

  -- Make dayOfWeek NOT NULL if it's currently nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opening_hours'
    AND column_name = 'dayOfWeek'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default values for existing NULL values before making NOT NULL
    UPDATE opening_hours SET "dayOfWeek" = 'monday' WHERE "dayOfWeek" IS NULL;
    ALTER TABLE opening_hours ALTER COLUMN "dayOfWeek" SET NOT NULL;
  END IF;

  -- Make date NOT NULL if it's currently nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opening_hours'
    AND column_name = 'date'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default values for existing NULL values before making NOT NULL
    UPDATE opening_hours SET date = CURRENT_DATE WHERE date IS NULL;
    ALTER TABLE opening_hours ALTER COLUMN date SET NOT NULL;
  END IF;
END $$;