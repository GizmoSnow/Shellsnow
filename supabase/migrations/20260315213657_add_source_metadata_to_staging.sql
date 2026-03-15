/*
  # Add Source Metadata to Import Staging

  1. Changes
    - Add `source_account_name` column to store the account/customer name from source
    - Add `source_org_name` column to store the source organization identifier
    - Add `source_template_name` column to store template/type information
    - Add `source_stage_raw` column to store the raw stage/status from source
    - Add `source_report_type` column to store the type of report/export

  2. Notes
    - These fields are optional and only populated when available in source data
    - Used to create concise metadata blocks in activity descriptions
    - Helps distinguish activities imported from multiple orgs for same customer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'source_account_name'
  ) THEN
    ALTER TABLE activity_import_candidates ADD COLUMN source_account_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'source_org_name'
  ) THEN
    ALTER TABLE activity_import_candidates ADD COLUMN source_org_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'source_template_name'
  ) THEN
    ALTER TABLE activity_import_candidates ADD COLUMN source_template_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'source_stage_raw'
  ) THEN
    ALTER TABLE activity_import_candidates ADD COLUMN source_stage_raw text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'source_report_type'
  ) THEN
    ALTER TABLE activity_import_candidates ADD COLUMN source_report_type text;
  END IF;
END $$;