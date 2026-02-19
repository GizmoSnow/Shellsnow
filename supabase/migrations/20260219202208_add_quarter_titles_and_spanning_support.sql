/*
  # Add Quarter Titles and Spanning Activities Support

  1. Overview
    This migration adds support for editable quarter column titles and spanning activities
    that stretch across multiple quarters in the roadmap builder.

  2. Changes Made
    The roadmap data JSON structure now supports:
    - Quarter Titles: Custom labels for each quarter column
    - Spanning Activities: Activities that stretch across multiple quarters

  3. Data Structure
    Quarter titles stored in RoadmapData.quarterTitles (q1, q2, q3, q4)
    Spanning activities stored in Initiative.spanning array with quarters array

  4. Notes
    No database table changes required - using existing JSONB data column
    Quarter titles save automatically via existing auto-save mechanism
    Spanning activities are stored separately from regular quarter activities
*/

-- This is a documentation-only migration
-- No actual schema changes needed as we're using the existing JSONB data column
-- The application will handle the new data structure

SELECT 1;