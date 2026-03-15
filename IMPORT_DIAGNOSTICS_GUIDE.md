# Import Diagnostics & Error Handling Guide

## Overview

The import workspace now includes production-grade diagnostics and error handling to help you understand and resolve issues with imported data.

## Features

### 1. Row-Level Error & Warning Details

Each import candidate now tracks:

- **Errors**: Validation failures that prevent import (e.g., missing required fields)
- **Warnings**: Issues that don't block import but should be reviewed (e.g., low confidence classification)
- **Skip Reasons**: Explanation for why a row was excluded (e.g., duplicate detected)
- **Duplicate Detection**: Identifies if the row matches an existing pill or candidate

#### Visual Indicators

In the staging table, rows with issues display badges:
- 🔴 Red badge: Validation errors
- 🟡 Yellow badge: Warnings
- 🟠 Orange badge: Duplicate detected

Click the chevron icon (▶) to expand row details and see:
- Full error messages
- Warning descriptions
- Duplicate match information
- Validation details

### 2. Batch-Level Import Summary

After importing activities, you'll see a comprehensive summary:

```
Import Complete:
- 18 rows imported
- 4 rows ignored
- 3 rows skipped
- 2 rows failed validation
```

The Import Workspace shows enhanced progress tracking:
- Imported count
- Ignored count (user-excluded)
- Skipped count (duplicates, etc.)
- Failed count (validation errors)
- Pending count

### 3. Enhanced Diagnostics Panel

The diagnostics panel now shows:

#### Adapter Detection
- **Score Breakdown**: Visual bars showing confidence for each tested adapter
- **Detected Format**: Which adapter was selected and why

#### Field Mapping
- **Detected Headers**: All column names found in your file
- **Sample Data**: First row of data to verify parsing
- **Date Field Mapping**: Shows which date fields were found and which was selected

#### Example
```
Import Diagnostics

✓ Detected Format: OrgCS Engagement Report

Adapter Score Breakdown (3 tested)
  OrgCS Engagement:    ████████████████░░░░ 16
  Org62 Support:       ████░░░░░░░░░░░░░░░░ 4
  Org62 Training:      ██░░░░░░░░░░░░░░░░░░ 2

Sample Data (first row)
  Account Name:        Acme Corporation
  Template Name:       Architecture Review
  Completion Date:     2024-03-15
  Stage:              Completed
```

### 4. Duplicate Handling Diagnostics

When a duplicate is detected, you'll see:

**Match Type**:
- `source_record_id`: Exact match by unique identifier
- `title_and_date`: Similar activity name and timeframe
- `exact_match`: Identical activity already exists

**Match Details**:
- Which existing pill or candidate it matches
- The matched activity name
- Status of the matched item

**Example**:
```
Duplicate Detected (source_record_id)
Already imported as "Q1 Architecture Review"
```

### 5. Safe Partial Import Behavior

The importer now handles failures gracefully:

✅ **Valid rows are imported** even if others fail
❌ **Failed rows remain in staging** with error details
🔄 **Rows can be fixed and retried** after correction

**Import Process**:
1. Validates each row individually
2. Imports all valid rows
3. Marks failed rows with specific errors
4. Updates batch counts accurately
5. Shows detailed summary

### 6. Common Error Messages

#### Validation Errors
- **"Missing required field: title"**: Row has no usable title
- **"Missing required field: owner"**: Cannot determine Salesforce/Partner/Customer
- **"Missing required field: date"**: No date field found
- **"Invalid start month: 15"**: Date parsing error

#### Warnings
- **"Low confidence classification (65%)"**: Activity type detection is uncertain
- **"Status could not be determined"**: No status field found
- **"No source record ID"**: Cannot prevent future duplicates

#### Skip Reasons
- **"Duplicate: Already imported as [name]"**: Exact match found
- **"Duplicate: Similar pill exists"**: Potential duplicate detected
- **"Excluded by user"**: User unchecked the include checkbox
- **"Validation failed"**: One or more validation errors

## Using Diagnostics for Troubleshooting

### Scenario 1: File Won't Parse

**Check**: Diagnostics panel → Adapter Score Breakdown

If all adapters have low scores (<5), your file format isn't recognized.

**Solution**:
- Verify file has standard column names
- Compare headers with supported formats
- Check for extra header rows or formatting issues

### Scenario 2: Rows Are Skipped

**Check**: Expand row → Skip Reason

Common causes:
- **Duplicates**: Row already exists in roadmap
- **Missing Data**: Required fields are empty
- **User Excluded**: Include checkbox was unchecked

**Solution**:
- For duplicates: Review if re-import is needed
- For missing data: Edit the row to add required fields
- For excluded: Re-check the include box

### Scenario 3: Import Partially Fails

**Check**: Import summary + failed rows section

The system imports valid rows and preserves failed ones.

**Solution**:
1. Review failed row error messages
2. Fix issues directly in staging table
3. Re-import the corrected rows
4. Batch counts update automatically

### Scenario 4: Wrong Activity Type

**Check**: Row warnings for "Low confidence classification"

**Solution**:
1. Click edit icon on the row
2. Manually set correct activity type
3. Save changes
4. Import the row

## Best Practices

1. **Review Diagnostics First**: Check the diagnostics panel before importing to verify correct file detection

2. **Expand Rows with Badges**: Click chevrons on flagged rows to understand issues before importing

3. **Fix Before Import**: Use the staging table to correct errors rather than importing and deleting

4. **Monitor Batch Progress**: Check Import Workspace to track success/failure rates across batches

5. **Keep Failed Rows**: Don't delete failed rows - fix and retry them instead

## Technical Details

### Database Schema
New fields added to `activity_import_candidates`:
- `warnings` (text[]): Array of warning messages
- `errors` (text[]): Array of error messages
- `skip_reason` (text): Skip explanation
- `duplicate_detection` (jsonb): Duplicate match details
- `validation_details` (jsonb): Validation results
- `adapter_scores` (jsonb): All adapter scores
- `detected_adapter` (text): Selected adapter name
- `field_mappings` (jsonb): Column to field mappings

New fields added to `import_batches`:
- `failed_count` (integer): Failed validation count
- `skipped_count` (integer): Skipped rows count
- `last_import_summary` (jsonb): Last import details

### API Functions

**Validation**:
- `validateCandidate()`: Checks required fields
- `checkForDuplicates()`: Searches for existing matches
- `buildWarnings()`: Generates warning messages
- `buildErrorMessages()`: Formats validation errors

**Processing**:
- `validateAndCheckDuplicates()`: Pre-import validation
- `updateBatchCounts()`: Recalculates all counts
- Safe partial import in `handleImportComplete()`

## Support

For issues or questions about import diagnostics:
1. Check this guide for common scenarios
2. Review expanded row details for specific errors
3. Examine diagnostics panel for file-level issues
4. Contact support with batch ID and error details
