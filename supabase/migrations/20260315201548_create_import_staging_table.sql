/*
  # Create Activity Import Staging Table

  1. New Tables
    - `activity_import_candidates`
      - Stores normalized activity candidates from CSV/Excel imports
      - Supports three source systems: OrgCS Engagement, Org62 Support, Org62 Training
      - Provides staging area for review and editing before creating roadmap activities
      - Grouped by batch_id for bulk import operations

  2. Fields
    - `id` (uuid, primary key) - Unique candidate identifier
    - `batch_id` (uuid) - Groups candidates from same import session
    - `roadmap_id` (uuid, foreign key) - Target roadmap for import
    - `user_id` (uuid, foreign key) - User who created the import
    - `source_system` (text) - Source report type
    - `source_type` (text) - Activity source category
    - `source_record_id` (text) - Original record ID from source system
    - `raw_title` (text) - Original title from source
    - `raw_template` (text) - Original template/type from source
    - `raw_stage` (text) - Original stage from source
    - `start_date` (date) - Parsed start date
    - `end_date` (date) - Parsed end date
    - `normalized_title` (text) - Cleaned/normalized title
    - `normalized_category` (text) - Mapped category
    - `owner` (text) - Activity owner (salesforce/partner/customer)
    - `activity_type` (text) - Type: standard/spanning/quarter
    - `start_month` (integer) - Month index (1-12)
    - `end_month` (integer) - Month index (1-12)
    - `quarters` (text[]) - Quarter tags (q1/q2/q3/q4)
    - `health` (text) - Health status
    - `status` (text) - Activity status
    - `confidence` (integer) - Confidence score (0-100)
    - `flags` (text[]) - Warning/info flags
    - `include` (boolean) - Whether to include in final import
    - `override_title` (text) - User-edited title override
    - `override_start_date` (date) - User-edited start date
    - `override_end_date` (date) - User-edited end date
    - `override_activity_type` (text) - User-edited activity type
    - `override_owner` (text) - User-edited owner
    - `override_status` (text) - User-edited status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  3. Security
    - Enable RLS on `activity_import_candidates` table
    - Users can view candidates for roadmaps they own
    - Users can insert candidates for roadmaps they own
    - Users can update candidates they created
    - Users can delete candidates they created

  4. Indexes
    - Index on batch_id for batch operations
    - Index on roadmap_id for filtering by roadmap
    - Index on user_id for filtering by user
*/

-- Create the staging table
CREATE TABLE IF NOT EXISTS activity_import_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source metadata
  source_system text NOT NULL CHECK (source_system IN ('orgcs_engagement', 'org62_support', 'org62_training')),
  source_type text NOT NULL CHECK (source_type IN ('engagement', 'support', 'training')),
  source_record_id text,

  -- Raw source data
  raw_title text NOT NULL,
  raw_template text,
  raw_stage text,

  -- Parsed dates
  start_date date,
  end_date date,

  -- Normalized data
  normalized_title text NOT NULL,
  normalized_category text,

  -- Activity properties
  owner text NOT NULL DEFAULT 'salesforce' CHECK (owner IN ('salesforce', 'partner', 'customer')),
  activity_type text NOT NULL DEFAULT 'standard' CHECK (activity_type IN ('standard', 'spanning', 'quarter')),
  start_month integer CHECK (start_month >= 1 AND start_month <= 12),
  end_month integer CHECK (end_month >= 1 AND end_month <= 12),
  quarters text[] DEFAULT '{}',

  -- Status fields
  health text CHECK (health IN ('on_track', 'at_risk', 'blocked')),
  status text CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),

  -- Metadata
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  flags text[] DEFAULT '{}',
  include boolean NOT NULL DEFAULT true,

  -- User overrides
  override_title text,
  override_start_date date,
  override_end_date date,
  override_activity_type text CHECK (override_activity_type IN ('standard', 'spanning', 'quarter')),
  override_owner text CHECK (override_owner IN ('salesforce', 'partner', 'customer')),
  override_status text CHECK (override_status IN ('not_started', 'in_progress', 'completed', 'cancelled')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_batch_id ON activity_import_candidates(batch_id);
CREATE INDEX IF NOT EXISTS idx_candidates_roadmap_id ON activity_import_candidates(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON activity_import_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_include ON activity_import_candidates(include) WHERE include = true;

-- Enable RLS
ALTER TABLE activity_import_candidates ENABLE ROW LEVEL SECURITY;

-- Users can view candidates for roadmaps they own
CREATE POLICY "Users can view own roadmap import candidates"
  ON activity_import_candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = activity_import_candidates.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

-- Users can insert candidates for roadmaps they own
CREATE POLICY "Users can create import candidates for own roadmaps"
  ON activity_import_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

-- Users can update their own candidates
CREATE POLICY "Users can update own import candidates"
  ON activity_import_candidates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own candidates
CREATE POLICY "Users can delete own import candidates"
  ON activity_import_candidates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_activity_import_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_import_candidates_updated_at
  BEFORE UPDATE ON activity_import_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_import_candidates_updated_at();
