-- Reset database schema
-- This script completely resets the database by dropping and recreating the public schema
-- WARNING: This will delete ALL data!

-- Drop the public schema with all its contents
DROP SCHEMA IF EXISTS public CASCADE;

-- Recreate the public schema
CREATE SCHEMA public;

-- Restore default permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Optional: Add any extensions that should be available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";