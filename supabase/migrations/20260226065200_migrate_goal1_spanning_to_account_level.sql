/*
  # Migrate Goal #1 Spanning Activities to Account Level

  1. Purpose
    - Move specific spanning activities from Goal #1 to account-level
    - Targets: "Biweekly Leadership Meetings", "Monthly Team Meetings", "Test"
    - Keeps "Test 1" and "Test 2" as regular activities in Goal #1
  
  2. Implementation
    - Updates the JSONB data column for each roadmap
    - Extracts matching spanning activities from first goal's first initiative
    - Adds them to accountSpanning array at root level
    - Removes them from the goal's initiative
  
  3. Safety
    - Only processes roadmaps where Goal #1 exists
    - Preserves all other data
    - Idempotent - can be run multiple times safely
*/

DO $$
DECLARE
  roadmap_record RECORD;
  updated_data JSONB;
  goal_data JSONB;
  initiative_data JSONB;
  spanning_activities JSONB;
  account_spanning JSONB;
  activity JSONB;
  new_spanning JSONB;
BEGIN
  FOR roadmap_record IN 
    SELECT id, data 
    FROM roadmaps 
    WHERE data->'goals'->0->'initiatives'->0->'spanning' IS NOT NULL
  LOOP
    updated_data := roadmap_record.data;
    
    goal_data := updated_data->'goals'->0;
    IF goal_data IS NULL THEN
      CONTINUE;
    END IF;
    
    initiative_data := goal_data->'initiatives'->0;
    IF initiative_data IS NULL THEN
      CONTINUE;
    END IF;
    
    spanning_activities := initiative_data->'spanning';
    IF spanning_activities IS NULL OR jsonb_array_length(spanning_activities) = 0 THEN
      CONTINUE;
    END IF;
    
    account_spanning := COALESCE(updated_data->'accountSpanning', '[]'::jsonb);
    new_spanning := '[]'::jsonb;
    
    FOR activity IN SELECT * FROM jsonb_array_elements(spanning_activities)
    LOOP
      IF activity->>'name' IN ('Biweekly Leadership Meetings', 'Monthly Team Meetings', 'Test') THEN
        account_spanning := account_spanning || jsonb_build_array(activity);
      ELSE
        new_spanning := new_spanning || jsonb_build_array(activity);
      END IF;
    END LOOP;
    
    updated_data := jsonb_set(updated_data, '{accountSpanning}', account_spanning);
    
    updated_data := jsonb_set(
      updated_data,
      ARRAY['goals', '0', 'initiatives', '0', 'spanning'],
      new_spanning
    );
    
    UPDATE roadmaps
    SET data = updated_data
    WHERE id = roadmap_record.id;
    
  END LOOP;
END $$;