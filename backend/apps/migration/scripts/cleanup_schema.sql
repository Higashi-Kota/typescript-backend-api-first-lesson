-- Cleanup schema migration
-- Created: 2025-07-30
-- Description: Drop all database objects in the correct order to avoid dependency issues

-- Drop all tables in reverse order of creation
DROP TABLE IF EXISTS booking_reservations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS staff_working_hours CASCADE;
DROP TABLE IF EXISTS opening_hours CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS salons CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS service_category CASCADE;
DROP TYPE IF EXISTS two_factor_status CASCADE;
DROP TYPE IF EXISTS user_account_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;