export type SourceSystem = 'orgcs_engagement' | 'org62_support' | 'org62_training';
export type SourceType = 'engagement' | 'support' | 'training';
export type Owner = 'salesforce' | 'partner' | 'customer';
export type ActivityType = 'standard' | 'spanning' | 'quarter';
export type Quarter = 'q1' | 'q2' | 'q3' | 'q4';
export type Health = 'on_track' | 'at_risk' | 'blocked';
export type Status = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export interface NormalizedActivityCandidate {
  id: string;
  batchId: string;
  roadmapId: string;
  userId: string;

  sourceSystem: SourceSystem;
  sourceType: SourceType;
  sourceRecordId?: string;

  rawTitle: string;
  rawTemplate?: string;
  rawStage?: string;

  startDate?: string;
  endDate?: string;

  normalizedTitle: string;
  normalizedCategory?: string;

  owner: Owner;

  activityType: ActivityType;
  startMonth?: number;
  endMonth?: number;
  quarters?: Quarter[];

  health?: Health;
  status?: Status;

  confidence?: number;
  flags?: string[];

  include: boolean;

  // Source metadata for multi-org context
  sourceAccountName?: string;
  sourceOrgName?: string;
  sourceTemplateName?: string;
  sourceStageRaw?: string;
  sourceReportType?: string;

  overrideTitle?: string;
  overrideStartDate?: string;
  overrideEndDate?: string;
  overrideActivityType?: ActivityType;
  overrideOwner?: Owner;
  overrideStatus?: Status;

  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedCSVRow {
  [key: string]: string;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  parsedRows: number;
  candidates: NormalizedActivityCandidate[];
  errors: string[];
}
