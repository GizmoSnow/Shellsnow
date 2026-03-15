import type { ActivityType, Quarter } from './import-types';
import { extractQuarterFromTitle } from './title-normalizer';

export interface ClassificationResult {
  activityType: ActivityType;
  startMonth?: number;
  endMonth?: number;
  quarters?: Quarter[];
  flags: string[];
}

export function classifyActivity(
  title: string,
  startDate: string | undefined,
  endDate: string | undefined,
  sourceType: 'engagement' | 'support' | 'training'
): ClassificationResult {
  const flags: string[] = [];

  const titleQuarter = extractQuarterFromTitle(title);

  if (titleQuarter) {
    const dateQuarter = startDate ? getQuarterFromDate(startDate) : null;

    if (dateQuarter && titleQuarter !== dateQuarter) {
      flags.push('QuarterConflict');
    }

    return {
      activityType: 'quarter',
      quarters: [titleQuarter],
      flags,
    };
  }

  if (!startDate && !endDate) {
    return {
      activityType: sourceType === 'training' ? 'standard' : 'standard',
      flags: ['MissingDates'],
    };
  }

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : start;

  if (!start || !end) {
    return {
      activityType: 'standard',
      flags: ['MissingDates'],
    };
  }

  const startMonth = start.getMonth() + 1;
  const endMonth = end.getMonth() + 1;

  const durationDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (durationDays > 90) {
    flags.push('LongDuration');
  }

  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

  if (sameMonth || sourceType === 'training') {
    return {
      activityType: 'standard',
      startMonth,
      endMonth: startMonth,
      flags,
    };
  }

  if (durationDays > 45 && !sameMonth) {
    const quarters = getQuartersInRange(start, end);
    return {
      activityType: 'spanning',
      startMonth,
      endMonth,
      quarters,
      flags,
    };
  }

  const quarters = getQuartersInRange(start, end);
  return {
    activityType: 'standard',
    startMonth,
    endMonth,
    quarters,
    flags,
  };
}

function getQuarterFromDate(dateStr: string): Quarter {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;

  if (month >= 1 && month <= 3) return 'q1';
  if (month >= 4 && month <= 6) return 'q2';
  if (month >= 7 && month <= 9) return 'q3';
  return 'q4';
}

function getQuartersInRange(start: Date, end: Date): Quarter[] {
  const quarters = new Set<Quarter>();

  const current = new Date(start);
  while (current <= end) {
    const month = current.getMonth() + 1;
    if (month >= 1 && month <= 3) quarters.add('q1');
    if (month >= 4 && month <= 6) quarters.add('q2');
    if (month >= 7 && month <= 9) quarters.add('q3');
    if (month >= 10 && month <= 12) quarters.add('q4');

    current.setMonth(current.getMonth() + 1);
  }

  return Array.from(quarters).sort();
}
