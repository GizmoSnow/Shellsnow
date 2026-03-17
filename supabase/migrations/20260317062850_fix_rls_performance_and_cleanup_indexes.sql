/*
  # Fix RLS Performance and Clean Up Indexes

  ## Performance Improvements
  
  1. **RLS Policy Optimization**
     - Update all `auth.uid()` calls to use `(select auth.uid())` pattern
     - Prevents re-evaluation of auth functions for each row
     - Significantly improves query performance at scale
     - Affects policies on:
       - `import_batches` (4 policies)
       - `activity_import_candidates` (4 policies)
  
  2. **Index Cleanup**
     - Remove duplicate index `idx_import_candidates_batch_id`
     - Keep `idx_candidates_batch_id` as the primary batch_id index
     - Remove unused indexes that add overhead:
       - `idx_candidates_user_id`
       - `idx_candidates_include`
       - `idx_import_candidates_status`
       - `idx_import_candidates_deleted`
       - `idx_import_batches_user_id`
       - `idx_candidates_errors`
       - `idx_candidates_warnings`
       - `idx_candidates_skip_reason`
       - `roadmaps_updated_at_idx`
  
  3. **Function Security Hardening**
     - Fix search_path vulnerabilities in trigger functions
     - Set explicit search_path to prevent security issues
  
  ## Notes
  - All RLS policies maintain the same security model
  - Only performance optimization, no functional changes
  - Indexes can be recreated later if usage patterns change
*/

-- Drop RLS policies for import_batches
DROP POLICY IF EXISTS "Users can view own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can create own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can update own import batches" ON import_batches;
DROP POLICY IF EXISTS "Users can delete own import batches" ON import_batches;

-- Recreate import_batches policies with optimized auth.uid() calls
CREATE POLICY "Users can view own import batches"
  ON import_batches
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own import batches"
  ON import_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own import batches"
  ON import_batches
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own import batches"
  ON import_batches
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop RLS policies for activity_import_candidates
DROP POLICY IF EXISTS "Users can view own roadmap import candidates" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can create import candidates for own roadmaps" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can update own import candidates" ON activity_import_candidates;
DROP POLICY IF EXISTS "Users can delete own import candidates" ON activity_import_candidates;

-- Recreate activity_import_candidates policies with optimized auth.uid() calls
CREATE POLICY "Users can view own roadmap import candidates"
  ON activity_import_candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM import_batches
      WHERE import_batches.id = activity_import_candidates.batch_id
      AND import_batches.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create import candidates for own roadmaps"
  ON activity_import_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM import_batches
      WHERE import_batches.id = activity_import_candidates.batch_id
      AND import_batches.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own import candidates"
  ON activity_import_candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM import_batches
      WHERE import_batches.id = activity_import_candidates.batch_id
      AND import_batches.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM import_batches
      WHERE import_batches.id = activity_import_candidates.batch_id
      AND import_batches.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own import candidates"
  ON activity_import_candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM import_batches
      WHERE import_batches.id = activity_import_candidates.batch_id
      AND import_batches.user_id = (select auth.uid())
    )
  );

-- Drop duplicate index (keeping idx_candidates_batch_id)
DROP INDEX IF EXISTS idx_import_candidates_batch_id;

-- Drop unused indexes
DROP INDEX IF EXISTS idx_candidates_user_id;
DROP INDEX IF EXISTS idx_candidates_include;
DROP INDEX IF EXISTS idx_import_candidates_status;
DROP INDEX IF EXISTS idx_import_candidates_deleted;
DROP INDEX IF EXISTS idx_import_batches_user_id;
DROP INDEX IF EXISTS idx_candidates_errors;
DROP INDEX IF EXISTS idx_candidates_warnings;
DROP INDEX IF EXISTS idx_candidates_skip_reason;
DROP INDEX IF EXISTS roadmaps_updated_at_idx;

-- Fix search_path vulnerabilities in trigger functions
CREATE OR REPLACE FUNCTION update_activity_import_candidates_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_import_batches_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
