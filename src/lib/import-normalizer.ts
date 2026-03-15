import type {
  NormalizedActivityCandidate,
  ParsedCSVRow,
  SourceSystem,
  SourceType,
  ActivityType,
  Quarter,
} from './import-types';

export function normalizeEngagementReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const name = row['Engagement Name'] || row['Name'] || '';
  if (!name) return null;

  const template = row['Engagement Template'] || row['Template'] || '';
  const stage = row['Stage'] || '';
  const startDate = parseDate(row['Start Date'] || row['Created Date']);
  const endDate = parseDate(row['End Date'] || row['Close Date']);

  const normalizedTitle = normalizeTitleText(name);
  const category = mapTemplateToCategory(template);

  const { activityType, startMonth, endMonth, quarters } = calculateTimeFields(startDate, endDate);

  const confidence = calculateConfidence(name, startDate, endDate);
  const flags = generateFlags(name, startDate, endDate, stage);

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'orgcs_engagement',
    sourceType: 'engagement',
    sourceRecordId: row['Engagement ID'] || row['ID'],
    rawTitle: name,
    rawTemplate: template,
    rawStage: stage,
    startDate,
    endDate,
    normalizedTitle,
    normalizedCategory: category,
    owner: 'salesforce',
    activityType,
    startMonth,
    endMonth,
    quarters,
    status: mapStageToStatus(stage),
    confidence,
    flags,
    include: true,
  };
}

export function normalizeSupportReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const subject = row['Case Subject'] || row['Subject'] || '';
  if (!subject) return null;

  const caseNumber = row['Case Number'] || row['Number'];
  const createdDate = parseDate(row['Created Date'] || row['Date Created']);
  const closedDate = parseDate(row['Closed Date'] || row['Date Closed']);

  const normalizedTitle = normalizeTitleText(subject);

  const { activityType, startMonth, endMonth, quarters } = calculateTimeFields(createdDate, closedDate);

  const confidence = calculateConfidence(subject, createdDate, closedDate);
  const flags = generateFlags(subject, createdDate, closedDate);

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'org62_support',
    sourceType: 'support',
    sourceRecordId: caseNumber,
    rawTitle: subject,
    startDate: createdDate,
    endDate: closedDate,
    normalizedTitle,
    owner: 'salesforce',
    activityType,
    startMonth,
    endMonth,
    quarters,
    status: closedDate ? 'completed' : 'in_progress',
    confidence,
    flags,
    include: true,
  };
}

export function normalizeTrainingReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const title = row['Training Title'] || row['Course'] || row['Module'] || '';
  if (!title) return null;

  const completedDate = parseDate(row['Completed Date'] || row['Date Completed']);
  const startDate = parseDate(row['Start Date'] || row['Enrollment Date']) || completedDate;

  const normalizedTitle = normalizeTitleText(title);

  const { activityType, startMonth, endMonth, quarters } = calculateTimeFields(startDate, completedDate);

  const confidence = calculateConfidence(title, startDate, completedDate);
  const flags = generateFlags(title, startDate, completedDate);

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'org62_training',
    sourceType: 'training',
    sourceRecordId: row['Training ID'] || row['Course ID'],
    rawTitle: title,
    startDate,
    endDate: completedDate,
    normalizedTitle,
    owner: 'salesforce',
    activityType,
    startMonth,
    endMonth,
    quarters,
    status: completedDate ? 'completed' : 'in_progress',
    confidence,
    flags,
    include: true,
  };
}

function normalizeTitleText(title: string): string {
  let normalized = title.trim();

  normalized = normalized.replace(/\s+/g, ' ');

  normalized = normalized.replace(/^(RE:|FW:|FWD:)\s*/i, '');

  if (normalized.length > 100) {
    normalized = normalized.substring(0, 97) + '...';
  }

  return normalized;
}

function mapTemplateToCategory(template: string): string | undefined {
  const lower = template.toLowerCase();

  if (lower.includes('architecture') || lower.includes('architect')) return 'Architecture Review';
  if (lower.includes('health') || lower.includes('check')) return 'Health Check';
  if (lower.includes('workshop')) return 'Workshop';
  if (lower.includes('advisory') || lower.includes('advise')) return 'Advisory';
  if (lower.includes('enablement') || lower.includes('training')) return 'Enablement';

  return template || undefined;
}

function mapStageToStatus(stage: string): 'not_started' | 'in_progress' | 'completed' | 'cancelled' | undefined {
  const lower = stage.toLowerCase();

  if (lower.includes('complete') || lower.includes('closed') || lower.includes('won')) return 'completed';
  if (lower.includes('cancel') || lower.includes('lost')) return 'cancelled';
  if (lower.includes('progress') || lower.includes('active')) return 'in_progress';
  if (lower.includes('new') || lower.includes('open') || lower.includes('planned')) return 'not_started';

  return undefined;
}

function parseDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

function calculateTimeFields(
  startDate: string | undefined,
  endDate: string | undefined
): {
  activityType: ActivityType;
  startMonth?: number;
  endMonth?: number;
  quarters?: Quarter[];
} {
  if (!startDate && !endDate) {
    return { activityType: 'standard' };
  }

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  const startMonth = start ? start.getMonth() + 1 : undefined;
  const endMonth = end ? end.getMonth() + 1 : startMonth;

  const quarters: Quarter[] = [];
  if (startMonth) {
    if (startMonth >= 1 && startMonth <= 3) quarters.push('q1');
    if (startMonth >= 4 && startMonth <= 6) quarters.push('q2');
    if (startMonth >= 7 && startMonth <= 9) quarters.push('q3');
    if (startMonth >= 10 && startMonth <= 12) quarters.push('q4');
  }

  if (endMonth && endMonth !== startMonth) {
    if (endMonth >= 1 && endMonth <= 3 && !quarters.includes('q1')) quarters.push('q1');
    if (endMonth >= 4 && endMonth <= 6 && !quarters.includes('q2')) quarters.push('q2');
    if (endMonth >= 7 && endMonth <= 9 && !quarters.includes('q3')) quarters.push('q3');
    if (endMonth >= 10 && endMonth <= 12 && !quarters.includes('q4')) quarters.push('q4');
  }

  const activityType: ActivityType = quarters.length > 1 ? 'spanning' : 'standard';

  return {
    activityType,
    startMonth,
    endMonth,
    quarters: quarters.length > 0 ? quarters : undefined,
  };
}

function calculateConfidence(
  title: string,
  startDate: string | undefined,
  endDate: string | undefined
): number {
  let confidence = 50;

  if (title.length > 10) confidence += 20;
  if (startDate) confidence += 15;
  if (endDate) confidence += 15;

  return Math.min(100, confidence);
}

function generateFlags(
  title: string,
  startDate: string | undefined,
  endDate: string | undefined,
  stage?: string
): string[] {
  const flags: string[] = [];

  if (!startDate) flags.push('missing_start_date');
  if (!endDate) flags.push('missing_end_date');
  if (title.length < 5) flags.push('short_title');
  if (title.length > 80) flags.push('long_title');

  if (stage?.toLowerCase().includes('cancel')) flags.push('cancelled_in_source');

  return flags;
}
