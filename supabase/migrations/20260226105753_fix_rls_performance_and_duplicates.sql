/*
  # Fix RLS Performance and Remove Duplicate Policies

  ## Overview
  This migration resolves critical security and performance issues identified by Supabase advisors.

  ## Issues Addressed

  ### 1. RLS Performance Optimization
  - **Problem**: RLS policies re-evaluate `auth.uid()` for each row, causing poor performance at scale
  - **Solution**: Replace `auth.uid()` with `(select auth.uid())` to evaluate once per query
  - **Impact**: Significant performance improvement for large datasets

  ### 2. Duplicate Permissive Policies
  - **Problem**: Multiple permissive policies exist for the same actions
    - Two SELECT policies: "Users can read own roadmaps" and "Users can view own roadmaps"
    - Two INSERT policies: "Users can insert own roadmaps" and "Users can create own roadmaps"
  - **Solution**: Drop all existing policies and create a single optimized set
  - **Impact**: Cleaner policy structure, easier to maintain

  ## Changes Made

  ### Policies Removed
  - All existing duplicate policies are dropped

  ### Policies Created
  1. **Users can view own roadmaps** (SELECT)
     - Allows authenticated users to read only their own roadmaps
     - Uses optimized `(select auth.uid())` pattern
     - Includes NULL check for additional security

  2. **Users can create own roadmaps** (INSERT)
     - Allows authenticated users to create roadmaps for themselves
     - Uses optimized `(select auth.uid())` pattern
     - Includes NULL check for additional security

  3. **Users can update own roadmaps** (UPDATE)
     - Allows authenticated users to update only their own roadmaps
     - Uses optimized `(select auth.uid())` pattern
     - Includes NULL check for additional security

  4. **Users can delete own roadmaps** (DELETE)
     - Allows authenticated users to delete only their own roadmaps
     - Uses optimized `(select auth.uid())` pattern
     - Includes NULL check for additional security

  5. **Block anonymous access** (RESTRICTIVE)
     - Prevents any anonymous access to roadmaps
     - Applied as a restrictive policy for defense in depth

  ## Security Guarantees

  - Users can ONLY access their own roadmaps
  - Anonymous users have NO access to roadmaps
  - Authentication is required for all operations
  - Performance is optimized for scale

  ## Notes

  The following issues require Supabase Dashboard configuration changes:
  - **Auth DB Connection Strategy**: Change from fixed count (10) to percentage-based allocation
  - **Anonymous Access**: Review if anonymous sign-ins should be disabled
  - **Leaked Password Protection**: Enable HaveIBeenPwned.org integration in Auth settings
*/

-- Drop ALL existing policies to ensure no duplicates
DROP POLICY IF EXISTS "Users can read own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can insert own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can view own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can create own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Block anonymous access" ON roadmaps;

-- Create optimized policies with (select auth.uid()) pattern
-- This evaluates auth.uid() once per query instead of once per row

CREATE POLICY "Users can view own roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can create own roadmaps"
  ON roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update own roadmaps"
  ON roadmaps
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL);

-- Add restrictive policy to block anonymous access
CREATE POLICY "Block anonymous access"
  ON roadmaps
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
