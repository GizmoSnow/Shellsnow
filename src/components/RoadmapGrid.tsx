import { X, Plus, Pencil, Copy, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { RoadmapData, Goal, Initiative, Activity } from '../lib/supabase';
import { useState, useEffect } from 'react';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getRoadmapQuarters, getMonthPosition, getAllRoadmapMonths } from '../lib/fiscal-year';
import { isDarkBackground } from '../lib/color-utils';

interface RoadmapGridProps {
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  onDataChange: (data: RoadmapData) => void;
  onOpenAddModal: (context: any) => void;
  onOpenEditModal: (context: any, activity: Activity) => void;
  getTypeColor: (typeKey: string) => string;
}

function getTextColor(bgColor: string): string {
  if (bgColor.toLowerCase() === '#fcc003') {
    return '#001e5b';
  }
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#ffffff';
}

export default function RoadmapGrid({ data, fiscalConfig, onDataChange, onOpenAddModal, onOpenEditModal, getTypeColor }: RoadmapGridProps) {
  const quarters = getRoadmapQuarters(fiscalConfig);
  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const [copyDropdown, setCopyDropdown] = useState<string | null>(null);
  const [editingQuarter, setEditingQuarter] = useState<string | null>(null);
  const [editingSuccessPath, setEditingSuccessPath] = useState<string | null>(null);
  const [detailCardActivity, setDetailCardActivity] = useState<{ activity: Activity; goal: Goal; initiative: Initiative; quarter: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailCardActivity) {
        setDetailCardActivity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailCardActivity]);

  const getQuarterTitle = (qkey: string) => {
    return data.quarterTitles?.[qkey as keyof typeof data.quarterTitles] || qkey.toUpperCase();
  };

  const updateQuarterTitle = (qkey: string, newTitle: string) => {
    const newData = { ...data };
    if (!newData.quarterTitles) {
      newData.quarterTitles = {};
    }
    newData.quarterTitles[qkey as keyof typeof newData.quarterTitles] = newTitle;
    onDataChange(newData);
  };

  const getSuccessPathLabel = (qkey: string) => {
    if (data.successPathLabels?.[qkey as keyof typeof data.successPathLabels]) {
      return data.successPathLabels[qkey as keyof typeof data.successPathLabels];
    }
    return qkey === 'q1' ? 'Success Path' : 'Success Path Review';
  };

  const updateSuccessPathLabel = (qkey: string, newLabel: string) => {
    const newData = { ...data };
    if (!newData.successPathLabels) {
      newData.successPathLabels = {};
    }
    newData.successPathLabels[qkey as keyof typeof newData.successPathLabels] = newLabel;
    onDataChange(newData);
  };

  const getActivityMonthPosition = (monthId: string): { quarterIndex: number; monthIndex: number } | null => {
    const pos = getMonthPosition(Number(monthId), fiscalConfig);
    if (!pos) return null;
    return pos;
  };

  const copyActivity = (goalId: string, initiativeId: string, sourceQuarter: string, activityId: string, targetQuarters: string[]) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (!goal) return;

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative) return;

    const sourceAct = initiative.activities[sourceQuarter as keyof typeof initiative.activities].find(a => a.id === activityId);
    if (!sourceAct) return;

    targetQuarters.forEach(targetQ => {
      const newActivity = {
        ...sourceAct,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      initiative.activities[targetQ as keyof typeof initiative.activities].push(newActivity);
    });

    onDataChange(newData);
    setCopyDropdown(null);
  };

  const deleteActivity = (goalId: string, initiativeId: string, quarter: string, activityId: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (!goal) return;

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative) return;

    initiative.activities[quarter as keyof typeof initiative.activities] =
      initiative.activities[quarter as keyof typeof initiative.activities].filter(a => a.id !== activityId);

    onDataChange(newData);
  };

  const deleteSpanning = (goalId: string, initiativeId: string, spanningId: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (!goal) return;

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative || !initiative.spanning) return;

    initiative.spanning = initiative.spanning.filter(s => s.id !== spanningId);
    onDataChange(newData);
  };

  const deleteAccountSpanning = (spanningId: string) => {
    const newData = { ...data };
    if (!newData.accountSpanning) return;

    newData.accountSpanning = newData.accountSpanning.filter(s => s.id !== spanningId);
    onDataChange(newData);
  };

  const reorderActivity = (goalId: string, initiativeId: string, quarter: string, activityId: string, direction: 'up' | 'down') => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (!goal) return;

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative) return;

    const activities = initiative.activities[quarter as keyof typeof initiative.activities];
    const currentIndex = activities.findIndex(a => a.id === activityId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;

    [activities[currentIndex], activities[newIndex]] = [activities[newIndex], activities[currentIndex]];

    onDataChange(newData);
  };

  const reorderAccountSpanning = (spanningId: string, direction: 'up' | 'down') => {
    const newData = { ...data };
    if (!newData.accountSpanning) return;

    const currentIndex = newData.accountSpanning.findIndex(s => s.id === spanningId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= newData.accountSpanning.length) return;

    [newData.accountSpanning[currentIndex], newData.accountSpanning[newIndex]] =
      [newData.accountSpanning[newIndex], newData.accountSpanning[currentIndex]];

    onDataChange(newData);
  };

  const getStatusColor = (status?: string) => {
    if (status === 'blocked') return '#ef4444';
    if (status === 'at_risk') return '#eab308';
    return '#22c55e';
  };

  const getStatusLabel = (status?: string) => {
    if (status === 'blocked') return 'Blocked';
    if (status === 'at_risk') return 'At Risk';
    return 'On Track';
  };

  const renderActivityPill = (
    activity: Activity,
    goal: Goal,
    initiative: Initiative,
    quarter: string,
    context: 'grid' | 'full'
  ) => {
    const bgColor = getTypeColor(activity.type);
    const textColor = getTextColor(bgColor);
    const dropdownId = `${goal.id}-${initiative.id}-${quarter}-${activity.id}`;
    const statusColor = getStatusColor(activity.status);

    return (
      <div key={activity.id} className="relative">
        <div
          onClick={() => setDetailCardActivity({ activity, goal, initiative, quarter })}
          className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-85 relative cursor-pointer ${context === 'full' ? 'w-full justify-center' : ''} ${activity.isCriticalPath ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
          style={{ background: bgColor, color: textColor }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: statusColor }}
            title={getStatusLabel(activity.status)}
          />
          {activity.isCriticalPath && (
            <Star size={11} className="fill-current flex-shrink-0" title="Critical Path" />
          )}
          {activity.name}
          <div className="hidden group-hover:flex items-center gap-1 ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCopyDropdown(copyDropdown === dropdownId ? null : dropdownId);
              }}
              className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Copy size={9} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter }, activity);
              }}
              className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Pencil size={9} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteActivity(goal.id, initiative.id, quarter, activity.id);
              }}
              className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        </div>
        {copyDropdown === dropdownId && (
          <div className="absolute top-full left-0 mt-1 border rounded-lg shadow-lg p-2 z-50 min-w-[140px]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Copy to:</div>
            {qkeys.map((targetQ) => (
              <button
                key={targetQ}
                onClick={(e) => {
                  e.stopPropagation();
                  copyActivity(goal.id, initiative.id, quarter, activity.id, [targetQ]);
                }}
                disabled={targetQ === quarter}
                className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-primary)' }}
              >
                {getQuarterTitle(targetQ)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const isDark = isDarkBackground(data.backgroundColor);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] rounded-lg overflow-hidden border shadow-sm print-grid" style={{ borderColor: 'var(--border-subtle)', backgroundColor: data.backgroundColor || '#FFFFFF' }}>
        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: data.headerColor || 'var(--primary)', borderColor: data.headerColor || 'var(--primary)' }}>
          <div className="p-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.2)' }}></div>
          {quarters.map((quarter, i) => (
            <div
              key={i}
              className={`p-4 text-center font-extrabold text-base tracking-wider border-r ${i === 3 ? 'border-r-0' : ''} print-show-text`}
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
            >
              {quarter.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: '#f9fafb', borderColor: 'var(--border-subtle)' }}>
          <div className="p-3 border-r text-xs font-semibold uppercase tracking-wide flex items-center" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            Success Path
          </div>
          {quarters.map((quarter, i) => {
            const successPathColor = getTypeColor('csm');
            const textColor = '#ffffff';
            const quarterKey = `q${quarter.quarter}` as keyof typeof data.successPathLabels;
            const label = data.successPathLabels?.[quarterKey] || (i === 0 ? 'Success Path' : 'Success Path Review');

            return (
              <div key={i} className={`p-2 flex justify-center items-center border-r ${i === 3 ? 'border-r-0' : ''}`} style={{ borderColor: 'var(--border-subtle)' }}>
                <div
                  className="text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap print-show-pill"
                  style={{ background: successPathColor, color: textColor }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Account-Level Activities */}
        <div className="grid grid-cols-[200px_1fr] border-b print-avoid-break" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-4 border-r flex flex-col justify-center" style={{ borderColor: 'var(--border-subtle)', background: '#ffffff' }}>
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: isDark ? '#ffffff' : 'var(--primary)' }}>
              Ongoing Activities
            </div>
          </div>
          <div className="p-2 grid gap-1" style={{ background: '#f9fafb', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {(data.accountSpanning || []).map((sp, index) => {
              const bgColor = getTypeColor(sp.type);
              const textColor = getTextColor(bgColor);
              const sortedQuarters = [...(sp.quarters || [])].sort();
              const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
              const minIdx = Math.min(...qIndexes);
              const maxIdx = Math.max(...qIndexes);
              const isFirst = index === 0;
              const isLast = index === (data.accountSpanning || []).length - 1;

              return (
                <div
                  key={sp.id}
                  className={`group flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs relative transition-all hover:opacity-85 ${sp.isCriticalPath ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                  style={{
                    background: bgColor,
                    color: textColor,
                    gridColumnStart: minIdx + 1,
                    gridColumnEnd: maxIdx + 2
                  }}
                  title={sp.name}
                >
                  {sp.isCriticalPath && (
                    <Star size={11} className="fill-current flex-shrink-0" title="Critical Path" />
                  )}
                  {sp.name}
                  <div className="hidden group-hover:flex absolute right-2 items-center gap-1">
                    {!isFirst && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderAccountSpanning(sp.id, 'up');
                        }}
                        className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                      >
                        <ChevronUp size={10} />
                      </button>
                    )}
                    {!isLast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderAccountSpanning(sp.id, 'down');
                        }}
                        className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                      >
                        <ChevronDown size={10} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal({ isAccountLevel: true, quarter: 'spanning' }, sp);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    >
                      <Pencil size={9} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAccountSpanning(sp.id);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => onOpenAddModal({ isAccountLevel: true, quarter: 'q1' })}
              className="border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', gridColumn: '1 / -1' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        </div>

        {data.goals.map((goal, goalIdx) => {
          const deduplicatedInitiatives = goal.initiatives.reduce((acc, initiative) => {
            const existing = acc.find(i => i.label === initiative.label);
            if (existing) {
              qkeys.forEach(qk => {
                const existingActivities = existing.activities[qk] || [];
                const newActivities = initiative.activities[qk] || [];
                const combinedActivities = [...existingActivities, ...newActivities];
                const uniqueActivities = combinedActivities.filter((activity, index, self) =>
                  index === self.findIndex(a => a.id === activity.id)
                );
                existing.activities[qk] = uniqueActivities;
              });

              const existingSpanning = existing.spanning || [];
              const newSpanning = initiative.spanning || [];
              const combinedSpanning = [...existingSpanning, ...newSpanning];
              const uniqueSpanning = combinedSpanning.filter((activity, index, self) =>
                index === self.findIndex(a => a.id === activity.id)
              );
              existing.spanning = uniqueSpanning;
            } else {
              acc.push(initiative);
            }
            return acc;
          }, [] as typeof goal.initiatives);

          return (
          <div key={goal.id} className={`${goalIdx < data.goals.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border-subtle)' }}>
            {deduplicatedInitiatives.map((initiative, iniIdx) => {
              const spanningActivities = initiative.spanning || [];

              const allActivitiesByQuarter = qkeys.map(qk => ({
                quarter: qk,
                activities: initiative.activities[qk] || []
              }));

              const activitiesWithSpan: Array<{ activity: Activity; quarter: string; startCol: number; endCol: number; row: number }> = [];
              const renderedActivities = new Set<string>();

              allActivitiesByQuarter.forEach(({ quarter, activities }) => {
                activities.forEach(activity => {
                  if (renderedActivities.has(activity.id)) return;
                  if (!activity.name || activity.name.trim() === '') return;

                  const startMonth = activity.start_month;
                  const endMonth = activity.end_month;

                  if (!startMonth || !endMonth) {
                    const qIdx = qkeys.indexOf(quarter as any);
                    activitiesWithSpan.push({
                      activity,
                      quarter,
                      startCol: qIdx * 3 + 1,
                      endCol: qIdx * 3 + 4,
                      row: -1
                    });
                  } else {
                    const startMonthNum = typeof startMonth === 'string' ? parseInt(startMonth, 10) : startMonth;
                    const endMonthNum = typeof endMonth === 'string' ? parseInt(endMonth, 10) : endMonth;

                    const startPos = getMonthPosition(startMonthNum, fiscalConfig);
                    const endPos = getMonthPosition(endMonthNum, fiscalConfig);

                    if (startPos && endPos) {
                      const absoluteStartIndex = startPos.quarterIndex * 3 + startPos.monthIndex;
                      const absoluteEndIndex = endPos.quarterIndex * 3 + endPos.monthIndex;

                      const startCol = absoluteStartIndex + 1;
                      const endCol = absoluteEndIndex + 2;

                      activitiesWithSpan.push({
                        activity,
                        quarter,
                        startCol,
                        endCol,
                        row: -1
                      });
                    }
                  }

                  renderedActivities.add(activity.id);
                });
              });

              activitiesWithSpan.sort((a, b) => {
                if (a.startCol !== b.startCol) return a.startCol - b.startCol;
                return (b.endCol - b.startCol) - (a.endCol - a.startCol);
              });

              const rows: typeof activitiesWithSpan[] = [];
              activitiesWithSpan.forEach(item => {
                let placed = false;
                for (let r = 0; r < rows.length; r++) {
                  const conflicts = rows[r].some(existing =>
                    !(item.endCol <= existing.startCol || item.startCol >= existing.endCol)
                  );
                  if (!conflicts) {
                    rows[r].push({ ...item, row: r });
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  rows.push([{ ...item, row: rows.length }]);
                }
              });

              const flatActivitiesWithRows = rows.flat();

              return (
                <div key={initiative.id}>
                  {spanningActivities.length > 0 && (
                    <div className="grid grid-cols-[200px_1fr] border-t print-avoid-break" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="p-4 border-r flex flex-col justify-center relative" style={{ borderColor: 'var(--border-subtle)', background: '#ffffff' }}>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ background: goal.color }}
                        ></div>
                        {iniIdx === 0 && (
                          <>
                            <div
                              className="text-xs font-extrabold uppercase tracking-wide mb-1"
                              style={{ color: goal.color }}
                            >
                              {goal.number}
                            </div>
                            <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                              {goal.title}
                            </div>
                          </>
                        )}
                        <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          Key Initiative
                        </div>
                        <div className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
                          {initiative.label}
                        </div>
                      </div>
                      <div className="p-2 grid gap-1" style={{ background: '#f9fafb', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {spanningActivities.map((sp) => {
                          const bgColor = getTypeColor(sp.type);
                          const textColor = getTextColor(bgColor);
                          const sortedQuarters = [...(sp.quarters || [])].sort();
                          const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
                          const minIdx = Math.min(...qIndexes);
                          const maxIdx = Math.max(...qIndexes);

                          return (
                            <div
                              key={sp.id}
                              className={`group flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs relative transition-all hover:opacity-85 ${sp.isCriticalPath ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                              style={{
                                background: bgColor,
                                color: textColor,
                                gridColumnStart: minIdx + 1,
                                gridColumnEnd: maxIdx + 2
                              }}
                            >
                              {sp.isCriticalPath && (
                                <Star size={11} className="fill-current flex-shrink-0" title="Critical Path" />
                              )}
                              {sp.name}
                              <div className="hidden group-hover:flex absolute right-2 items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter: 'spanning' }, sp);
                                  }}
                                  className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                >
                                  <Pencil size={9} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSpanning(goal.id, initiative.id, sp.id);
                                  }}
                                  className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id, quarter: 'spanning' })}
                          className="border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', gridColumn: '1 / -1' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                        >
                          <Plus size={12} />
                          Add Spanning
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-[200px_1fr] border-t print-avoid-break" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="p-4 border-r flex flex-col justify-center relative" style={{ borderColor: 'var(--border-subtle)', background: '#ffffff' }}>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ background: goal.color }}
                      ></div>
                      {iniIdx === 0 && spanningActivities.length === 0 && (
                        <>
                          <div
                            className="text-xs font-extrabold uppercase tracking-wide mb-1"
                            style={{ color: goal.color }}
                          >
                            {goal.number}
                          </div>
                          <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {goal.title}
                          </div>
                        </>
                      )}
                      {spanningActivities.length === 0 && (
                        <>
                          <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Key Initiative
                          </div>
                          <div className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
                            {initiative.label}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative" style={{ background: '#f9fafb' }}>
                      {/* Activities container with absolute positioning */}
                      <div
                        style={{
                          position: 'relative',
                          minHeight: `${(rows.length || 1) * 44 + 70}px`,
                          padding: '8px 8px 60px 8px'
                        }}
                      >
                        {flatActivitiesWithRows.map((item) => {
                          const bgColor = getTypeColor(item.activity.type);
                          const textColor = getTextColor(bgColor);
                          const dropdownId = `${goal.id}-${initiative.id}-${item.activity.id}`;

                          // Calculate position as percentage of total width
                          const allRoadmapMonths = getAllRoadmapMonths(fiscalConfig);
                          const startMonthNum = item.activity.start_month ? Number(item.activity.start_month) : null;
                          const endMonthNum = item.activity.end_month ? Number(item.activity.end_month) : null;

                          let leftPercent = 0;
                          let widthPercent = 100;

                          if (startMonthNum !== null && endMonthNum !== null) {
                            const startIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === startMonthNum);
                            const endIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === endMonthNum);

                            if (startIdx !== -1 && endIdx !== -1) {
                              leftPercent = (startIdx / 12) * 100;
                              widthPercent = ((endIdx - startIdx + 1) / 12) * 100;
                            }
                          }

                          const activities = initiative.activities[item.quarter as keyof typeof initiative.activities];
                          const activityIndex = activities.findIndex(a => a.id === item.activity.id);
                          const isFirst = activityIndex === 0;
                          const isLast = activityIndex === activities.length - 1;

                          const statusColor = getStatusColor(item.activity.status);

                          return (
                            <div
                              key={item.activity.id}
                              style={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: `${item.row * 44 + 8}px`,
                                height: '36px',
                                padding: '0 2px',
                                zIndex: 30
                              }}
                            >
                              <div
                                onClick={() => setDetailCardActivity({ activity: item.activity, goal, initiative, quarter: item.quarter })}
                                className={`group flex items-center gap-1.5 px-3 text-xs font-semibold transition-all hover:opacity-85 cursor-pointer ${item.activity.isCriticalPath ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                                style={{
                                  background: bgColor,
                                  color: textColor,
                                  borderRadius: '9999px',
                                  justifyContent: 'center',
                                  height: '100%'
                                }}
                                title={item.activity.name}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: statusColor }}
                                  title={getStatusLabel(item.activity.status)}
                                />
                                {item.activity.isCriticalPath && (
                                  <Star size={11} className="fill-current flex-shrink-0" title="Critical Path" />
                                )}
                                <span
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0
                                  }}
                                >
                                  {item.activity.name}
                                </span>
                                <div className="hidden group-hover:flex items-center gap-1 ml-auto flex-shrink-0">
                                  {!isFirst && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reorderActivity(goal.id, initiative.id, item.quarter, item.activity.id, 'up');
                                      }}
                                      className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                    >
                                      <ChevronUp size={10} />
                                    </button>
                                  )}
                                  {!isLast && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reorderActivity(goal.id, initiative.id, item.quarter, item.activity.id, 'down');
                                      }}
                                      className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                    >
                                      <ChevronDown size={10} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCopyDropdown(copyDropdown === dropdownId ? null : dropdownId);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                  >
                                    <Copy size={9} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter: item.quarter }, item.activity);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                  >
                                    <Pencil size={9} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteActivity(goal.id, initiative.id, item.quarter, item.activity.id);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                              {copyDropdown === dropdownId && (
                                <div className="absolute top-full left-0 mt-1 border rounded-lg shadow-lg p-2 z-50 min-w-[140px]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface)' }}>
                                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Copy to:</div>
                                  {qkeys.map((targetQ) => (
                                    <button
                                      key={targetQ}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyActivity(goal.id, initiative.id, item.quarter, item.activity.id, [targetQ]);
                                      }}
                                      disabled={targetQ === item.quarter}
                                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      {getQuarterTitle(targetQ)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Month gridlines */}
                      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none" style={{ zIndex: 10 }}>
                        {quarters.flatMap((quarter, qIdx) =>
                          quarter.months.map((month, mIdx) => {
                            const globalMonthIdx = qIdx * 3 + mIdx;
                            const leftPercent = (globalMonthIdx / 12) * 100;
                            return (
                              <div
                                key={`${qIdx}-${mIdx}`}
                                style={{
                                  position: 'absolute',
                                  left: `${leftPercent}%`,
                                  top: 0,
                                  bottom: 0,
                                  width: '1px',
                                  background: 'rgba(0,0,0,0.06)'
                                }}
                              />
                            );
                          })
                        )}
                        {/* Month labels */}
                        <div className="absolute top-0 left-0 right-0 h-[30px] flex">
                          {quarters.flatMap((quarter) =>
                            quarter.months.map((month, mIdx) => (
                              <div
                                key={`${quarter.quarter}-${mIdx}`}
                                className="flex-1 flex items-center justify-center"
                              >
                                <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                                  {month.abbrev}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Single Add button */}
                      <div className="absolute bottom-0 left-0 right-0 p-2" style={{ zIndex: 40 }}>
                        <button
                          onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id })}
                          className="w-full border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

      {/* Detail Card Modal */}
      {detailCardActivity && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDetailCardActivity(null)}
          />
          <div
            className="fixed z-50 rounded-xl shadow-2xl p-5 max-w-[320px]"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div>
                <div className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                  {detailCardActivity.activity.name}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="inline-block px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background: getTypeColor(detailCardActivity.activity.type),
                      color: getTextColor(getTypeColor(detailCardActivity.activity.type))
                    }}
                  >
                    {detailCardActivity.activity.type}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: getStatusColor(detailCardActivity.activity.status) }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {getStatusLabel(detailCardActivity.activity.status)}
                  </span>
                </div>
              </div>

              {detailCardActivity.activity.start_month && detailCardActivity.activity.end_month && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="font-semibold mb-1">Timeline</div>
                  <div>
                    {(() => {
                      const allMonths = getAllRoadmapMonths(fiscalConfig);
                      const startMonth = allMonths.find(m => m.calendarMonth === Number(detailCardActivity.activity.start_month));
                      const endMonth = allMonths.find(m => m.calendarMonth === Number(detailCardActivity.activity.end_month));
                      return `${startMonth?.abbrev || ''} - ${endMonth?.abbrev || ''}`;
                    })()}
                  </div>
                </div>
              )}

              {detailCardActivity.activity.description && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="font-semibold mb-1">Description</div>
                  <div className="whitespace-pre-wrap">{detailCardActivity.activity.description}</div>
                </div>
              )}

              <button
                onClick={() => {
                  onOpenEditModal(
                    {
                      goalId: detailCardActivity.goal.id,
                      initiativeId: detailCardActivity.initiative.id,
                      quarter: detailCardActivity.quarter
                    },
                    detailCardActivity.activity
                  );
                  setDetailCardActivity(null);
                }}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: '#066afe',
                  color: '#ffffff'
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
