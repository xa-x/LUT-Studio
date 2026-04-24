-- Current migration: seed the database with sample LUTs
-- This migration creates the `luts` table

CREATE TABLE IF NOT EXISTS `luts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `category` text DEFAULT 'custom' NOT NULL,
  `params` text NOT NULL,
  `thumbnail_url` text,
  `is_sample` integer DEFAULT 0 NOT NULL,
  `is_published` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
