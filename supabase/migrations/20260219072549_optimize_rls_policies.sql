/*
  # Optimize RLS Policies for Performance
  
  ## Overview
  This migration optimizes the Row Level Security (RLS) policies on the roadmaps table
  to improve query performance at scale.
  
  ## Changes Made
  
  ### Performance Optimization
  - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
  - This prevents the auth function from being re-evaluated for each row
  - Significantly improves query performance when dealing with large datasets
  
  ### Policies Updated
  1. **Users can read own roadmaps** - SELECT policy optimized
  2. **Users can insert own roadmaps** - INSERT policy optimized  
  3. **Users can update own roadmaps** - UPDATE policy optimized
  4. **Users can delete own roadmaps** - DELETE policy optimized
  
  ## Technical Details
  
  Without the subquery, PostgreSQL re-evaluates `auth.uid()` for every single row
  being checked. With the subquery `(select auth.uid())`, the function is evaluated
  once and the result is reused for all rows, providing much better performance.
  
  ## Security Impact
  
  This change maintains the same security guarantees while improving performance.
  Users can still only access their own roadmaps.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can insert own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can read own roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own roadmaps"
  ON roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own roadmaps"
  ON roadmaps
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);