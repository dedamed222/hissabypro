-- Migration to add letterhead and print settings to store_settings
ALTER TABLE "public"."store_settings" ADD COLUMN IF NOT EXISTS "letterhead_url" text;
ALTER TABLE "public"."store_settings" ADD COLUMN IF NOT EXISTS "print_paper_size" text DEFAULT 'A4';
ALTER TABLE "public"."store_settings" ADD COLUMN IF NOT EXISTS "print_orientation" text DEFAULT 'portrait';
ALTER TABLE "public"."store_settings" ADD COLUMN IF NOT EXISTS "print_with_letterhead" boolean DEFAULT false;
ALTER TABLE "public"."store_settings" ADD COLUMN IF NOT EXISTS "print_margins" jsonb DEFAULT '{"top": 0, "bottom": 0, "left": 0, "right": 0}'::jsonb;
