-- AlterTable: Add custom_guidelines column to style_profiles
ALTER TABLE "style_profiles" ADD COLUMN IF NOT EXISTS "custom_guidelines" TEXT;
