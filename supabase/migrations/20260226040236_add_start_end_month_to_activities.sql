/*
  # Add Start Month and End Month fields for activity positioning

  1. Changes
    - This migration adds flexibility for activities to span across months and quarters
    - Activities are stored in JSONB, so no schema changes needed
    - This is a documentation migration to track the data structure change
  
  2. New Activity Structure
    - Activities now support `start_month` and `end_month` fields
    - Format: "q1-jan", "q1-feb", "q1-mar", "q2-apr", etc.
    - Special value: "full-quarter" for activities spanning entire quarter
    - Backward compatibility: Activities without these fields default to full quarter
  
  3. Notes
    - Existing activities continue to work (stored in JSONB)
    - The position field (early/mid/late/full) is deprecated but maintained for backward compatibility
    - Pills can now span across quarter boundaries seamlessly
*/

-- No schema changes needed as activities are stored in JSONB
-- This migration serves as documentation for the data structure enhancement
