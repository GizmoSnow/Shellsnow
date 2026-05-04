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
  return '#ffffff';
}

function ActivityTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative w-full"
      style={{ display: 'contents' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div
          className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-normal max-w-xs print-hide"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
            pointerEvents: 'none'
          }}
        >
          {text}
          <div
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
            style={{
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%) translateY(-50%) rotate(45deg)'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function RoadmapGrid({ data, fiscalConfig, onDataChange, onOpenAddModal, onOpenEditModal, getTypeColor }: RoadmapGridProps) {
  const quarters = getRoadmapQuarters(fiscalConfig);
  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const [copyDropdown, setCopyDropdown] = useState<string | null>(null);
  const [editingQuarter, setEditingQuarter] = useState<string | null>(null);
  const [editingSuccessPath, setEditingSuccessPath] = useState<string | null>(null);
  const [detailCardActivity, setDetailCardActivity] = useState<{ activity: Activity; goal: Goal; initiative: Initiative; quarter: string } | null>(null);
  const isDarkCanvas = document.documentElement.getAttribute('data-canvas') === 'dark';

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

  const copyQuarterActivity = (goalId: string, initiativeId: string, sourceQuarter: string, activityId: string, targetQuarter: string) => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) {
      console.error('Goal not found:', goalId);
      return;
    }

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative) {
      console.error('Initiative not found:', initiativeId);
      return;
    }

    const sourceAct = initiative.activities[sourceQuarter as keyof typeof initiative.activities]?.find(a => a.id === activityId);
    if (!sourceAct) {
      console.error('Source activity not found:', { sourceQuarter, activityId, available: initiative.activities });
      return;
    }

    const targetQuarterIndex = ['q1', 'q2', 'q3', 'q4'].indexOf(targetQuarter);
    const targetQuarterStartMonthIdx = targetQuarterIndex * 3;
    const allMonths = getAllRoadmapMonths(fiscalConfig);

    if (targetQuarterStartMonthIdx >= allMonths.length) {
      console.error('Invalid quarter mapping');
      return;
    }

    const targetStartMonth = String(allMonths[targetQuarterStartMonthIdx].calendarMonth);
    const targetEndMonth = targetQuarterStartMonthIdx + 2 < allMonths.length
      ? String(allMonths[targetQuarterStartMonthIdx + 2].calendarMonth)
      : targetStartMonth;

    const newActivity: Activity = {
      ...sourceAct,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      start_month: targetStartMonth,
      end_month: targetEndMonth
    };

    const newData = {
      ...data,
      goals: data.goals.map(g => {
        if (g.id !== goalId) return g;

        return {
          ...g,
          initiatives: g.initiatives.map(i => {
            if (i.id !== initiativeId) return i;

            const updatedActivities = {
              q1: i.id === initiativeId && targetQuarter === 'q1' ? [...i.activities.q1, newActivity] : [...i.activities.q1],
              q2: i.id === initiativeId && targetQuarter === 'q2' ? [...i.activities.q2, newActivity] : [...i.activities.q2],
              q3: i.id === initiativeId && targetQuarter === 'q3' ? [...i.activities.q3, newActivity] : [...i.activities.q3],
              q4: i.id === initiativeId && targetQuarter === 'q4' ? [...i.activities.q4, newActivity] : [...i.activities.q4]
            };

            return {
              ...i,
              activities: updatedActivities
            };
          })
        };
      })
    };

    onDataChange(newData);
    setCopyDropdown(null);
  };

  const copyInitiativeSpanningActivity = (goalId: string, initiativeId: string, spanningId: string, targetQuarter?: string) => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) {
      console.error('Goal not found:', goalId);
      return;
    }

    const initiative = goal.initiatives.find(i => i.id === initiativeId);
    if (!initiative || !initiative.spanning) {
      console.error('Initiative or spanning activities not found:', initiativeId);
      return;
    }

    const sourceSpanning = initiative.spanning.find(s => s.id === spanningId);
    if (!sourceSpanning) {
      console.error('Source spanning activity not found:', spanningId);
      return;
    }

    if (targetQuarter) {
      const targetQuarterIndex = ['q1', 'q2', 'q3', 'q4'].indexOf(targetQuarter);
      const targetQuarterStartMonthIdx = targetQuarterIndex * 3;
      const allMonths = getAllRoadmapMonths(fiscalConfig);

      if (targetQuarterStartMonthIdx >= allMonths.length) {
        console.error('Invalid quarter mapping');
        return;
      }

      const targetStartMonth = String(allMonths[targetQuarterStartMonthIdx].calendarMonth);
      const targetEndMonth = targetQuarterStartMonthIdx + 2 < allMonths.length
        ? String(allMonths[targetQuarterStartMonthIdx + 2].calendarMonth)
        : targetStartMonth;

      const newActivity: Activity = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: sourceSpanning.name,
        type: sourceSpanning.type,
        owner: sourceSpanning.owner,
        status: sourceSpanning.status,
        description: sourceSpanning.description,
        isCriticalPath: sourceSpanning.isCriticalPath,
        start_month: targetStartMonth,
        end_month: targetEndMonth
      };

      const newData = {
        ...data,
        goals: data.goals.map(g => {
          if (g.id !== goalId) return g;

          return {
            ...g,
            initiatives: g.initiatives.map(i => {
              if (i.id !== initiativeId) return i;

              const updatedActivities = {
                q1: targetQuarter === 'q1' ? [...i.activities.q1, newActivity] : [...i.activities.q1],
                q2: targetQuarter === 'q2' ? [...i.activities.q2, newActivity] : [...i.activities.q2],
                q3: targetQuarter === 'q3' ? [...i.activities.q3, newActivity] : [...i.activities.q3],
                q4: targetQuarter === 'q4' ? [...i.activities.q4, newActivity] : [...i.activities.q4]
              };

              return {
                ...i,
                activities: updatedActivities
              };
            })
          };
        })
      };

      onDataChange(newData);
    } else {
      const newSpanning = {
        ...sourceSpanning,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const newData = {
        ...data,
        goals: data.goals.map(g => {
          if (g.id !== goalId) return g;

          return {
            ...g,
            initiatives: g.initiatives.map(i => {
              if (i.id !== initiativeId) return i;

              return {
                ...i,
                spanning: [...(i.spanning || []), newSpanning]
              };
            })
          };
        })
      };

      onDataChange(newData);
    }

    setCopyDropdown(null);
  };

  const copyAccountSpanningActivity = (spanningId: string, targetQuarter?: string) => {
    const sourceSpanning = data.accountSpanning?.find(s => s.id === spanningId);
    if (!sourceSpanning) {
      console.error('Source account spanning activity not found:', spanningId);
      return;
    }

    if (targetQuarter) {
      console.error('Cannot copy account-level spanning activity to a single quarter without goal/initiative context');
      return;
    }

    const newSpanning = {
      ...sourceSpanning,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const newData = {
      ...data,
      accountSpanning: [...(data.accountSpanning || []), newSpanning]
    };

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

  const getHealthColor = (health?: string) => {
    if (health === 'blocked') return '#ef4444';
    if (health === 'at_risk') return '#eab308';
    return '#22c55e';
  };

  const getHealthLabel = (health?: string) => {
    if (health === 'blocked') return 'Blocked';
    if (health === 'at_risk') return 'At Risk';
    return 'On Track';
  };

  const getLifecycleStatusColor = (status?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'in_progress') return '#3b82f6';
    if (status === 'cancelled') return '#64748b';
    return '#94a3b8';
  };

  const getLifecycleStatusLabel = (status?: string) => {
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'cancelled') return 'Cancelled';
    return 'Not Started';
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
    const healthColor = getHealthColor(activity.health);

    return (
      <div key={activity.id} className="relative">
        <ActivityTooltip text={activity.name}>
          <div
            onClick={() => setDetailCardActivity({ activity, goal, initiative, quarter })}
            className={`activity-pill group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-85 relative cursor-pointer ${context === 'full' ? 'w-full justify-center' : ''} ${activity.isCriticalPath ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
            style={{ background: bgColor, color: textColor }}
            title={activity.name}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: healthColor }}
              title={getHealthLabel(activity.health)}
            />
            {activity.isCriticalPath && (
              <Star size={11} className="fill-current flex-shrink-0" />
            )}
            <span className="activity-pill-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {activity.name}
            </span>
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
        </ActivityTooltip>
        {copyDropdown === dropdownId && (
          <div
            className="fixed border rounded-lg shadow-lg p-2 z-[100] min-w-[140px]"
            style={{
              borderColor: 'var(--roadmap-border)',
              background: 'var(--surface)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--roadmap-text-primary)' }}>Copy to:</div>
            {qkeys.map((targetQ) => (
              <button
                key={targetQ}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Quarter button clicked (non-spanning):', targetQ);
                  copyQuarterActivity(goal.id, initiative.id, quarter, activity.id, targetQ);
                }}
                disabled={targetQ === quarter}
                className="w-full text-left px-2 py-1 text-xs rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ color: 'var(--roadmap-text-primary)' }}
                onMouseEnter={(e) => {
                  if (targetQ !== quarter) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
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
    <div className="overflow-x-auto p-8" style={{ background: 'var(--roadmap-surface)' }}>
      <div className="min-w-[900px] rounded-xl overflow-hidden print-grid" style={{
        border: isDarkCanvas ? '1px solid var(--roadmap-border)' : '1px solid var(--roadmap-border)',
        backgroundColor: data.backgroundColor || 'var(--roadmap-cell-bg)',
        boxShadow: isDarkCanvas ? '0 4px 24px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div className="grid grid-cols-[200px_repeat(4,1fr)] print-avoid-break" style={{
          background: data.headerColor || 'var(--primary)',
          borderBottom: '2px solid rgba(0, 0, 0, 0.15)'
        }}>
          <div className="py-5 px-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.15)' }}></div>
          {quarters.map((quarter, i) => (
            <div
              key={i}
              className={`py-5 px-4 text-center font-bold text-base tracking-wide border-r ${i === 3 ? 'border-r-0' : ''} print-show-text`}
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff', letterSpacing: '0.03em' }}
            >
              {quarter.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{
          background: 'var(--roadmap-quarter-bg)',
          borderColor: 'var(--roadmap-border-subtle)'
        }}>
          <div className="py-4 px-4 border-r text-xs font-bold uppercase tracking-wider flex items-center" style={{
            borderColor: 'var(--roadmap-border)',
            color: 'var(--roadmap-text-secondary)',
            letterSpacing: '0.05em'
          }}>
            Success Path
          </div>
          {quarters.map((quarter, i) => {
            const successPathColor = getTypeColor('csm');
            const textColor = '#ffffff';
            const quarterKey = `q${quarter.quarter}` as keyof typeof data.successPathLabels;
            const label = data.successPathLabels?.[quarterKey] || (i === 0 ? 'Success Path' : 'Success Path Review');

            return (
              <div key={i} className={`p-3 flex justify-center items-center border-r ${i === 3 ? 'border-r-0' : ''}`} style={{ borderColor: 'var(--roadmap-border)' }}>
                <div
                  className="text-xs font-bold px-5 py-2 rounded-full whitespace-nowrap print-show-pill"
                  style={{ background: successPathColor, color: textColor }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Account-Level Activities */}
        <div className="grid grid-cols-[200px_1fr] border-b print-avoid-break" style={{ borderColor: 'var(--roadmap-border-subtle)' }}>
          <div className="py-4 px-4 border-r flex flex-col justify-center" style={{
            borderColor: 'var(--roadmap-border)',
            background: 'var(--roadmap-cell-bg)'
          }}>
            <div className="text-xs font-bold uppercase tracking-wider" style={{
              color: isDarkCanvas ? 'var(--roadmap-text-primary)' : 'var(--primary)',
              letterSpacing: '0.05em'
            }}>
              Ongoing Activities
            </div>
          </div>
          <div className="p-3 grid gap-2" style={{ background: 'var(--roadmap-quarter-bg)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {(data.accountSpanning || []).map((sp, index) => {
              const bgColor = getTypeColor(sp.type);
              const textColor = getTextColor(bgColor);
              
              // Calculate quarters spanned based on start_month and end_month
              let qIndexes: number[] = [];
              if (sp.start_month !== undefined && sp.end_month !== undefined) {
                const startPos = getMonthPosition(sp.start_month, fiscalConfig);
                const endPos = getMonthPosition(sp.end_month, fiscalConfig);
                if (startPos && endPos) {
                  const startQuarter = startPos.quarterIndex;
                  const endQuarter = endPos.quarterIndex;
                  for (let q = startQuarter; q <= endQuarter; q++) {
                    qIndexes.push(q);
                  }
                }
              } else {
                // Fallback to quarters array
                const sortedQuarters = [...(sp.quarters || [])].sort();
                qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
              }
              
              const minIdx = qIndexes.length > 0 ? Math.min(...qIndexes) : 0;
              const maxIdx = qIndexes.length > 0 ? Math.max(...qIndexes) : 0;
              const isFirst = index === 0;
              const isLast = index === (data.accountSpanning || []).length - 1;
              const healthColor = getHealthColor(sp.health);
              const dropdownId = `account-spanning-${sp.id}`;

              return (
                <ActivityTooltip key={sp.id} text={sp.name}>
                  <div
                    className={`activity-pill group flex items-center justify-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs relative transition-all hover:opacity-90 ${sp.isCriticalPath ? 'ring-2 ring-yellow-400' : ''}`}
                    style={{
                      background: bgColor,
                      color: textColor,
                      gridColumnStart: minIdx + 1,
                      gridColumnEnd: maxIdx + 2,
                      boxShadow: isDarkCanvas ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    title={sp.name}
                  >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: healthColor }}
                    title={getHealthLabel(sp.health)}
                  />
                  {sp.isCriticalPath && (
                    <Star size={11} className="fill-current flex-shrink-0" />
                  )}
                  <span className="activity-pill-text text-center" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {sp.name}
                  </span>
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
                        setCopyDropdown(copyDropdown === dropdownId ? null : dropdownId);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <Copy size={9} />
                    </button>
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
                  {copyDropdown === dropdownId && (
                    <div
                      className="fixed border rounded-lg shadow-lg p-2 z-[100] min-w-[160px]"
                      style={{
                        borderColor: 'var(--roadmap-border)',
                        background: 'var(--surface)',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--roadmap-text-primary)' }}>Duplicate this activity?</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyAccountSpanningActivity(sp.id);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded transition-colors"
                        style={{ color: 'var(--roadmap-text-primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        Duplicate as Account Activity
                      </button>
                    </div>
                  )}
                </div>
                </ActivityTooltip>
              );
            })}
            <button
              onClick={() => onOpenAddModal({ isAccountLevel: true, quarter: 'spanning', openedAsSpanning: true })}
              className="border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
              style={{ borderColor: 'var(--roadmap-border)', color: 'var(--roadmap-text-secondary)', gridColumn: '1 / -1' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--roadmap-border)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Plus size={12} />
              Add Spanning
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
          <div key={goal.id} className={`${goalIdx < data.goals.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--roadmap-border)' }}>
            {deduplicatedInitiatives.map((initiative, iniIdx) => {
              const spanningActivities = initiative.spanning || [];
              const hasAnyActivity = spanningActivities.length > 0 ||
                qkeys.some(qk => (initiative.activities[qk] || []).length > 0);
              if (!hasAnyActivity) return null;

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

                  if (startMonth == null || endMonth == null) {
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

              const spanRows: Array<typeof activitiesWithSpan> = [];
              activitiesWithSpan.forEach(item => {
                let placed = false;
                for (let r = 0; r < spanRows.length; r++) {
                  const conflicts = spanRows[r].some(existing =>
                    !(item.endCol <= existing.startCol || item.startCol >= existing.endCol)
                  );
                  if (!conflicts) {
                    spanRows[r].push({ ...item, row: r });
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  spanRows.push([{ ...item, row: spanRows.length }]);
                }
              });

              const flatActivitiesWithRows = spanRows.flat();
              const verticalActivities = flatActivitiesWithRows.map((item, index) => ({ ...item, row: index }));

              return (
                <div key={initiative.id}>
                  {spanningActivities.length > 0 && (
                    <div className="grid grid-cols-[200px_1fr] border-t print-avoid-break" style={{ borderColor: 'var(--roadmap-border-subtle)' }}>
                      <div className="py-2 px-4 border-r flex flex-col justify-center relative" style={{
                        borderColor: 'var(--roadmap-border)',
                        background: 'var(--roadmap-cell-bg)'
                      }}>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ background: goal.color }}
                        ></div>
                        {iniIdx === 0 && (
                          <>
                            <div
                              className="text-xs font-bold uppercase tracking-wider mb-0.5"
                              style={{ color: goal.color, letterSpacing: '0.05em' }}
                            >
                              {goal.number}
                            </div>
                            <div className="text-sm font-bold mb-1" style={{ color: 'var(--roadmap-text-primary)' }}>
                              {goal.title}
                            </div>
                          </>
                        )}
                        <div className="text-xs leading-snug" style={{ color: 'var(--roadmap-text-secondary)' }}>
                          {initiative.label}
                        </div>
                      </div>
                      <div className="p-3" style={{ background: 'var(--roadmap-quarter-bg)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: '8px' }}>
                        {flatActivitiesWithRows.map((item) => {
                          const bgColor = getTypeColor(item.activity.type);
                          const textColor = getTextColor(bgColor);
                          const healthColor = getHealthColor(item.activity.health);
                          const dropdownId = `spanning-${goal.id}-${initiative.id}-${item.activity.id}`;

                          return (
                            <ActivityTooltip key={item.activity.id} text={item.activity.name}>
                              <div
                                className={`activity-pill group flex items-center justify-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs relative transition-all hover:opacity-90 ${item.activity.isCriticalPath ? 'ring-2 ring-yellow-400' : ''}`}
                                style={{
                                  background: bgColor,
                                  color: textColor,
                                  gridColumnStart: item.startCol,
                                  gridColumnEnd: item.endCol,
                                  gridRowStart: item.row + 1,
                                  boxShadow: isDarkCanvas ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                                title={item.activity.name}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: healthColor }}
                                  title={getHealthLabel(item.activity.health)}
                                />
                                {item.activity.isCriticalPath && (
                                  <Star size={11} className="fill-current flex-shrink-0" />
                                )}
                                <span className="activity-pill-text text-center" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                  {item.activity.name}
                                </span>
                                <div className="hidden group-hover:flex absolute right-2 items-center gap-1">
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
                                      onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter: 'spanning' }, item.activity);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                  >
                                    <Pencil size={9} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSpanning(goal.id, initiative.id, item.activity.id);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                {copyDropdown === dropdownId && (
                                  <div
                                    className="fixed border rounded-lg shadow-lg p-2 z-[100] min-w-[160px]"
                                    style={{
                                      borderColor: 'var(--roadmap-border)',
                                      background: 'var(--surface)',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--roadmap-text-primary)' }}>Copy as:</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyInitiativeSpanningActivity(goal.id, initiative.id, item.activity.id);
                                      }}
                                      className="w-full text-left px-2 py-1 text-xs rounded transition-colors mb-1"
                                      style={{ color: 'var(--roadmap-text-primary)' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      Spanning Activity
                                    </button>
                                    <div className="text-xs font-semibold mt-2 mb-1" style={{ color: 'var(--roadmap-text-primary)' }}>Copy to quarter:</div>
                                    {qkeys.map((targetQ) => (
                                      <button
                                        key={targetQ}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyInitiativeSpanningActivity(goal.id, initiative.id, item.activity.id, targetQ);
                                        }}
                                        className="w-full text-left px-2 py-1 text-xs rounded transition-colors"
                                        style={{ color: 'var(--roadmap-text-primary)' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        {getQuarterTitle(targetQ)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </ActivityTooltip>
                          );
                        })}
                        <button
                          onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id, openedAsSpanning: false })}
                          className="border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                          style={{ borderColor: 'var(--roadmap-border)', color: 'var(--roadmap-text-secondary)', gridColumn: '1 / -1' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--roadmap-border)';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-[200px_1fr] border-t print-avoid-break" style={{ borderColor: 'var(--roadmap-border-subtle)' }}>
                    <div className="py-2 px-4 border-r flex flex-col justify-center relative" style={{
                      borderColor: 'var(--roadmap-border)',
                      background: 'var(--roadmap-cell-bg)'
                    }}>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: goal.color }}
                      ></div>
                      {iniIdx === 0 && spanningActivities.length === 0 && (
                        <>
                          <div
                            className="text-xs font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: goal.color, letterSpacing: '0.05em' }}
                          >
                            {goal.number}
                          </div>
                          <div className="text-sm font-bold mb-1" style={{ color: 'var(--roadmap-text-primary)' }}>
                            {goal.title}
                          </div>
                        </>
                      )}
                      {spanningActivities.length === 0 && (
                        <div className="text-xs leading-snug" style={{ color: 'var(--roadmap-text-secondary)' }}>
                          {initiative.label}
                        </div>
                      )}
                    </div>

                    <div className="relative" style={{ background: 'var(--roadmap-quarter-bg)' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                          gridAutoRows: 'minmax(28px, auto)',
                          gap: '4px',
                          position: 'relative',
                          minHeight: `${(spanRows.length || 1) * 32 + 36}px`,
                          padding: '4px 4px 36px 4px'
                        }}
                      >
                        {verticalActivities.map((item) => {
                          const bgColor = getTypeColor(item.activity.type);
                          const textColor = getTextColor(bgColor);
                          const dropdownId = `${goal.id}-${initiative.id}-${item.activity.id}`;

                          const activities = initiative.activities[item.quarter as keyof typeof initiative.activities];
                          const activityIndex = activities.findIndex(a => a.id === item.activity.id);
                          const isFirst = activityIndex === 0;
                          const isLast = activityIndex === activities.length - 1;

                          const healthColor = getHealthColor(item.activity.health);

                          return (
                            <ActivityTooltip key={item.activity.id} text={item.activity.name}>
                              <div
                                style={{
                                  gridColumnStart: item.startCol,
                                  gridColumnEnd: item.endCol,
                                  gridRowStart: item.row + 1,
                                  padding: '0 2px',
                                  zIndex: 30
                                }}
                              >
                                <div
                                  onClick={() => setDetailCardActivity({ activity: item.activity, goal, initiative, quarter: item.quarter })}
                                  className={`activity-pill group flex items-center gap-1.5 px-4 text-xs font-bold transition-all hover:opacity-90 cursor-pointer ${item.activity.isCriticalPath ? 'ring-2 ring-yellow-400' : ''}`}
                                  style={{
                                    background: bgColor,
                                    color: textColor,
                                    borderRadius: '9999px',
                                    justifyContent: 'center',
                                    height: '100%',
                                    boxShadow: isDarkCanvas ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                  }}
                                  title={item.activity.name}
                                >
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: healthColor }}
                                  title={getHealthLabel(item.activity.health)}
                                />
                                {item.activity.isCriticalPath && (
                                  <Star size={11} className="fill-current flex-shrink-0" />
                                )}
                                <span
                                  className="activity-pill-text"
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
                                <div
                                  className="fixed border rounded-lg shadow-lg p-2 z-[100] min-w-[140px]"
                                  style={{
                                    borderColor: 'var(--roadmap-border)',
                                    background: 'var(--surface)',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--roadmap-text-primary)' }}>Copy to:</div>
                                  {qkeys.map((targetQ) => (
                                    <button
                                      key={targetQ}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Quarter button clicked:', targetQ);
                                        copyQuarterActivity(goal.id, initiative.id, item.quarter, item.activity.id, targetQ);
                                      }}
                                      disabled={targetQ === item.quarter}
                                      className="w-full text-left px-2 py-1 text-xs rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                      style={{ color: 'var(--roadmap-text-primary)' }}
                                      onMouseEnter={(e) => {
                                        if (targetQ !== item.quarter) {
                                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      {getQuarterTitle(targetQ)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            </ActivityTooltip>
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
                        <div className="absolute top-0 left-0 right-0 h-[18px] flex">
                          {quarters.flatMap((quarter) =>
                            quarter.months.map((month, mIdx) => (
                              <div
                                key={`${quarter.quarter}-${mIdx}`}
                                className="flex-1 flex items-center justify-center"
                              >
                                <div className="text-[9px] font-medium" style={{ color: 'var(--roadmap-text-secondary)', opacity: 0.5 }}>
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
                          onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id, openedAsSpanning: false })}
                          className="w-full border border-dashed rounded-md px-3 py-1 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                          style={{ borderColor: 'var(--roadmap-border)', color: 'var(--roadmap-text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--roadmap-border)';
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

            {/* Goal-Level Activities (for imports without specific initiative) */}
            {goal.activities && (qkeys.some(qk => (goal.activities?.[qk as keyof typeof goal.activities] || []).length > 0)) && (
              <div className="border-t" style={{ borderColor: 'var(--roadmap-border)' }}>
                <div className="grid grid-cols-[200px_1fr]" style={{ background: 'var(--roadmap-cell-bg)' }}>
                  <div className="py-4 px-4 border-r flex flex-col justify-center" style={{
                    borderColor: 'var(--roadmap-border)',
                    background: 'var(--roadmap-cell-bg)'
                  }}>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{
                      color: isDarkCanvas ? 'var(--roadmap-text-primary)' : 'var(--primary)',
                      letterSpacing: '0.05em'
                    }}>
                      Activities
                    </div>
                  </div>
                  <div className="p-3 grid gap-2" style={{ background: 'var(--roadmap-quarter-bg)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {qkeys.flatMap(qk => (goal.activities?.[qk as keyof typeof goal.activities] || []).map((activity) => {
                      const bgColor = getTypeColor(activity.type);
                      const textColor = getTextColor(bgColor);
                      const healthColor = getHealthColor(activity.health);
                      const qIdx = qkeys.indexOf(qk);

                      return (
                        <ActivityTooltip key={activity.id} text={activity.name}>
                          <div
                            onClick={() => setDetailCardActivity({ activity, goal, initiative: goal.initiatives[0], quarter: qk })}
                            className={`activity-pill group flex items-center justify-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs relative transition-all hover:opacity-90 cursor-pointer ${activity.isCriticalPath ? 'ring-2 ring-yellow-400' : ''}`}
                            style={{
                              background: bgColor,
                              color: textColor,
                              gridColumn: qIdx + 1,
                              boxShadow: isDarkCanvas ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                            title={activity.name}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: healthColor }}
                              title={getHealthLabel(activity.health)}
                            />
                            {activity.isCriticalPath && (
                              <Star size={11} className="fill-current flex-shrink-0" />
                            )}
                            <span className="activity-pill-text text-center" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {activity.name}
                            </span>
                          </div>
                        </ActivityTooltip>
                      );
                    }))}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Copy Dropdown Backdrop */}
      {copyDropdown && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setCopyDropdown(null)}
        />
      )}

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
              border: '1px solid var(--roadmap-border)',
              background: 'var(--surface)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div>
                <div className="font-bold text-base mb-2" style={{ color: 'var(--roadmap-text-primary)' }}>
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
                    style={{ background: getHealthColor(detailCardActivity.activity.health) }}
                  />
                  <span style={{ color: 'var(--roadmap-text-secondary)' }}>
                    {getHealthLabel(detailCardActivity.activity.health)}
                  </span>
                </div>
                {detailCardActivity.activity.status && (
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: getLifecycleStatusColor(detailCardActivity.activity.status),
                        color: '#ffffff'
                      }}
                    >
                      {getLifecycleStatusLabel(detailCardActivity.activity.status)}
                    </div>
                  </div>
                )}
              </div>

              {detailCardActivity.activity.start_month && detailCardActivity.activity.end_month && (
                <div className="text-xs" style={{ color: 'var(--roadmap-text-secondary)' }}>
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
                <div className="text-xs" style={{ color: 'var(--roadmap-text-secondary)' }}>
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
