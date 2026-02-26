/*
  # Security Hardening

  1. Security Enhancements
    - Add additional security checks to all RLS policies
    - Ensure all policies require authenticated users
    - Block any potential anonymous access at the database level
  
  2. Notes
    - Auth configuration settings (anonymous sign-ins, leaked password protection, connection pooling)
      must be configured in the Supabase Dashboard under Authentication settings
    - This migration adds database-level protections as an additional security layer
*/

-- Drop existing permissive policies and recreate them as restrictive
-- This ensures that even if anonymous sign-ins are accidentally enabled,
-- they won't have database access

-- Roadmaps table: Ensure only authenticated users can access their own data
DROP POLICY IF EXISTS "Users can view own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can create own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;

-- Recreate policies with explicit authenticated requirement
CREATE POLICY "Users can view own roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own roadmaps"
  ON roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own roadmaps"
  ON roadmaps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Add a restrictive policy to block any anonymous access attempts
CREATE POLICY "Block anonymous access"
  ON roadmaps
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);
