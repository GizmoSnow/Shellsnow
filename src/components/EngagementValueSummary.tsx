import { useState, useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import type { RoadmapData } from '../lib/supabase';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { calculateEngagementMetrics, getAvailableYears } from '../lib/engagement-metrics';

interface EngagementValueSummaryProps {
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  typeLabels: Record<string, string>;
  typeColors: Record<string, string>;
  defaultTypeLabels: Record<string, string>;
  defaultTypeColors: Record<string, string>;
}

export function EngagementValueSummary({
  data,
  fiscalConfig,
  typeLabels,
  typeColors,
  defaultTypeLabels,
  defaultTypeColors
}: EngagementValueSummaryProps) {
  const currentYear = new Date().getFullYear() - 2000;
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => getAvailableYears(fiscalConfig), [fiscalConfig]);

  const metrics = useMemo(() => {
    return calculateEngagementMetrics(
      data,
      fiscalConfig,
      selectedYear,
      typeLabels,
      typeColors,
      defaultTypeLabels,
      defaultTypeColors
    );
  }, [data, fiscalConfig, selectedYear, typeLabels, typeColors, defaultTypeLabels, defaultTypeColors]);

  return (
    <div
      className="rounded-xl p-6 mb-6 border print-hide"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg"
            style={{ background: 'rgba(6, 106, 254, 0.1)' }}
          >
            <TrendingUp size={24} style={{ color: '#066afe' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--text)' }}>
              Engagement Value Delivered
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Track customer engagements and demonstrate value
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 transition-all"
            style={{
              background: 'var(--surface2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              focusRingColor: '#066afe'
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

      <div className="grid gap-4">
        <div
          className="rounded-lg p-5 border-2"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 106, 254, 0.05) 0%, rgba(6, 106, 254, 0.02) 100%)',
            borderColor: '#066afe'
          }}
        >
          <div className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Total Engagements
          </div>
          <div className="text-4xl font-extrabold" style={{ color: '#066afe' }}>
            {metrics.totalEngagements}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            activities in {2000 + selectedYear}
          </div>
        </div>

        {metrics.categoryCounts.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Engagement Breakdown
            </div>
            <div className="grid gap-2.5">
              {metrics.categoryCounts.map((category) => {
                const percentage = metrics.totalEngagements > 0
                  ? Math.round((category.count / metrics.totalEngagements) * 100)
                  : 0;

                return (
                  <div
                    key={category.type}
                    className="rounded-lg p-4 border transition-all hover:scale-[1.01]"
                    style={{
                      background: 'var(--surface2)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ background: category.color }}
                        />
                        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {category.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {percentage}%
                        </span>
                        <span className="text-xl font-extrabold" style={{ color: 'var(--text)' }}>
                          {category.count}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--bg)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          background: category.color,
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {metrics.categoryCounts.length === 0 && (
          <div
            className="text-center py-8 rounded-lg"
            style={{
              background: 'var(--surface2)',
              color: 'var(--text-muted)'
            }}
          >
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">
              No engagements found for {2000 + selectedYear}
            </p>
            <p className="text-xs mt-1">
              Add activities to your roadmap to see engagement metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
