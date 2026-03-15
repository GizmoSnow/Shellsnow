# Import Adapter Scoring Guide

## Why Scoring?

Simple keyword matching (`if header contains 'name'`) leads to **false positives** because many reports share common column names like:
- `Status`
- `Start Date`
- `Created Date`
- `Name`

**Scoring** provides confidence levels by weighting unique vs. common columns.

## How It Works

### 1. Header Normalization

Before scoring, all headers are normalized:
```typescript
"Engagement Name" → "engagementname"
"Case_Number"     → "casenumber"
"Training-Title"  → "trainingtitle"
```

This removes:
- Spaces
- Underscores
- Hyphens
- Case differences

### 2. Scoring Each Adapter

Each adapter assigns points based on column presence:

```typescript
score: (normalizedHeaders: Set<string>) => {
  let score = 0;

  // Strong matches (8-10 points)
  if (normalizedHeaders.has('engagementname')) score += 10;

  // Medium matches (3-7 points)
  if (normalizedHeaders.has('stage')) score += 3;

  // Weak matches (1-2 points)
  if (normalizedHeaders.has('startdate')) score += 1;

  return score;
}
```

### 3. Selection

- All adapters are scored
- Highest scoring adapter is selected
- **Minimum threshold: 5 points** (prevents false positives)

## Scoring Strategy

### Strong Matches (8-10 points)

Columns that are **unique** to a specific source system.

**OrgCS Engagement**
- `engagementname` (10)
- `engagementtemplatename` (10)
- `engagementid` (8)

**Org62 Support**
- `casenumber` (10)
- `casesubject` (10)
- `caseid` (8)

**Org62 Training**
- `trainingtitle` (10)
- `coursename` (9)
- `courseid` (8)

### Medium Matches (3-7 points)

Columns that are **characteristic** but not unique.

**Examples:**
- `engagementtemplate` (8)
- `casetype` (7)
- `coursetype` (7)
- `completeddate` (5)
- `stage` (3)

### Weak Matches (1-2 points)

**Very common** columns found across many systems.

**Examples:**
- `status` (1-2)
- `startdate` (1)
- `enddate` (1)
- `createddate` (1)
- `name` (1)

## Example Scenarios

### Scenario 1: Clear Winner

**File headers:**
```
Engagement Name, Engagement Template, Stage, Start Date, End Date
```

**Scores:**
- OrgCS Engagement: 10 + 8 + 3 + 1 + 1 = **23** ✅
- Org62 Support: 0 + 0 + 0 + 1 + 1 = **2**
- Org62 Training: 0 + 0 + 1 + 1 + 1 = **3**

**Result:** OrgCS Engagement adapter selected

### Scenario 2: Preventing False Positives

**File headers:**
```
Name, Status, Date
```

**Scores:**
- OrgCS Engagement: 1 + 1 + 1 = **3**
- Org62 Support: 1 + 2 + 1 = **4**
- Org62 Training: 1 + 1 + 1 = **3**

**Result:** No adapter selected (highest score 4 < minimum threshold 5)

### Scenario 3: Medium Confidence

**File headers:**
```
Case Number, Status, Created Date
```

**Scores:**
- OrgCS Engagement: 0 + 1 + 1 = **2**
- Org62 Support: 10 + 2 + 1 = **13** ✅
- Org62 Training: 0 + 1 + 1 = **2**

**Result:** Org62 Support adapter selected

## Tips for Creating Scores

### 1. Identify Unique Columns

What columns would ONLY appear in your report?
```typescript
// Good - very specific
if (normalizedHeaders.has('workordernumber')) score += 10;

// Bad - too generic
if (normalizedHeaders.has('id')) score += 10;
```

### 2. Use Combinations

Sometimes uniqueness comes from combinations:
```typescript
// Individual columns are common
if (normalizedHeaders.has('project') &&
    normalizedHeaders.has('milestone') &&
    normalizedHeaders.has('phase')) {
  score += 15; // Combination is unique
}
```

### 3. Test with Real Data

Export several reports and check scores:
```typescript
import { scoreAllAdapters } from './lib/import-adapters';

const headers = ['Engagement Name', 'Stage', 'Start Date'];
const scores = scoreAllAdapters(headers);
console.log(scores);
// [
//   { name: 'OrgCS Engagement Report', score: 23 },
//   { name: 'Org62 Support', score: 2 },
//   { name: 'Org62 Training', score: 3 }
// ]
```

### 4. Adjust Threshold

If getting too many false positives, increase the minimum:
```typescript
// In import-adapters.ts
if (scored.length > 0 && scored[0].score >= 8) { // Raised from 5
  return scored[0].adapter;
}
```

## Debugging

Use `scoreAllAdapters()` to see all scores:
```typescript
// In your component
const handleFileSelect = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target?.result as string;
    const rows = parseCSV(csv);
    const headers = Object.keys(rows[0]);
    const scores = scoreAllAdapters(headers);
    console.table(scores);
  };
  reader.readAsText(file);
};
```

This shows exactly why an adapter was or wasn't selected.

## Benefits

✅ **Reduces false positives** - Generic CSVs won't match
✅ **Handles variations** - Missing columns won't break detection
✅ **Clear confidence** - Score indicates match quality
✅ **Easy to debug** - Can inspect all scores
✅ **Extensible** - New adapters won't interfere with existing ones
