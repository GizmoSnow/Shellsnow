import type {
  NormalizedActivityCandidate,
  ParsedCSVRow,
} from './import-types';
import { findColumn } from './csv-parser';
import { normalizeTitle, detectLowValueSupportActivity } from './title-normalizer';
import { classifyActivity } from './activity-classifier';
import { mapStatus, inferStatusFromDates } from './status-mapper';

export function normalizeEngagementReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const name = findColumn(row, ['Engagement Name', 'Name']) || '';
  if (!name) return null;

  const template = findColumn(row, ['Engagement Template Name', 'Engagement Template', 'Template']) || '';
  const stage = findColumn(row, ['Stage', 'Status']) || '';
  const startDate = parseDate(findColumn(row, ['Start Date', 'Created Date']));
  const endDate = parseDate(findColumn(row, ['End Date', 'Close Date', 'Closed Date']));
  const sourceRecordId = findColumn(row, ['Engagement ID', 'ID', 'Engagement Number']);

  const titleNormalization = normalizeTitle(name);
  const category = mapTemplateToCategory(template);

  const classification = classifyActivity(titleNormalization.normalizedTitle, startDate, endDate, 'engagement', undefined, template);

  const status = mapStatus(stage, 'engagement') || inferStatusFromDates(startDate, endDate, 'engagement');

  const allFlags = [...titleNormalization.flags, ...classification.flags];
  if (stage?.toLowerCase().includes('cancel')) {
    allFlags.push('CancelledInSource');
  }

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'orgcs_engagement',
    sourceType: 'engagement',
    sourceRecordId,
    rawTitle: name,
    rawTemplate: template,
    rawStage: stage,
    startDate,
    endDate,
    normalizedTitle: titleNormalization.normalizedTitle,
    normalizedCategory: category,
    owner: 'salesforce',
    activityType: classification.activityType,
    startMonth: classification.startMonth,
    endMonth: classification.endMonth,
    quarters: classification.quarters,
    status,
    confidence: titleNormalization.confidence,
    flags: allFlags,
    include: true,
  };
}

export function normalizeSupportReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const subject = findColumn(row, ['Case Subject', 'Subject', 'Title']) || '';
  if (!subject) return null;

  const caseType = findColumn(row, ['Case Type', 'Type', 'Category']);
  const caseStatus = findColumn(row, ['Status', 'Case Status']);
  const caseNumber = findColumn(row, ['Case Number', 'Number', 'Case ID']);
  const createdDate = parseDate(findColumn(row, ['Created Date', 'Date Created', 'Open Date']));
  const closedDate = parseDate(findColumn(row, ['Closed Date', 'Date Closed', 'Resolution Date']));

  const titleNormalization = normalizeTitle(subject);
  const classification = classifyActivity(titleNormalization.normalizedTitle, createdDate, closedDate, 'support', undefined, caseType);

  const status = mapStatus(caseStatus, 'support') || inferStatusFromDates(createdDate, closedDate, 'support');

  const allFlags = [...titleNormalization.flags, ...classification.flags];

  const isLowValue = detectLowValueSupportActivity(subject);
  if (isLowValue) {
    allFlags.push('LowValueActivity');
  }

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'org62_support',
    sourceType: 'support',
    sourceRecordId: caseNumber,
    rawTitle: subject,
    rawTemplate: caseType,
    rawStage: caseStatus,
    startDate: createdDate,
    endDate: closedDate,
    normalizedTitle: titleNormalization.normalizedTitle,
    owner: 'salesforce',
    activityType: classification.activityType,
    startMonth: classification.startMonth,
    endMonth: classification.endMonth,
    quarters: classification.quarters,
    status,
    confidence: titleNormalization.confidence,
    flags: allFlags,
    include: !isLowValue,
  };
}

export function normalizeTrainingReport(
  row: ParsedCSVRow,
  batchId: string,
  roadmapId: string,
  userId: string
): NormalizedActivityCandidate | null {
  const title = findColumn(row, ['Training Title', 'Course', 'Session Title', 'Module', 'Course Name']) || '';
  if (!title) return null;

  const courseType = findColumn(row, ['Course Type', 'Topic', 'Type', 'Category']);
  const trainingStatus = findColumn(row, ['Status', 'Completion Status', 'Enrollment Status']);
  const courseId = findColumn(row, ['Training ID', 'Course ID', 'Session ID', 'Record ID']);

  const completedDate = parseDate(findColumn(row, ['Completed Date', 'Date Completed', 'Completion Date', 'Session Date']));
  const startDate = parseDate(findColumn(row, ['Start Date', 'Enrollment Date', 'Registration Date'])) || completedDate;
  const endDate = findColumn(row, ['End Date']) ? parseDate(findColumn(row, ['End Date'])) : completedDate;

  const titleNormalization = normalizeTitle(title);
  const classification = classifyActivity(titleNormalization.normalizedTitle, startDate, endDate, 'training', undefined, courseType);

  const status = mapStatus(trainingStatus, 'training') || inferStatusFromDates(startDate, endDate, 'training');

  const allFlags = [...titleNormalization.flags, ...classification.flags];

  return {
    id: crypto.randomUUID(),
    batchId,
    roadmapId,
    userId,
    sourceSystem: 'org62_training',
    sourceType: 'training',
    sourceRecordId: courseId,
    rawTitle: title,
    rawTemplate: courseType,
    rawStage: trainingStatus,
    startDate,
    endDate,
    normalizedTitle: titleNormalization.normalizedTitle,
    normalizedCategory: 'Enablement',
    owner: 'salesforce',
    activityType: classification.activityType,
    startMonth: classification.startMonth,
    endMonth: classification.endMonth,
    quarters: classification.quarters,
    status,
    confidence: titleNormalization.confidence,
    flags: allFlags,
    include: true,
  };
}

function mapTemplateToCategory(template: string): string | undefined {
  if (!template) return undefined;

  const lower = template.toLowerCase();

  if (lower.includes('architecture') || lower.includes('architect')) return 'Architecture Review';
  if (lower.includes('health') || lower.includes('check')) return 'Health Check';
  if (lower.includes('workshop')) return 'Workshop';
  if (lower.includes('advisory') || lower.includes('advise')) return 'Advisory';
  if (lower.includes('enablement') || lower.includes('training')) return 'Enablement';
  if (lower.includes('adoption')) return 'Adoption';
  if (lower.includes('implementation')) return 'Implementation';

  return template;
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
