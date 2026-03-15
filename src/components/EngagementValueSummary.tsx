import { useState, useMemo, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RoadmapData } from '../lib/supabase';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { calculateSalesforceMetrics } from '../lib/engagement-metrics';
import type { ActivityOwner } from '../lib/activity-types';

interface EngagementValueSummaryProps {
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  selectedYear: number;
  typeLabels: Record<string, string>;
  typeColors: Record<string, string>;
  typeOwners: Record<string, ActivityOwner>;
  defaultTypeLabels: Record<string, string>;
  defaultTypeColors: Record<string, string>;
  defaultTypeOwners: Record<string, ActivityOwner>;
}

export function EngagementValueSummary({
  data,
  fiscalConfig,
  selectedYear,
  typeLabels,
  typeColors,
  typeOwners,
  defaultTypeLabels,
  defaultTypeColors,
  defaultTypeOwners
}: EngagementValueSummaryProps) {
  const metrics = useMemo(() => {
    return calculateSalesforceMetrics(
      data,
      fiscalConfig,
      selectedYear,
      typeLabels,
      typeColors,
      typeOwners,
      defaultTypeLabels,
      defaultTypeColors,
      defaultTypeOwners
    );
  }, [data, fiscalConfig, selectedYear, typeLabels, typeColors, typeOwners, defaultTypeLabels, defaultTypeColors, defaultTypeOwners]);

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = sessionStorage.getItem('engagementBreakdownExpanded');
    return saved === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('engagementBreakdownExpanded', String(isExpanded));
  }, [isExpanded]);

  if (metrics.totalEngagements === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border print-hide mb-4"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Salesforce engagement breakdown
        </span>
        <ChevronDown
          size={18}
          className="transition-transform duration-200"
          style={{
            color: 'var(--text-muted)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isExpanded && (
        <div
          className="px-6 pb-4 pt-1 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="space-y-2">
            {metrics.categoryCounts.map((category, index) => {
              const percentage = metrics.totalEngagements > 0
                ? (category.count / metrics.totalEngagements) * 100
                : 0;

              return (
                <div
                  key={category.type}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: 'var(--text-muted)', minWidth: '1.5rem' }}
                    >
                      {index + 1}.
                    </span>
                    <div
                      className="w-3 h-3 rounded flex-shrink-0"
                      style={{ background: category.color }}
                    />
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {category.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="relative w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                        style={{
                          background: category.color,
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: 'var(--text-muted)', minWidth: '3rem', textAlign: 'right' }}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: 'var(--text-primary)', minWidth: '2.5rem', textAlign: 'right' }}
                    >
                      {category.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
