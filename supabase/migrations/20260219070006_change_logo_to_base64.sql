/*
  # Change customer logo storage to base64

  1. Changes
    - Drop `customer_logo_url` column from `roadmaps` table
    - Add `customer_logo_base64` column to store base64-encoded logo images
    - This eliminates the need for external storage and simplifies logo management
  
  2. Notes
    - Base64 storage allows logos to work seamlessly in both web and PowerPoint export
    - Supports PNG, JPG, JPEG, SVG, and GIF formats
    - No file size restrictions needed as logos are typically small
*/

-- Add customer_logo_base64 column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'customer_logo_base64'
  ) THEN
    ALTER TABLE roadmaps ADD COLUMN customer_logo_base64 text;
  END IF;
END $$;

-- Drop customer_logo_url column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'customer_logo_url'
  ) THEN
    ALTER TABLE roadmaps DROP COLUMN customer_logo_url;
  END IF;
END $$;