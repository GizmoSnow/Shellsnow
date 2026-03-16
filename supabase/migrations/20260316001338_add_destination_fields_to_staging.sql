/*
  # Add Destination Fields to Import Staging

  1. Changes
    - Add `goal_id` field to track target goal for import
    - Add `initiative_id` field to track target initiative for import (optional)
    - These fields allow users to assign destination before importing

  2. Validation Rules
    - Goal is required before import
    - Initiative is required only if the selected goal has initiatives
    - If goal has no initiatives, activity goes directly under goal

  3. Notes
    - These fields are set in the staging modal or quick import summary
    - Import validation checks these before creating pills
    - Missing destination causes clear validation error
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE activity_import_candidates 
    ADD COLUMN goal_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_import_candidates' AND column_name = 'initiative_id'
  ) THEN
    ALTER TABLE activity_import_candidates 
    ADD COLUMN initiative_id text;
  END IF;
END $$;