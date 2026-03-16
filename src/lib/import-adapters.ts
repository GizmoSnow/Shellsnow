import type { ParsedCSVRow, NormalizedActivityCandidate, SourceSystem } from './import-types';
import { findColumn } from './csv-parser';
import { normalizeTitle, detectLowValueSupportActivity } from './title-normalizer';
import { classifyActivity } from './activity-classifier';
import { mapStatus, inferStatusFromDates } from './status-mapper';

export interface ImportAdapter {
  name: string;
  sourceSystem: SourceSystem;
  sourceType?: string;
  detect: (headers: string[]) => boolean;
  score: (normalizedHeaders: Set<string>) => number;
  normalize: (row: ParsedCSVRow, batchId: string, roadmapId: string, userId: string) => NormalizedActivityCandidate | null;
  getFieldMappings?: (row: ParsedCSVRow) => Record<string, string>;
  getRequiredFields?: () => string[];
  getMissingFields?: (headers: string[]) => string[];
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '');
}

function normalizeHeaders(headers: string[]): Set<string> {
  return new Set(headers.map(normalizeHeader));
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
    const normalized = normalizeHeaders(headers);
    return (
      normalized.has('engagementname') ||
      normalized.has('engagementtemplatename') ||
      normalized.has('engagementid')
    );
  },

  score: (normalizedHeaders: Set<string>) => {
    let score = 0;

    // Strong matches - unique to OrgCS Engagement
    if (normalizedHeaders.has('engagementname')) score += 10;
    if (normalizedHeaders.has('engagementtemplatename')) score += 10;
    if (normalizedHeaders.has('engagementtemplate')) score += 8;
    if (normalizedHeaders.has('engagementid')) score += 8;

    // Medium matches - common but supportive
    if (normalizedHeaders.has('stage')) score += 3;
    if (normalizedHeaders.has('engagementstatus')) score += 5;

    // Weak matches - very common fields
    if (normalizedHeaders.has('startdate')) score += 1;
    if (normalizedHeaders.has('enddate')) score += 1;
    if (normalizedHeaders.has('createddate')) score += 1;

    return score;
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

    const accountName = findColumn(row, [
      'Account Name',
      'Customer Name',
      'Account',
      'Customer'
    ]);

    const orgName = findColumn(row, [
      'Org Name',
      'Organization',
      'Org ID',
      'Organization Name'
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
      sourceAccountName: accountName,
      sourceOrgName: orgName,
      sourceTemplateName: template,
      sourceStageRaw: stage,
      sourceReportType: 'OrgCS Engagement',
    };
  }
};

const Org62SupportAdapter: ImportAdapter = {
  name: 'Org62 Success Specialist Report',
  sourceSystem: 'org62_support',

  detect: (headers: string[]) => {
    const normalized = normalizeHeaders(headers);
    return (
      normalized.has('casenumber') ||
      normalized.has('casesubject') ||
      normalized.has('caseid')
    );
  },

  score: (normalizedHeaders: Set<string>) => {
    let score = 0;

    // Strong matches - unique to Support/Case reports
    if (normalizedHeaders.has('casenumber')) score += 10;
    if (normalizedHeaders.has('casesubject')) score += 10;
    if (normalizedHeaders.has('caseid')) score += 8;
    if (normalizedHeaders.has('casetype')) score += 7;
    if (normalizedHeaders.has('casestatus')) score += 5;

    // Medium matches
    if (normalizedHeaders.has('status')) score += 2;
    if (normalizedHeaders.has('closeddate')) score += 3;

    // Weak matches
    if (normalizedHeaders.has('createddate')) score += 1;

    return score;
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
      'Date Opened',
      'Opened'
    ]));

    const closedDate = parseDate(findColumn(row, [
      'Closed Date',
      'Date Closed',
      'Resolution Date',
      'Date Resolved',
      'Last Modified Date',
      'Last Modified',
      'Modified Date'
    ]));

    const accountName = findColumn(row, [
      'Account Name',
      'Customer Name',
      'Account',
      'Customer'
    ]);

    const orgName = findColumn(row, [
      'Org Name',
      'Organization',
      'Org ID',
      'Organization Name'
    ]);

    // Check for "Closed" flag (boolean field)
    const closedFlag = findColumn(row, ['Closed', 'Is Closed', 'Case Closed']);
    const isClosed = closedFlag?.toLowerCase() === 'true' || closedFlag?.toLowerCase() === 'yes' || closedFlag === '1';

    const titleNormalization = normalizeTitle(subject);
    const classification = classifyActivity(titleNormalization.normalizedTitle, createdDate, closedDate, 'support');

    // If we have a closed flag, use it to determine status, otherwise fall back to normal logic
    let status = mapStatus(caseStatus, 'support') || inferStatusFromDates(createdDate, closedDate, 'support');
    if (isClosed && !status) {
      status = 'completed';
    } else if (!isClosed && !status && createdDate) {
      status = 'in_progress';
    }

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
      sourceAccountName: accountName,
      sourceOrgName: orgName,
      sourceTemplateName: caseType,
      sourceStageRaw: caseStatus,
      sourceReportType: 'Org62 Support',
    };
  }
};

const Org62TrainingAdapter: ImportAdapter = {
  name: 'Org62 Training Report',
  sourceSystem: 'org62_training',

  detect: (headers: string[]) => {
    const normalized = normalizeHeaders(headers);
    return (
      normalized.has('course') ||
      normalized.has('trainingtitle') ||
      normalized.has('coursename') ||
      normalized.has('sessiontitle')
    );
  },

  score: (normalizedHeaders: Set<string>) => {
    let score = 0;

    // Strong matches - unique to Training reports
    if (normalizedHeaders.has('trainingtitle')) score += 10;
    if (normalizedHeaders.has('coursetitle')) score += 10;
    if (normalizedHeaders.has('coursename')) score += 9;
    if (normalizedHeaders.has('sessiontitle')) score += 9;
    if (normalizedHeaders.has('trainingid')) score += 8;
    if (normalizedHeaders.has('courseid')) score += 8;
    if (normalizedHeaders.has('coursetype')) score += 7;

    // Medium matches
    if (normalizedHeaders.has('completeddate')) score += 5;
    if (normalizedHeaders.has('completiondate')) score += 5;
    if (normalizedHeaders.has('completionstatus')) score += 4;
    if (normalizedHeaders.has('enrollmentdate')) score += 3;

    // Weak matches - could be training-related
    if (normalizedHeaders.has('course')) score += 3;
    if (normalizedHeaders.has('module')) score += 2;
    if (normalizedHeaders.has('status')) score += 1;

    return score;
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

    const completionDate = parseDate(findColumn(row, [
      'Completion Date',
      'Completed Date',
      'Date Completed'
    ]));

    const sessionDate = parseDate(findColumn(row, [
      'Session Date',
      'Class Date',
      'Training Date'
    ]));

    const enrollmentDate = parseDate(findColumn(row, [
      'Start Date',
      'Enrollment Date',
      'Registration Date',
      'Date Enrolled'
    ]));

    const explicitEndDate = parseDate(findColumn(row, ['End Date']));

    const activityDate = completionDate || sessionDate || enrollmentDate || explicitEndDate;

    const startDate = activityDate;
    const endDate = activityDate;

    const accountName = findColumn(row, [
      'Account Name',
      'Customer Name',
      'Account',
      'Customer'
    ]);

    const orgName = findColumn(row, [
      'Org Name',
      'Organization',
      'Org ID',
      'Organization Name'
    ]);

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
      sourceAccountName: accountName,
      sourceOrgName: orgName,
      sourceTemplateName: courseType,
      sourceStageRaw: trainingStatus,
      sourceReportType: 'Org62 Training',
    };
  }
};

export const IMPORT_ADAPTERS: ImportAdapter[] = [
  OrgCSEngagementAdapter,
  Org62SupportAdapter,
  Org62TrainingAdapter,
];

export function detectAdapter(headers: string[]): ImportAdapter | null {
  const normalized = normalizeHeaders(headers);

  // Score all adapters
  const scored = IMPORT_ADAPTERS.map(adapter => ({
    adapter,
    score: adapter.score(normalized),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the highest scoring adapter if it has a meaningful score
  // Require at least score of 5 to avoid false positives
  if (scored.length > 0 && scored[0].score >= 5) {
    return scored[0].adapter;
  }

  // Fallback to legacy detect method if no good score
  for (const adapter of IMPORT_ADAPTERS) {
    if (adapter.detect(headers)) {
      return adapter;
    }
  }

  return null;
}

export function scoreAllAdapters(headers: string[]): Array<{ name: string; score: number }> {
  const normalized = normalizeHeaders(headers);

  return IMPORT_ADAPTERS.map(adapter => ({
    name: adapter.name,
    score: adapter.score(normalized),
  })).sort((a, b) => b.score - a.score);
}

export function registerAdapter(adapter: ImportAdapter): void {
  const existingIndex = IMPORT_ADAPTERS.findIndex(a => a.sourceSystem === adapter.sourceSystem);
  if (existingIndex >= 0) {
    IMPORT_ADAPTERS[existingIndex] = adapter;
  } else {
    IMPORT_ADAPTERS.push(adapter);
  }
}
