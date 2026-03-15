import type { RoadmapData, Activity, SpanningActivity } from './supabase';
import type { FiscalYearConfig } from './fiscal-year';
import { getAllRoadmapMonths } from './fiscal-year';
import { getTypeMetadata } from './activity-types';
import type { ActivityOwner } from './activity-types';

export interface EngagementCategory {
  type: string;
  label: string;
  count: number;
  color: string;
}

export interface EngagementMetrics {
  totalEngagements: number;
  categoryCounts: EngagementCategory[];
  selectedYear: number;
}

export function calculateEngagementMetrics(
  data: RoadmapData,
  fiscalConfig: FiscalYearConfig,
  selectedYear: number,
  typeLabels: Record<string, string>,
  typeColors: Record<string, string>,
  defaultTypeLabels: Record<string, string>,
  defaultTypeColors: Record<string, string>,
  filterOwner?: ActivityOwner,
  typeOwners?: Record<string, ActivityOwner>,
  defaultTypeOwners?: Record<string, ActivityOwner>
): EngagementMetrics {
  const allMonths = getAllRoadmapMonths(fiscalConfig);

  const yearMonths = allMonths
    .filter(month => {
      const date = new Date(2000 + selectedYear, month.calendarMonth, 1);
      return date.getFullYear() === 2000 + selectedYear;
    })
    .map(m => m.calendarMonth);

  const engagementCounts: Record<string, number> = {};

  const countActivity = (activity: Activity | SpanningActivity) => {
    if (filterOwner) {
      let activityOwner: ActivityOwner;

      if (activity.owner) {
        activityOwner = activity.owner;
      } else {
        const typeKey = activity.type || 'other';
        const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
        activityOwner = typeOwners?.[typeKey] || defaultTypeOwners?.[typeKey] || metadata?.owner || 'salesforce';
      }

      if (activityOwner !== filterOwner) {
        return;
      }
    }

    let includeActivity = false;

    if ('quarters' in activity) {
      includeActivity = activity.quarters.some(q => {
        const quarterIndex = parseInt(q.replace('q', '')) - 1;
        const quarterStartIdx = quarterIndex * 3;
        const quarterMonths = allMonths.slice(quarterStartIdx, quarterStartIdx + 3).map(m => m.calendarMonth);
        return quarterMonths.some(m => yearMonths.includes(m));
      });
    } else {
      const startMonth = activity.start_month ? parseInt(activity.start_month) : undefined;
      const endMonth = activity.end_month ? parseInt(activity.end_month) : undefined;

      if (startMonth !== undefined) {
        includeActivity = yearMonths.includes(startMonth);
      }
      if (!includeActivity && endMonth !== undefined) {
        includeActivity = yearMonths.includes(endMonth);
      }
      if (!includeActivity && startMonth !== undefined && endMonth !== undefined) {
        const allActivityMonths = [];
        const startIdx = allMonths.findIndex(m => m.calendarMonth === startMonth);
        const endIdx = allMonths.findIndex(m => m.calendarMonth === endMonth);
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            if (i < allMonths.length) {
              allActivityMonths.push(allMonths[i].calendarMonth);
            }
          }
        }
        includeActivity = allActivityMonths.some(m => yearMonths.includes(m));
      }
    }

    if (includeActivity) {
      const typeKey = activity.type || 'other';
      engagementCounts[typeKey] = (engagementCounts[typeKey] || 0) + 1;
    }
  };

  data.goals?.forEach(goal => {
    goal.initiatives?.forEach(initiative => {
      ['q1', 'q2', 'q3', 'q4'].forEach(quarter => {
        const activities = initiative.activities[quarter as keyof typeof initiative.activities];
        activities?.forEach(countActivity);
      });
      initiative.spanning?.forEach(countActivity);
    });
  });

  data.accountSpanning?.forEach(countActivity);

  const categoryCounts: EngagementCategory[] = Object.entries(engagementCounts)
    .map(([type, count]) => ({
      type,
      label: typeLabels[type] || defaultTypeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1),
      count,
      color: typeColors[type] || defaultTypeColors[type] || '#6c63ff'
    }))
    .sort((a, b) => b.count - a.count);

  const totalEngagements = categoryCounts.reduce((sum, cat) => sum + cat.count, 0);

  return {
    totalEngagements,
    categoryCounts,
    selectedYear
  };
}

export function getAvailableYears(fiscalConfig: FiscalYearConfig): number[] {
  const baseYear = fiscalConfig.baseYear;
  const currentYear = new Date().getFullYear() - 2000;

  const years: number[] = [];
  for (let y = baseYear - 2; y <= currentYear + 2; y++) {
    years.push(y);
  }

  return years.sort((a, b) => b - a);
}

export function calculateSalesforceMetrics(
  data: RoadmapData,
  fiscalConfig: FiscalYearConfig,
  selectedYear: number,
  typeLabels: Record<string, string>,
  typeColors: Record<string, string>,
  typeOwners: Record<string, ActivityOwner>,
  defaultTypeLabels: Record<string, string>,
  defaultTypeColors: Record<string, string>,
  defaultTypeOwners: Record<string, ActivityOwner>
): EngagementMetrics {
  return calculateEngagementMetrics(
    data,
    fiscalConfig,
    selectedYear,
    typeLabels,
    typeColors,
    defaultTypeLabels,
    defaultTypeColors,
    'salesforce',
    typeOwners,
    defaultTypeOwners
  );
}
