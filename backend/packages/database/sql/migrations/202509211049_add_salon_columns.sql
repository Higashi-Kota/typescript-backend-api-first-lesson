-- Add missing columns to salons table
ALTER TABLE "salons" ADD COLUMN "businessHours" jsonb;
ALTER TABLE "salons" ADD COLUMN "rating" numeric(3, 2);
ALTER TABLE "salons" ADD COLUMN "reviewCount" integer DEFAULT 0;