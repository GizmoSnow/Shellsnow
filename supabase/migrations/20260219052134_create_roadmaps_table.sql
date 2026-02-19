/*
  # Create roadmaps table

  1. New Tables
    - `roadmaps`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `data` (jsonb) - stores the complete roadmap state including goals, initiatives, and activities
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `roadmaps` table
    - Add policy for authenticated users to read their own roadmaps
    - Add policy for authenticated users to insert their own roadmaps
    - Add policy for authenticated users to update their own roadmaps
    - Add policy for authenticated users to delete their own roadmaps
*/

CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Roadmap',
  data jsonb NOT NULL DEFAULT '{"goals": []}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roadmaps"
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

CREATE INDEX IF NOT EXISTS roadmaps_user_id_idx ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS roadmaps_updated_at_idx ON roadmaps(updated_at DESC);