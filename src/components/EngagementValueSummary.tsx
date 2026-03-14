import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Calendar, Award, BarChart3, ChevronDown } from 'lucide-react';
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

  const topCategory = metrics.categoryCounts[0];

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('engagementValueCollapsed');
    if (saved !== null) {
      return saved === 'true';
    }
    return metrics.totalEngagements === 0;
  });

  useEffect(() => {
    sessionStorage.setItem('engagementValueCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div
      className="rounded-xl border print-hide shadow-sm"
      style={{
        background: '#ffffff',
        borderColor: 'var(--border)'
      }}
    >
      <div
        className="flex items-center justify-between p-6 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded-lg hover:bg-white transition-all"
            style={{ color: '#066afe' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            <ChevronDown
              size={20}
              className="transition-transform duration-200"
              style={{
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
              }}
            />
          </button>
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
              {metrics.totalEngagements} {metrics.totalEngagements === 1 ? 'engagement' : 'engagements'} in {2000 + selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 transition-all cursor-pointer"
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

      {!isCollapsed && (
        <div className="px-6 pb-6">
          {metrics.categoryCounts.length > 0 ? (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-5 border-2 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 106, 254, 0.08) 0%, rgba(6, 106, 254, 0.03) 100%)',
                    borderColor: '#066afe'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={18} style={{ color: '#066afe' }} />
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Total Engagements
                    </div>
                  </div>
                  <div className="text-5xl font-extrabold mb-1" style={{ color: '#066afe', lineHeight: 1 }}>
                    {metrics.totalEngagements}
                  </div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    touchpoints in {2000 + selectedYear}
                  </div>
                </div>

                {topCategory && (
                  <div
                    className="rounded-xl p-5 border-2 shadow-sm relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${topCategory.color}15 0%, ${topCategory.color}08 100%)`,
                      borderColor: topCategory.color
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={18} style={{ color: topCategory.color }} />
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Top Engagement
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold mb-1" style={{ color: topCategory.color, lineHeight: 1.2 }}>
                      {topCategory.label}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {topCategory.count} activities ({Math.round((topCategory.count / metrics.totalEngagements) * 100)}%)
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Engagement Distribution
                </div>
                <div className="grid gap-2">
                  {metrics.categoryCounts.map((category, index) => {
                    const percentage = metrics.totalEngagements > 0
                      ? (category.count / metrics.totalEngagements) * 100
                      : 0;
                    const isTop = index === 0;

                    return (
                      <div
                        key={category.type}
                        className="rounded-lg p-3.5 border transition-all"
                        style={{
                          background: isTop ? `${category.color}08` : 'var(--surface2)',
                          borderColor: isTop ? category.color : 'var(--border)',
                          borderWidth: isTop ? '2px' : '1px'
                        }}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded shadow-sm"
                              style={{ background: category.color }}
                            />
                            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                              {category.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{
                              color: category.color,
                              background: `${category.color}20`
                            }}>
                              {percentage.toFixed(1)}%
                            </span>
                            <span className="text-2xl font-extrabold min-w-[2.5rem] text-right" style={{ color: 'var(--text)' }}>
                              {category.count}
                            </span>
                          </div>
                        </div>
                        <div
                          className="w-full h-2 rounded-full overflow-hidden shadow-inner"
                          style={{ background: 'var(--bg)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{
                              background: `linear-gradient(90deg, ${category.color} 0%, ${category.color}dd 100%)`,
                              width: `${percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="text-center py-12 rounded-xl border"
              style={{
                background: 'var(--surface2)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)'
              }}
            >
              <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-base font-semibold mb-1">
                No Engagements in {2000 + selectedYear}
              </p>
              <p className="text-sm">
                Add activities to your roadmap to track engagement value
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
