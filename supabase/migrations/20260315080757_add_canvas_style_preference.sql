/*
  # Add Canvas Style Preference

  1. Changes
    - Add `canvas_style` column to `roadmaps` table
      - Type: text with check constraint for 'light' or 'dark'
      - Default: 'light' for existing roadmaps
      - Allows users to choose roadmap canvas presentation style independent of app theme
  
  2. Security
    - No RLS changes needed (inherits existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'canvas_style'
  ) THEN
    ALTER TABLE roadmaps ADD COLUMN canvas_style text DEFAULT 'light' CHECK (canvas_style IN ('light', 'dark'));
  END IF;
END $$;
