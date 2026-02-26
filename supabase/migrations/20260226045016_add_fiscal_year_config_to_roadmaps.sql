/*
  # Add Fiscal Year Configuration to Roadmaps

  1. Changes
    - Add fiscal_start_month column (0-11, where 0=January, 11=December)
    - Add base_fiscal_year column (e.g., 26 for FY26)
    - Add roadmap_start_quarter column (1-4)
    - Set default values for existing roadmaps (January start, base year 26, Q1 start)

  2. Notes
    - fiscal_start_month uses 0-based indexing to match JavaScript Date.getMonth()
    - These settings define the quarter/month structure for the entire roadmap
    - roadmap_start_quarter determines which quarter is displayed first (can wrap across fiscal years)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'fiscal_start_month'
  ) THEN
    ALTER TABLE roadmaps ADD COLUMN fiscal_start_month integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'base_fiscal_year'
  ) THEN
    ALTER TABLE roadmaps ADD COLUMN base_fiscal_year integer DEFAULT 26 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmaps' AND column_name = 'roadmap_start_quarter'
  ) THEN
    ALTER TABLE roadmaps ADD COLUMN roadmap_start_quarter integer DEFAULT 1 NOT NULL;
  END IF;
END $$;

ALTER TABLE roadmaps ADD CONSTRAINT fiscal_start_month_range CHECK (fiscal_start_month >= 0 AND fiscal_start_month <= 11);
ALTER TABLE roadmaps ADD CONSTRAINT roadmap_start_quarter_range CHECK (roadmap_start_quarter >= 1 AND roadmap_start_quarter <= 4);
