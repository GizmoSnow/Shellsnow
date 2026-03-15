import type { SourceType } from './import-types';
import { CheckCircle2, Circle, XCircle, Clock } from 'lucide-react';

export const SOURCE_TYPE_COLORS: Record<SourceType | 'manual', string> = {
  engagement: '#0176D3',
  support: '#8B46FF',
  training: '#06A59A',
  manual: '#6B7280',
};

export const SOURCE_TYPE_LABELS: Record<SourceType | 'manual', string> = {
  engagement: 'Engagement',
  support: 'Support',
  training: 'Training',
  manual: 'Manual',
};

export function getSourceTypeColor(sourceType: SourceType | 'manual' | undefined): string {
  if (!sourceType) return SOURCE_TYPE_COLORS.manual;
  return SOURCE_TYPE_COLORS[sourceType] || SOURCE_TYPE_COLORS.manual;
}

export function getSourceTypeLabel(sourceType: SourceType | 'manual' | undefined): string {
  if (!sourceType) return SOURCE_TYPE_LABELS.manual;
  return SOURCE_TYPE_LABELS[sourceType] || SOURCE_TYPE_LABELS.manual;
}

export function getLifecycleStatusIcon(status: string | undefined): any {
  switch (status) {
    case 'completed':
      return CheckCircle2;
    case 'not_started':
      return Circle;
    case 'cancelled':
      return XCircle;
    case 'in_progress':
      return Clock;
    default:
      return null;
  }
}

export function getLifecycleStatusColor(status: string | undefined): string {
  switch (status) {
    case 'completed':
      return '#2E844A';
    case 'not_started':
      return '#6B7280';
    case 'cancelled':
      return '#AA3001';
    case 'in_progress':
      return '#0176D3';
    default:
      return '#6B7280';
  }
}

export function getLifecycleStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'not_started':
      return 'Not Started';
    case 'cancelled':
      return 'Cancelled';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Unknown';
  }
}
