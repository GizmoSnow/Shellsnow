/*
  # Add Import Diagnostics and Error Tracking

  ## Overview
  Adds comprehensive error tracking, validation diagnostics, and duplicate detection
  to the import workspace for production-grade error handling.

  ## Changes to activity_import_candidates table
  
  1. New diagnostic fields:
    - `warnings` (text[]): Array of warning messages for this row
    - `errors` (text[]): Array of error messages that prevented import
    - `skip_reason` (text): Explanation if row was skipped
    - `duplicate_detection` (jsonb): Details about duplicate matches
    - `validation_details` (jsonb): Validation results and field-level issues
  
  2. New adapter diagnostic fields:
    - `adapter_scores` (jsonb): Score breakdown for all tested adapters
    - `detected_adapter` (text): Name of the adapter that was selected
    - `field_mappings` (jsonb): Shows which source fields mapped to which normalized fields
  
  ## Changes to import_batches table
  
  1. Summary tracking:
    - `failed_count` (integer): Number of rows that failed validation
    - `skipped_count` (integer): Number of rows skipped (e.g., duplicates)
    - `last_import_summary` (jsonb): Detailed results from last import operation
  
  ## Security
  - No RLS changes needed - inherits from existing policies
*/

-- Add diagnostic fields to activity_import_candidates
ALTER TABLE activity_import_candidates 
  ADD COLUMN IF NOT EXISTS warnings text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS errors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skip_reason text,
  ADD COLUMN IF NOT EXISTS duplicate_detection jsonb,
  ADD COLUMN IF NOT EXISTS validation_details jsonb,
  ADD COLUMN IF NOT EXISTS adapter_scores jsonb,
  ADD COLUMN IF NOT EXISTS detected_adapter text,
  ADD COLUMN IF NOT EXISTS field_mappings jsonb;

-- Add summary tracking to import_batches
ALTER TABLE import_batches
  ADD COLUMN IF NOT EXISTS failed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_import_summary jsonb;

-- Create index for querying rows with errors/warnings
CREATE INDEX IF NOT EXISTS idx_candidates_errors ON activity_import_candidates 
  USING gin(errors) WHERE array_length(errors, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_candidates_warnings ON activity_import_candidates 
  USING gin(warnings) WHERE array_length(warnings, 1) > 0;

-- Create index for skip reasons
CREATE INDEX IF NOT EXISTS idx_candidates_skip_reason ON activity_import_candidates (skip_reason)
  WHERE skip_reason IS NOT NULL;