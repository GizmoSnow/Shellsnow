/*
  # Add Success Path Labels Support

  1. Overview
    This migration adds support for editable Success Path row labels in the roadmap builder.
    Each quarter cell in the Success Path row can now have a custom label.

  2. Changes Made
    The roadmap data JSON structure now supports:
    - Success Path Labels: Custom labels for each quarter in the Success Path row
    - Default values: Q1 defaults to "Success Path", Q2-Q4 default to "Success Path Review"
    - Users can edit any cell independently to customize labels for their specific needs

  3. Data Structure
    Success Path labels stored in RoadmapData.successPathLabels:
    - q1: string (default: "Success Path")
    - q2: string (default: "Success Path Review")
    - q3: string (default: "Success Path Review")
    - q4: string (default: "Success Path Review")

  4. Use Cases
    - Mid-year roadmaps can adjust Q1 label to "Success Path Review" if needed
    - Teams can use custom terminology (e.g., "Checkpoint", "Milestone Review")
    - Different cadences can be reflected (e.g., "Monthly Review", "Bi-weekly Check-in")

  5. Notes
    No database table changes required - using existing JSONB data column
    Labels save automatically via existing auto-save mechanism
    Changes persist across sessions and are user-specific per roadmap
*/

-- This is a documentation-only migration
-- No actual schema changes needed as we're using the existing JSONB data column
-- The application will handle the new data structure

SELECT 1;
