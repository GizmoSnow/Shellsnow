import type { Status, SourceType } from './import-types';

const ENGAGEMENT_STATUS_MAP: Record<string, Status> = {
  new: 'not_started',
  review: 'not_started',
  'in review': 'not_started',
  deliver: 'in_progress',
  'in progress': 'in_progress',
  delivering: 'in_progress',
  active: 'in_progress',
  closed: 'completed',
  complete: 'completed',
  completed: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

const SUPPORT_STATUS_MAP: Record<string, Status> = {
  new: 'not_started',
  open: 'not_started',
  working: 'in_progress',
  pending: 'in_progress',
  'pending customer': 'in_progress',
  'pending salesforce': 'in_progress',
  escalated: 'in_progress',
  'in progress': 'in_progress',
  closed: 'completed',
  resolved: 'completed',
  'closed - resolved': 'completed',
  complete: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

const TRAINING_STATUS_MAP: Record<string, Status> = {
  registered: 'not_started',
  enrolled: 'not_started',
  'not started': 'not_started',
  'in progress': 'in_progress',
  started: 'in_progress',
  attending: 'in_progress',
  completed: 'completed',
  complete: 'completed',
  attended: 'completed',
  passed: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  'no show': 'cancelled',
  'did not attend': 'cancelled',
};

export function mapStatus(rawStage: string | undefined, sourceType: SourceType): Status | undefined {
  if (!rawStage) return undefined;

  const normalized = rawStage.toLowerCase().trim();

  let statusMap: Record<string, Status>;

  switch (sourceType) {
    case 'engagement':
      statusMap = ENGAGEMENT_STATUS_MAP;
      break;
    case 'support':
      statusMap = SUPPORT_STATUS_MAP;
      break;
    case 'training':
      statusMap = TRAINING_STATUS_MAP;
      break;
    default:
      return undefined;
  }

  for (const [key, value] of Object.entries(statusMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return undefined;
}

export function inferStatusFromDates(
  startDate: string | undefined,
  endDate: string | undefined,
  sourceType: SourceType
): Status {
  if (!startDate && !endDate) {
    return 'not_started';
  }

  const now = new Date();
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (end && end < now) {
    return 'completed';
  }

  if (start && start > now) {
    return 'not_started';
  }

  if (start && start <= now) {
    return 'in_progress';
  }

  if (sourceType === 'training' && endDate) {
    return 'completed';
  }

  return 'not_started';
}
