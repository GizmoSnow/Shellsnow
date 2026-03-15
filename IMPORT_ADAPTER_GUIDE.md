# Import Adapter Guide

This guide explains how to add new import sources to the roadmap builder.

## Architecture

The import system uses a **pluggable adapter pattern** that makes it easy to add new data sources without modifying core code. Each adapter is responsible for:

1. **Detecting** if a file matches its format (basic header check)
2. **Scoring** how confident it is based on column headers (reduces false positives)
3. **Normalizing** raw data into standardized activity candidates

### Smart Detection with Scoring

Instead of simple keyword matching, the system uses a **scoring algorithm**:

1. **Normalize headers** - Remove spaces, hyphens, underscores, lowercase
2. **Score each adapter** - Each column match adds points based on uniqueness
3. **Pick highest score** - Adapter with best score wins (minimum 5 points required)

This prevents false positives when files have similar column names.

## Current Adapters

- **OrgCS Engagement** - Salesforce engagement reports
- **Org62 Support** - Salesforce support case reports
- **Org62 Training** - Salesforce training/course reports

## Adding a New Adapter

### Step 1: Define Your Adapter

Create a new adapter in `/src/lib/import-adapters.ts`:

```typescript
const MyCustomAdapter: ImportAdapter = {
  name: 'My Custom Report',
  sourceSystem: 'my_custom_source', // Add to SourceSystem type first

  // Basic detection - quick check if this might be the right format
  detect: (headers: string[]) => {
    const normalized = normalizeHeaders(headers);
    return (
      normalized.has('myuniquecolumn') ||
      normalized.has('anotheruniquecolumn')
    );
  },

  // Scoring - more sophisticated confidence rating
  score: (normalizedHeaders: Set<string>) => {
    let score = 0;

    // Strong matches (10 points) - columns unique to this source
    if (normalizedHeaders.has('myuniquecolumn')) score += 10;
    if (normalizedHeaders.has('myspecificid')) score += 10;

    // Medium matches (3-7 points) - supportive columns
    if (normalizedHeaders.has('mysourcetype')) score += 5;
    if (normalizedHeaders.has('mysourcestatus')) score += 4;

    // Weak matches (1-2 points) - common fields
    if (normalizedHeaders.has('name')) score += 1;
    if (normalizedHeaders.has('startdate')) score += 1;

    return score;
  },

  // Normalization logic - converts raw row to NormalizedActivityCandidate
  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => {
    // Extract data using flexible column matching
    const title = findColumn(row, [
      'Title',
      'Name',
      'Activity Name',
      // Add all possible column name variations
    ]) || '';

    if (!title) return null; // Skip rows without required data

    const startDate = parseDate(findColumn(row, [
      'Start Date',
      'Begin Date',
      'Created Date'
    ]));

    // ... extract other fields ...

    // Apply normalization and classification
    const titleNormalization = normalizeTitle(title);
    const classification = classifyActivity(
      titleNormalization.normalizedTitle,
      startDate,
      endDate,
      'engagement' // or 'support' or 'training'
    );

    return {
      id: crypto.randomUUID(),
      batchId,
      roadmapId,
      userId,
      sourceSystem: 'my_custom_source',
      sourceType: 'engagement', // engagement | support | training
      sourceRecordId: findColumn(row, ['ID', 'Record ID']),
      rawTitle: title,
      normalizedTitle: titleNormalization.normalizedTitle,
      owner: 'salesforce', // or 'partner' or 'customer'
      activityType: classification.activityType,
      startMonth: classification.startMonth,
      endMonth: classification.endMonth,
      quarters: classification.quarters,
      status: mapStatus(stage, 'engagement'),
      confidence: titleNormalization.confidence,
      flags: [...titleNormalization.flags, ...classification.flags],
      include: true,
      // ... other fields as needed
    };
  }
};
```

### Step 2: Register Your Adapter

Add it to the `IMPORT_ADAPTERS` array:

```typescript
export const IMPORT_ADAPTERS: ImportAdapter[] = [
  OrgCSEngagementAdapter,
  Org62SupportAdapter,
  Org62TrainingAdapter,
  MyCustomAdapter, // Add here
];
```

### Step 3: Update Type Definitions (if needed)

If adding a completely new source system, update `/src/lib/import-types.ts`:

```typescript
export type SourceSystem =
  | 'orgcs_engagement'
  | 'org62_support'
  | 'org62_training'
  | 'my_custom_source'; // Add new source

export type SourceType =
  | 'engagement'
  | 'support'
  | 'training'
  | 'my_custom_type'; // Add if needed
```

And update the database migration constraint if adding new source types.

## Flexible Column Matching

Use `findColumn()` to handle column name variations:

```typescript
// Will match first found column (case-insensitive)
const title = findColumn(row, [
  'Activity Name',
  'Name',
  'Title',
  'Subject',
  'Description'
]);
```

This makes the adapter resilient to:
- Different column naming conventions
- Extra/missing whitespace
- Case variations
- Column order changes

## Key Helper Functions

### `normalizeTitle(rawTitle: string)`
Cleans up titles by removing:
- Account names
- IDs and codes
- Common prefixes (RE:, FWD:, etc.)
- Boilerplate text

Returns: `{ normalizedTitle, flags, confidence }`

### `classifyActivity(title, startDate, endDate, sourceType)`
Determines activity type:
- **standard** - Single month or point-in-time
- **spanning** - Multi-month (>45 days)
- **quarter** - Quarter-level (if Q1/Q2/Q3/Q4 in title)

Returns: `{ activityType, startMonth, endMonth, quarters, flags }`

### `mapStatus(rawStatus, sourceType)`
Maps source-specific status values to standard statuses:
- `not_started`
- `in_progress`
- `completed`
- `cancelled`

### `detectLowValueSupportActivity(title)`
Flags administrative/low-value items like:
- Password resets
- Access requests
- License changes

## Testing Your Adapter

1. **Export a sample file** from your source system
2. **Upload it** through the Import UI
3. **Verify detection** - Check that the correct adapter is selected
4. **Review staging** - Ensure fields are mapped correctly
5. **Check flags** - Verify normalization and classification work as expected

## Best Practices

### Scoring Strategy

**Strong matches (8-10 points)**: Columns that are unique to your source
- Examples: `engagementname`, `casenumber`, `trainingid`
- These should strongly indicate the correct adapter

**Medium matches (3-7 points)**: Supportive columns that are characteristic
- Examples: `engagementtemplate`, `casetype`, `coursetype`
- Help differentiate when strong matches aren't present

**Weak matches (1-2 points)**: Common fields found in many sources
- Examples: `status`, `startdate`, `createddate`
- Only add small amounts to avoid false positives

**Minimum threshold**: Require score ≥ 5 to select an adapter
- Prevents random CSV files from being misidentified

### Be Lenient in Detection
- Match on multiple possible column variations
- Don't require ALL columns to be present
- Header normalization handles spaces/hyphens/underscores automatically

### Be Strict in Normalization
- Return `null` if required data is missing
- Add appropriate flags for data quality issues
- Default `include: false` for low-value items

### Handle Edge Cases
- Missing dates → use status inference
- Invalid data → skip row with helpful error
- Partial data → add warning flags

### Test Column Variations
Export formats often change. Test with:
- Old and new report formats
- Different languages/locales
- Custom/admin-modified exports

## Dynamic Adapter Registration

You can also register adapters dynamically:

```typescript
import { registerAdapter } from './lib/import-adapters';

registerAdapter(MyCustomAdapter);
```

This is useful for:
- Plugin systems
- Runtime configuration
- A/B testing new adapters
