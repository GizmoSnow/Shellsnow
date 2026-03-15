# Example: Adding a Salesforce Activity Report Adapter

This example shows how to add support for a generic Salesforce Activity Report export.

## Step 1: Analyze the CSV/Excel Export

Let's say your Salesforce export has these columns:

```
Activity ID, Activity Type, Activity Name, Owner, Start Date, End Date, Status
ACT-001, Workshop, Data Cloud Architecture Workshop, Jane Doe, 2026-01-15, 2026-01-15, Completed
ACT-002, Consultation, Multi-Cloud Implementation, John Smith, 2026-02-01, 2026-03-15, In Progress
```

## Step 2: Create the Adapter

Add to `/src/lib/import-adapters.ts`:

```typescript
const SalesforceActivityAdapter: ImportAdapter = {
  name: 'Salesforce Activity Report',
  sourceSystem: 'salesforce_activity', // Note: Add to SourceSystem type

  detect: (headers: string[]) => {
    const normalized = normalizeHeaders(headers);
    // Basic detection - quick check
    return (
      normalized.has('activityid') ||
      (normalized.has('activityname') && normalized.has('activitytype'))
    );
  },

  score: (normalizedHeaders: Set<string>) => {
    let score = 0;

    // Strong matches - unique to Activity reports
    if (normalizedHeaders.has('activityid')) score += 10;
    if (normalizedHeaders.has('activityname')) score += 9;
    if (normalizedHeaders.has('activitytype')) score += 8;

    // Medium matches
    if (normalizedHeaders.has('owner')) score += 3;

    // Weak matches
    if (normalizedHeaders.has('status')) score += 1;
    if (normalizedHeaders.has('startdate')) score += 1;
    if (normalizedHeaders.has('enddate')) score += 1;

    return score;
  },

  normalize: (row, batchId, roadmapId, userId) => {
    // Use flexible column matching
    const name = findColumn(row, [
      'Activity Name',
      'Name',
      'Title'
    ]) || '';

    if (!name) return null;

    const activityType = findColumn(row, [
      'Activity Type',
      'Type'
    ]) || '';

    const status = findColumn(row, [
      'Status',
      'State'
    ]) || '';

    const startDate = parseDate(findColumn(row, [
      'Start Date',
      'Begin Date'
    ]));

    const endDate = parseDate(findColumn(row, [
      'End Date',
      'Completion Date'
    ]));

    const recordId = findColumn(row, [
      'Activity ID',
      'ID'
    ]);

    // Apply intelligent normalization
    const titleNormalization = normalizeTitle(name);

    // Classify based on dates and content
    const classification = classifyActivity(
      titleNormalization.normalizedTitle,
      startDate,
      endDate,
      'engagement'
    );

    // Map status to standard values
    const mappedStatus = mapStatus(status, 'engagement') ||
                         inferStatusFromDates(startDate, endDate, 'engagement');

    // Determine category from activity type
    const category = mapTemplateToCategory(activityType);

    return {
      id: crypto.randomUUID(),
      batchId,
      roadmapId,
      userId,
      sourceSystem: 'salesforce_activity',
      sourceType: 'engagement',
      sourceRecordId: recordId,
      rawTitle: name,
      rawTemplate: activityType,
      rawStage: status,
      startDate,
      endDate,
      normalizedTitle: titleNormalization.normalizedTitle,
      normalizedCategory: category,
      owner: 'salesforce',
      activityType: classification.activityType,
      startMonth: classification.startMonth,
      endMonth: classification.endMonth,
      quarters: classification.quarters,
      status: mappedStatus,
      confidence: titleNormalization.confidence,
      flags: [...titleNormalization.flags, ...classification.flags],
      include: true,
    };
  }
};

// Register it
export const IMPORT_ADAPTERS: ImportAdapter[] = [
  OrgCSEngagementAdapter,
  Org62SupportAdapter,
  Org62TrainingAdapter,
  SalesforceActivityAdapter, // Add here
];
```

## Step 3: Update Type Definition

In `/src/lib/import-types.ts`, add the new source system:

```typescript
export type SourceSystem =
  | 'orgcs_engagement'
  | 'org62_support'
  | 'org62_training'
  | 'salesforce_activity'; // Add this
```

## Step 4: Update Database (Optional)

If you need to persist this source type, update the migration:

```sql
-- In a new migration file
ALTER TABLE activity_import_candidates
  DROP CONSTRAINT activity_import_candidates_source_system_check;

ALTER TABLE activity_import_candidates
  ADD CONSTRAINT activity_import_candidates_source_system_check
  CHECK (source_system IN (
    'orgcs_engagement',
    'org62_support',
    'org62_training',
    'salesforce_activity' -- Add this
  ));
```

## Step 5: Test It

1. Export an Activity Report from Salesforce
2. Upload through the Import UI
3. Verify it detects as "Salesforce Activity Report"
4. Review the staging table
5. Confirm normalization works correctly

## That's It!

The adapter system automatically:
- ✅ Detects your format based on headers
- ✅ Normalizes titles (removes IDs, prefixes, etc.)
- ✅ Classifies activity types (standard/spanning/quarter)
- ✅ Maps statuses to standard values
- ✅ Flags potential issues
- ✅ Detects duplicates
- ✅ Provides staging UI for review

No changes needed to:
- Import processor
- UI components
- Staging modal
- Database queries

Just add your adapter and go!
