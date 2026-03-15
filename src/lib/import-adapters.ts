import type { ParsedCSVRow, NormalizedActivityCandidate, SourceSystem } from './import-types';
import { findColumn } from './csv-parser';
import { normalizeTitle, detectLowValueSupportActivity } from './title-normalizer';
import { classifyActivity } from './activity-classifier';
import { mapStatus, inferStatusFromDates } from './status-mapper';

export interface ImportAdapter {
  name: string;
  sourceSystem: SourceSystem;
  detect: (headers: string[]) => boolean;
  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => NormalizedActivityCandidate | null;
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

const OrgCSEngagementAdapter: ImportAdapter = {
  name: 'OrgCS Engagement Report',
  sourceSystem: 'orgcs_engagement',

  detect: (headers: string[]) => {
    const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
    return (
      headerSet.has('engagement name') ||
      headerSet.has('engagement template name') ||
      headerSet.has('engagement template') ||
      headerSet.has('engagement id')
    );
  },

  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => {
    const name = findColumn(row, [
      'Engagement Name',
      'Name',
      'Title',
      'Engagement Title'
    ]) || '';

    if (!name) return null;

    const template = findColumn(row, [
      'Engagement Template Name',
      'Engagement Template',
      'Template',
      'Template Name'
    ]) || '';

    const stage = findColumn(row, [
      'Stage',
      'Status',
      'Engagement Status'
    ]) || '';

    const startDate = parseDate(findColumn(row, [
      'Start Date',
      'Created Date',
      'Date Created',
      'Begin Date'
    ]));

    const endDate = parseDate(findColumn(row, [
      'End Date',
      'Close Date',
      'Closed Date',
      'Completion Date'
    ]));

    const sourceRecordId = findColumn(row, [
      'Engagement ID',
      'ID',
      'Engagement Number',
      'Record ID'
    ]);

    const titleNormalization = normalizeTitle(name);
    const category = mapTemplateToCategory(template);
    const classification = classifyActivity(titleNormalization.normalizedTitle, startDate, endDate, 'engagement');
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
};

const Org62SupportAdapter: ImportAdapter = {
  name: 'Org62 Success Specialist Report',
  sourceSystem: 'org62_support',

  detect: (headers: string[]) => {
    const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
    return (
      headerSet.has('case number') ||
      headerSet.has('case subject') ||
      headerSet.has('case type') ||
      headerSet.has('case id')
    );
  },

  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => {
    const subject = findColumn(row, [
      'Case Subject',
      'Subject',
      'Title',
      'Case Title',
      'Description'
    ]) || '';

    if (!subject) return null;

    const caseType = findColumn(row, [
      'Case Type',
      'Type',
      'Category',
      'Case Category'
    ]);

    const caseStatus = findColumn(row, [
      'Status',
      'Case Status',
      'State'
    ]);

    const caseNumber = findColumn(row, [
      'Case Number',
      'Number',
      'Case ID',
      'ID',
      'Record ID'
    ]);

    const createdDate = parseDate(findColumn(row, [
      'Created Date',
      'Date Created',
      'Open Date',
      'Date Opened'
    ]));

    const closedDate = parseDate(findColumn(row, [
      'Closed Date',
      'Date Closed',
      'Resolution Date',
      'Date Resolved'
    ]));

    const titleNormalization = normalizeTitle(subject);
    const classification = classifyActivity(titleNormalization.normalizedTitle, createdDate, closedDate, 'support');
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
};

const Org62TrainingAdapter: ImportAdapter = {
  name: 'Org62 Training Report',
  sourceSystem: 'org62_training',

  detect: (headers: string[]) => {
    const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
    return (
      headerSet.has('course') ||
      headerSet.has('training title') ||
      headerSet.has('module') ||
      headerSet.has('session title') ||
      headerSet.has('course type')
    );
  },

  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => {
    const title = findColumn(row, [
      'Training Title',
      'Course',
      'Session Title',
      'Module',
      'Course Name',
      'Title',
      'Class Name'
    ]) || '';

    if (!title) return null;

    const courseType = findColumn(row, [
      'Course Type',
      'Topic',
      'Type',
      'Category',
      'Subject'
    ]);

    const trainingStatus = findColumn(row, [
      'Status',
      'Completion Status',
      'Enrollment Status',
      'State'
    ]);

    const courseId = findColumn(row, [
      'Training ID',
      'Course ID',
      'Session ID',
      'Record ID',
      'ID'
    ]);

    const completedDate = parseDate(findColumn(row, [
      'Completed Date',
      'Date Completed',
      'Completion Date',
      'Session Date',
      'Class Date'
    ]));

    const startDate = parseDate(findColumn(row, [
      'Start Date',
      'Enrollment Date',
      'Registration Date',
      'Date Enrolled'
    ])) || completedDate;

    const endDate = findColumn(row, ['End Date'])
      ? parseDate(findColumn(row, ['End Date']))
      : completedDate;

    const titleNormalization = normalizeTitle(title);
    const classification = classifyActivity(titleNormalization.normalizedTitle, startDate, endDate, 'training');
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
};

export const IMPORT_ADAPTERS: ImportAdapter[] = [
  OrgCSEngagementAdapter,
  Org62SupportAdapter,
  Org62TrainingAdapter,
];

export function detectAdapter(headers: string[]): ImportAdapter | null {
  for (const adapter of IMPORT_ADAPTERS) {
    if (adapter.detect(headers)) {
      return adapter;
    }
  }
  return null;
}

export function registerAdapter(adapter: ImportAdapter): void {
  const existingIndex = IMPORT_ADAPTERS.findIndex(a => a.sourceSystem === adapter.sourceSystem);
  if (existingIndex >= 0) {
    IMPORT_ADAPTERS[existingIndex] = adapter;
  } else {
    IMPORT_ADAPTERS.push(adapter);
  }
}
