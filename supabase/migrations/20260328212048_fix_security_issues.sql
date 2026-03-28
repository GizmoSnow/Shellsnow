/*
  # Fix Security Issues

  ## Changes Made
  
  1. **Add Missing Indexes on Foreign Keys**
     - Add index on `activity_import_candidates.user_id` to improve query performance
     - Add index on `import_batches.user_id` to improve query performance
  
  2. **Restrict Anonymous Access**
     - Ensure all RLS policies require authentication
     - Remove any policies that allow anonymous access
  
  ## Security Improvements
  
  - Foreign key indexes improve query performance and prevent potential DoS through slow queries
  - Authentication requirements ensure only authorized users can access data
  
  ## Notes
  
  - The Auth DB Connection Strategy and Leaked Password Protection settings must be changed in the Supabase Dashboard under Project Settings > Database and Auth respectively
  - These cannot be modified via SQL migrations
*/

-- Add indexes for foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS idx_activity_import_candidates_user_id 
  ON activity_import_candidates(user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user_id 
  ON import_batches(user_id);

-- Verify all RLS policies require authentication
-- Drop and recreate policies to ensure they are restrictive

-- activity_import_candidates policies
DROP POLICY IF EXISTS "Users can view own staging records" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can insert own staging records" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can update own staging records" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can delete own staging records" ON activity_import_candidates;

CREATE POLICY "Users can view own staging records"
  ON activity_import_candidates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own staging records"
  ON activity_import_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staging records"
  ON activity_import_candidates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own staging records"
  ON activity_import_candidates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- import_batches policies
DROP POLICY IF EXISTS "Users can view own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can insert own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can update own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can delete own import batches" ON import_batches;

CREATE POLICY "Users can view own import batches"
  ON import_batches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import batches"
  ON import_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import batches"
  ON import_batches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import batches"
  ON import_batches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure all existing tables have proper authentication requirements
-- Verify roadmaps table policies
DROP POLICY IF EXISTS "Users can view own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can insert own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;

CREATE POLICY "Users can view own roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmaps"
  ON roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmaps"
  ON roadmaps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
