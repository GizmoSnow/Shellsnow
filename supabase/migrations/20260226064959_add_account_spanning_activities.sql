/*
  # Add Account-Level Spanning Activities

  1. Changes
    - Account-level spanning activities are stored in the roadmap data JSON
    - No schema changes needed as they're part of the existing JSONB data column
    - This migration is a placeholder to document the feature addition
  
  2. Data Structure
    - accountSpanning array is added to RoadmapData interface
    - Contains spanning activities not tied to any specific goal
    - Appears between Success Path row and Goal sections in UI
  
  3. Notes
    - Account spanning activities work the same as goal-level spanning activities
    - They can span multiple quarters across the roadmap
    - Used for engagement-wide activities like "Biweekly Leadership Meetings"
*/

-- No schema changes needed, data structure is part of JSONB column
SELECT 1;