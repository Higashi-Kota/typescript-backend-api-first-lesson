-- Example migration file with YYYYMMDDHHMM format
-- Created: 2025-01-15 15:00
-- 
-- This is an example migration file showing the naming convention.
-- Actual migrations should contain DDL statements like:
-- 
-- CREATE TABLE IF NOT EXISTS ...
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
-- CREATE INDEX IF NOT EXISTS ...
-- 
-- Always use IF EXISTS/IF NOT EXISTS for idempotency

-- Example: Add age column to customers table
-- ALTER TABLE customers ADD COLUMN IF NOT EXISTS age INTEGER;

-- Example: Create index on email
-- CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Example: Add check constraint
-- ALTER TABLE customers ADD CONSTRAINT IF NOT EXISTS check_age CHECK (age >= 0 AND age <= 150);