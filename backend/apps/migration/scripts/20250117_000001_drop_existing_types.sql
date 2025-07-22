-- Drop existing types if they exist to avoid conflicts
DROP TYPE IF EXISTS "public"."booking_status" CASCADE;
DROP TYPE IF EXISTS "public"."day_of_week" CASCADE;
DROP TYPE IF EXISTS "public"."reservation_status" CASCADE;
DROP TYPE IF EXISTS "public"."service_category" CASCADE;