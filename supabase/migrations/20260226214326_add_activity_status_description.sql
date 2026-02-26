/*
  # Add Activity Status and Description Support

  This migration adds support for activity status tracking and descriptions.
  Since activities are stored in JSONB columns within the roadmaps table,
  this migration serves as documentation of the new data structure.

  ## New Activity Fields

  Activities within the `data` JSONB column now support:
  - `status` (optional): One of 'on_track', 'at_risk', 'blocked'
    - Default: 'on_track'
    - Used to track activity health
  - `description` (optional): Text description for additional activity details
    - Provides context and details about the activity

  ## Notes

  - No schema changes needed as data is stored in JSONB
  - These fields are optional and backward compatible
  - Existing activities without these fields will default to 'on_track' status
  - UI has been updated to support creating and editing these fields
*/

-- No actual migration needed - this file documents the JSONB structure changes
SELECT 1;
