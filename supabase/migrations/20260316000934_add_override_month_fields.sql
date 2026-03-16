/*
  # Add Override Month Fields to Import Staging

  1. Changes
    - Add `override_start_month` field to allow manual date correction
    - Add `override_end_month` field to allow manual date correction
    - These fields work with override_start_date and override_end_date
    - Used when user edits dates in import staging modal

  2. Notes
    - Month values are 0-11 (JavaScript Date.getMonth() format)
    - These override the calculated start_month and end_month during import
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'override_start_month'
  ) THEN
    ALTER TABLE activity_import_candidates 
    ADD COLUMN override_start_month integer CHECK (override_start_month >= 0 AND override_start_month <= 11);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'override_end_month'
  ) THEN
    ALTER TABLE activity_import_candidates 
    ADD COLUMN override_end_month integer CHECK (override_end_month >= 0 AND override_end_month <= 11);
  END IF;
END $$;