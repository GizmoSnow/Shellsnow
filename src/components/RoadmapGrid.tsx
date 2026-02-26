import { X, Plus, Pencil, Copy } from 'lucide-react';
import { RoadmapData, Goal, Initiative, Activity } from '../lib/supabase';
import { useState } from 'react';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getRoadmapQuarters, getMonthPosition } from '../lib/fiscal-year';

interface RoadmapGridProps {
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  onDataChange: (data: RoadmapData) => void;
  onOpenAddModal: (context: any) => void;
  onOpenEditModal: (context: any, activity: Activity) => void;
  getTypeColor: (typeKey: string) => string;
}

function getTextColor(bgColor: string): string {
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

    return (
      <div key={activity.id} className="relative">
        <div
          className={`group inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-85 relative ${context === 'full' ? 'w-full justify-center' : ''}`}
          style={{ background: bgColor, color: textColor }}
        >
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
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[140px]" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Copy to:</div>
            {qkeys.map((targetQ) => (
              <button
                key={targetQ}
                onClick={(e) => {
                  e.stopPropagation();
                  copyActivity(goal.id, initiative.id, quarter, activity.id, [targetQ]);
                }}
                disabled={targetQ === quarter}
                className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text)' }}
              >
                {getQuarterTitle(targetQ)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] rounded-2xl overflow-hidden border print-grid" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>
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

        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="p-3 border-r text-xs font-semibold uppercase tracking-wide flex items-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Success Path
          </div>
          {quarters.map((quarter, i) => {
            const csmColor = getTypeColor('csm');
            const textColor = getTextColor(csmColor);
            const quarterKey = `q${quarter.quarter}` as keyof typeof data.successPathLabels;
            const label = data.successPathLabels?.[quarterKey] || (i === 0 ? 'Success Path' : 'Success Path Review');

            return (
              <div key={i} className={`p-2 flex justify-center items-center border-r ${i === 3 ? 'border-r-0' : ''}`} style={{ borderColor: 'var(--border)' }}>
                <div
                  className="text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap print-show-pill"
                  style={{ background: csmColor, color: textColor }}
                >
                  {label}
                </div>
              </div>
            );
          })}
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
          <div key={goal.id} className={`${goalIdx < data.goals.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
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
                    <div className="grid grid-cols-[200px_1fr] border-t print-avoid-break" style={{ borderColor: 'var(--border)' }}>
                      <div className="p-4 border-r flex flex-col justify-center relative" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                            <div className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
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
                      <div className="p-2 grid gap-1" style={{ background: 'var(--surface2)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                              className="group flex items-center justify-center px-4 py-2 rounded-full font-bold text-xs relative transition-all hover:opacity-85"
                              style={{
                                background: bgColor,
                                color: textColor,
                                gridColumnStart: minIdx + 1,
                                gridColumnEnd: maxIdx + 2
                              }}
                            >
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
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', gridColumn: '1 / -1' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
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

                  <div className="grid grid-cols-[200px_repeat(4,1fr)] print-avoid-break">
                    <div className="p-4 border-r flex flex-col justify-center relative" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                          <div className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
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

                    {qkeys.map((qk, qIdx) => {
                      const quarterInfo = quarters[qIdx];
                      const months = quarterInfo.months.map(m => m.abbrev);

                      return (
                        <div
                          key={qIdx}
                          className={`border-r ${qIdx === 3 ? 'border-r-0' : ''} relative`}
                          style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                        >
                          <div className="grid grid-cols-3 h-full min-h-[100px]" style={{ position: 'relative' }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: `repeat(${rows.length || 1}, minmax(32px, auto))`,
                                gap: '4px',
                                padding: '8px',
                                pointerEvents: 'none',
                                zIndex: 10
                              }}
                            >
                              {flatActivitiesWithRows
                                .filter(item => {
                                  const itemStartQuarter = Math.floor((item.startCol - 1) / 3);
                                  const itemEndQuarter = Math.floor((item.endCol - 2) / 3);
                                  return itemStartQuarter <= qIdx && itemEndQuarter >= qIdx;
                                })
                                .map((item) => {
                                  const currentQuarterStart = qIdx * 3 + 1;
                                  const currentQuarterEnd = qIdx * 3 + 4;

                                  const displayStartCol = Math.max(item.startCol, currentQuarterStart);
                                  const displayEndCol = Math.min(item.endCol, currentQuarterEnd);

                                  const localStartCol = displayStartCol - currentQuarterStart + 1;
                                  const localEndCol = displayEndCol - currentQuarterStart + 1;

                                  const isStart = item.startCol >= currentQuarterStart;
                                  const isEnd = item.endCol <= currentQuarterEnd;

                                  const bgColor = getTypeColor(item.activity.type);
                                  const textColor = getTextColor(bgColor);
                                  const dropdownId = `${goal.id}-${initiative.id}-${item.quarter}-${item.activity.id}`;

                                  return (
                                    <div
                                      key={item.activity.id}
                                      style={{
                                        gridColumnStart: localStartCol,
                                        gridColumnEnd: localEndCol,
                                        gridRowStart: item.row + 1,
                                        gridRowEnd: item.row + 2,
                                        pointerEvents: 'auto',
                                        position: 'relative'
                                      }}
                                    >
                                      <div
                                        className="group flex items-center gap-1 px-3 py-1 text-xs font-semibold transition-all hover:opacity-85 h-full"
                                        style={{
                                          background: bgColor,
                                          color: textColor,
                                          borderTopLeftRadius: isStart ? '9999px' : '0',
                                          borderBottomLeftRadius: isStart ? '9999px' : '0',
                                          borderTopRightRadius: isEnd ? '9999px' : '0',
                                          borderBottomRightRadius: isEnd ? '9999px' : '0',
                                          justifyContent: 'center',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {isStart && item.activity.name}
                                        <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                                          {isEnd && (
                                            <>
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
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {copyDropdown === dropdownId && isEnd && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-[140px]" style={{ borderColor: 'var(--border)' }}>
                                          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Copy to:</div>
                                          {qkeys.map((targetQ) => (
                                            <button
                                              key={targetQ}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyActivity(goal.id, initiative.id, item.quarter, item.activity.id, [targetQ]);
                                              }}
                                              disabled={targetQ === item.quarter}
                                              className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                              style={{ color: 'var(--text)' }}
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

                            {months.map((month, monthIdx) => (
                              <div
                                key={monthIdx}
                                className={`p-2 flex flex-col ${monthIdx < 2 ? 'border-r border-dashed' : ''}`}
                                style={{ borderColor: 'var(--border-light, rgba(0,0,0,0.06))' }}
                              >
                                <div className="text-[9px] font-medium text-center mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                                  {month}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-2 pb-2">
                            <button
                              onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id, quarter: qk })}
                              className="w-full border border-dashed rounded-md px-2 py-1 text-[10px] font-medium transition-all"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.background = 'var(--primary)';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-muted)';
                              }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}
