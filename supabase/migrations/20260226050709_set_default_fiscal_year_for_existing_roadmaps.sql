/*
  # Set Default Fiscal Year Values for Existing Roadmaps

  1. Changes
    - Update all existing roadmaps with NULL fiscal year values to have defaults
    - fiscal_start_month: 0 (January)
    - base_fiscal_year: 26 (FY26)
    - roadmap_start_quarter: 1 (Q1)

  2. Notes
    - This ensures backward compatibility with roadmaps created before fiscal year support
    - New roadmaps will use the defaults set in the column definitions
*/

UPDATE roadmaps
SET 
  fiscal_start_month = 0,
  base_fiscal_year = 26,
  roadmap_start_quarter = 1
WHERE 
  fiscal_start_month IS NULL 
  OR base_fiscal_year IS NULL 
  OR roadmap_start_quarter IS NULL;
