-- Migration to add letterhead_url field to the customers table
ALTER TABLE "public"."customers" ADD COLUMN IF NOT EXISTS "letterhead_url" text;
