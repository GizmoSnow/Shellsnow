import { useMemo } from 'react';
import { TrendingUp, Layers, Award, Calendar } from 'lucide-react';
import type { RoadmapData } from '../lib/supabase';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { calculateSalesforceMetrics, getAvailableYears } from '../lib/engagement-metrics';
import type { ActivityOwner } from '../lib/activity-types';

interface SalesforceContributionSummaryProps {
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  selectedYear: number;
  onYearChange: (year: number) => void;
  typeLabels: Record<string, string>;
  typeColors: Record<string, string>;
  typeOwners: Record<string, ActivityOwner>;
  defaultTypeLabels: Record<string, string>;
  defaultTypeColors: Record<string, string>;
  defaultTypeOwners: Record<string, ActivityOwner>;
}

export function SalesforceContributionSummary({
  data,
  fiscalConfig,
  selectedYear,
  onYearChange,
  typeLabels,
  typeColors,
  typeOwners,
  defaultTypeLabels,
  defaultTypeColors,
  defaultTypeOwners
}: SalesforceContributionSummaryProps) {
  const availableYears = useMemo(() => getAvailableYears(fiscalConfig), [fiscalConfig]);

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

  const topCategory = metrics.categoryCounts[0];

  if (metrics.totalEngagements === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg px-6 py-3 mb-4 border print-hide flex items-center justify-between"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded"
            style={{ background: 'rgba(6, 106, 254, 0.1)' }}
          >
            <TrendingUp size={18} style={{ color: '#066afe' }} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Salesforce Contribution
            </div>
          </div>
        </div>

        <div className="h-8 w-px" style={{ background: 'var(--border)' }} />

        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded"
            style={{ background: 'rgba(6, 106, 254, 0.08)' }}
          >
            <Layers size={16} style={{ color: '#066afe' }} />
          </div>
          <div>
            <div className="text-2xl font-extrabold leading-none" style={{ color: '#066afe' }}>
              {metrics.totalEngagements}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              engagements
            </div>
          </div>
        </div>

        <div className="h-8 w-px" style={{ background: 'var(--border)' }} />

        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded"
            style={{ background: 'rgba(6, 106, 254, 0.08)' }}
          >
            <Award size={16} style={{ color: '#066afe' }} />
          </div>
          <div>
            <div className="text-lg font-bold leading-none" style={{ color: 'var(--text)' }}>
              {metrics.categoryCounts.length}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              types
            </div>
          </div>
        </div>

        {topCategory && (
          <>
            <div className="h-8 w-px" style={{ background: 'var(--border)' }} />

            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ background: topCategory.color }}
              />
              <div>
                <div className="text-sm font-bold leading-tight" style={{ color: topCategory.color }}>
                  {topCategory.label}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  top engagement
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          className="px-3 py-1.5 rounded-md font-semibold text-xs focus:outline-none focus:ring-2 transition-all cursor-pointer"
          style={{
            background: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}
        >
          {availableYears.map(year => (
            <option key={year} value={year}>
              {2000 + year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
