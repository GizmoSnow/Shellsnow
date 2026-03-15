/*
  # Import Workspace Infrastructure

  1. New Tables
    - `import_batches`
      - `id` (uuid, primary key) - batch identifier
      - `user_id` (uuid, foreign key) - owner of the batch
      - `roadmap_id` (uuid, foreign key) - associated roadmap
      - `batch_name` (text) - user-friendly batch name
      - `file_name` (text) - original uploaded file name
      - `source_system` (text) - detected source system
      - `source_type` (text) - detected report type
      - `notes` (text, nullable) - optional user notes
      - `total_rows` (integer) - total candidates in batch
      - `imported_count` (integer) - how many have been imported
      - `ignored_count` (integer) - how many are marked as ignored
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes to `activity_import_candidates`
    - Add `batch_name` (text) - denormalized for quick display
    - Add `file_name` (text) - denormalized for quick display
    - Add `import_status` (text) - 'pending', 'imported', 'ignored'
    - Add `imported_at` (timestamp, nullable) - when it was imported
    - Add `goal_id` (text, nullable) - allocated goal
    - Add `initiative` (text, nullable) - allocated initiative name
    - Add `is_deleted` (boolean) - soft delete flag

  3. Security
    - Enable RLS on `import_batches` table
    - Add policies for authenticated users to manage their own batches
    - Update policies on `activity_import_candidates` to handle new workflow

  4. Indexes
    - Add index on `activity_import_candidates.batch_id` for fast batch queries
    - Add index on `activity_import_candidates.import_status` for filtering
    - Add index on `import_batches.user_id` for user-specific queries
*/

-- Create import_batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL,
  batch_name text NOT NULL,
  file_name text NOT NULL,
  source_system text NOT NULL,
  source_type text,
  notes text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add new columns to activity_import_candidates
ALTER TABLE activity_import_candidates 
  ADD COLUMN IF NOT EXISTS batch_name text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS import_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS goal_id text,
  ADD COLUMN IF NOT EXISTS initiative text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Add check constraint for import_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'activity_import_candidates_import_status_check'
  ) THEN
    ALTER TABLE activity_import_candidates 
      ADD CONSTRAINT activity_import_candidates_import_status_check 
      CHECK (import_status IN ('pending', 'imported', 'ignored'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_candidates_batch_id 
  ON activity_import_candidates(batch_id);

CREATE INDEX IF NOT EXISTS idx_import_candidates_status 
  ON activity_import_candidates(import_status);

CREATE INDEX IF NOT EXISTS idx_import_candidates_deleted 
  ON activity_import_candidates(is_deleted);

CREATE INDEX IF NOT EXISTS idx_import_batches_user_id 
  ON import_batches(user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_roadmap_id 
  ON import_batches(roadmap_id);

-- Enable RLS on import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_batches
CREATE POLICY "Users can view own import batches"
  ON import_batches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own import batches"
  ON import_batches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import batches"
  ON import_batches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import batches"
  ON import_batches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp on import_batches
CREATE OR REPLACE FUNCTION update_import_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_import_batches_timestamp'
  ) THEN
    CREATE TRIGGER update_import_batches_timestamp
      BEFORE UPDATE ON import_batches
      FOR EACH ROW
      EXECUTE FUNCTION update_import_batches_updated_at();
  END IF;
END $$;