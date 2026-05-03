import type { ActivityType, Quarter } from './import-types';
import { extractQuarterFromTitle } from './title-normalizer';
import { getMonthPosition, type FiscalYearConfig } from './fiscal-year';

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
  sourceType: 'engagement' | 'support' | 'training',
  fiscalConfig?: FiscalYearConfig
): ClassificationResult {
  const flags: string[] = [];

  const titleQuarter = extractQuarterFromTitle(title);

  if (titleQuarter) {
    const dateQuarter = startDate ? getQuarterFromDate(startDate, fiscalConfig) : null;

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
      activityType: 'standard',
      flags: ['MissingDates'],
    };
  }

  const start = startDate ? new Date(startDate) : (endDate ? new Date(endDate) : undefined);
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

  if (durationDays > 90 && !sameMonth) {
    const quarters = getQuartersInRange(start, end, fiscalConfig);
    return {
      activityType: 'spanning',
      startMonth,
      endMonth,
      quarters,
      flags,
    };
  }

  const quarters = getQuartersInRange(start, end, fiscalConfig);
  return {
    activityType: 'standard',
    startMonth,
    endMonth,
    quarters,
    flags,
  };
}

function getQuarterFromDate(dateStr: string, fiscalConfig?: FiscalYearConfig): Quarter {
  const date = new Date(dateStr);
  const calendarMonth = date.getMonth() + 1;

  // Use fiscal year config if available
  if (fiscalConfig) {
    const pos = getMonthPosition(calendarMonth, fiscalConfig);
    if (pos) {
      return `q${pos.quarterIndex + 1}` as Quarter;
    }
  }

  // Fallback to calendar quarters
  if (calendarMonth >= 1 && calendarMonth <= 3) return 'q1';
  if (calendarMonth >= 4 && calendarMonth <= 6) return 'q2';
  if (calendarMonth >= 7 && calendarMonth <= 9) return 'q3';
  return 'q4';
}

function getQuartersInRange(start: Date, end: Date, fiscalConfig?: FiscalYearConfig): Quarter[] {
  const quarters = new Set<Quarter>();

  const current = new Date(start);
  while (current <= end) {
    const calendarMonth = current.getMonth() + 1;

    if (fiscalConfig) {
      const pos = getMonthPosition(calendarMonth, fiscalConfig);
      if (pos) {
        quarters.add(`q${pos.quarterIndex + 1}` as Quarter);
      }
    } else {
      // Fallback to calendar quarters
      if (calendarMonth >= 1 && calendarMonth <= 3) quarters.add('q1');
      if (calendarMonth >= 4 && calendarMonth <= 6) quarters.add('q2');
      if (calendarMonth >= 7 && calendarMonth <= 9) quarters.add('q3');
      if (calendarMonth >= 10 && calendarMonth <= 12) quarters.add('q4');
    }

    current.setMonth(current.getMonth() + 1);
  }

  return Array.from(quarters).sort();
}
