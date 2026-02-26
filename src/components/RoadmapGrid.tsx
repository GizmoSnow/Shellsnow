import { X, Plus, Pencil, Copy } from 'lucide-react';
import { RoadmapData, Goal, Initiative, Activity } from '../lib/supabase';
import { useState } from 'react';

interface RoadmapGridProps {
  data: RoadmapData;
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

function parseMonthsFromQuarterTitle(title: string): string[] {
  const defaultMonths: Record<string, string[]> = {
    q1: ['Jan', 'Feb', 'Mar'],
    q2: ['Apr', 'May', 'Jun'],
    q3: ['Jul', 'Aug', 'Sep'],
    q4: ['Oct', 'Nov', 'Dec']
  };

  const qkey = title.toLowerCase().match(/q[1-4]/)?.[0] as keyof typeof defaultMonths;

  const monthPattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/gi;
  const matches = title.match(monthPattern);

  if (matches && matches.length >= 2) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = matches[0].substring(0, 3);
    const endMonth = matches[matches.length - 1].substring(0, 3);
    const startIdx = months.findIndex(m => m.toLowerCase() === startMonth.toLowerCase());
    const endIdx = months.findIndex(m => m.toLowerCase() === endMonth.toLowerCase());

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      return months.slice(startIdx, endIdx + 1);
    }
  }

  return qkey ? defaultMonths[qkey] : defaultMonths.q1;
}

export default function RoadmapGrid({ data, onDataChange, onOpenAddModal, onOpenEditModal, getTypeColor }: RoadmapGridProps) {
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

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] rounded-2xl overflow-hidden border print-grid" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>
          <div className="p-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.2)' }}></div>
          {qkeys.map((qk, i) => (
            <div
              key={i}
              className={`p-4 text-center font-extrabold text-base tracking-wider border-r ${i === 3 ? 'border-r-0' : ''} cursor-pointer hover:opacity-90 transition-opacity print-show-text`}
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
              onClick={() => setEditingQuarter(qk)}
              title="Click to edit quarter title"
            >
              {editingQuarter === qk ? (
                <input
                  type="text"
                  value={getQuarterTitle(qk)}
                  onChange={(e) => updateQuarterTitle(qk, e.target.value)}
                  onBlur={() => setEditingQuarter(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingQuarter(null);
                    if (e.key === 'Escape') {
                      const newData = { ...data };
                      if (newData.quarterTitles) {
                        delete newData.quarterTitles[qk as keyof typeof newData.quarterTitles];
                      }
                      onDataChange(newData);
                      setEditingQuarter(null);
                    }
                  }}
                  autoFocus
                  className="w-full bg-white/20 border border-white/40 rounded px-2 py-1 outline-none text-center font-extrabold text-base"
                  style={{ color: '#ffffff' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                getQuarterTitle(qk)
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b print-avoid-break" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="p-3 border-r text-xs font-semibold uppercase tracking-wide flex items-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Success Path
          </div>
          {qkeys.map((q, i) => {
            const csmColor = getTypeColor('csm');
            const textColor = getTextColor(csmColor);
            return (
              <div key={i} className={`p-2 flex justify-center items-center border-r ${i === 3 ? 'border-r-0' : ''}`} style={{ borderColor: 'var(--border)' }}>
                {editingSuccessPath === q ? (
                  <input
                    type="text"
                    defaultValue={getSuccessPathLabel(q)}
                    autoFocus
                    onBlur={(e) => {
                      const newValue = e.target.value.trim();
                      if (newValue) {
                        updateSuccessPathLabel(q, newValue);
                      }
                      setEditingSuccessPath(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newValue = e.currentTarget.value.trim();
                        if (newValue) {
                          updateSuccessPathLabel(q, newValue);
                        }
                        setEditingSuccessPath(null);
                      } else if (e.key === 'Escape') {
                        setEditingSuccessPath(null);
                      }
                    }}
                    className="text-xs font-semibold px-4 py-1 rounded-full text-center outline-none focus:ring-2 focus:ring-white/50"
                    style={{ minWidth: '140px', background: csmColor, color: textColor }}
                  />
                ) : (
                  <div
                    onClick={() => setEditingSuccessPath(q)}
                    className="text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity print-show-pill"
                    style={{ background: csmColor, color: textColor }}
                  >
                    {getSuccessPathLabel(q)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data.goals.map((goal, goalIdx) => (
          <div key={goal.id} className={`${goalIdx < data.goals.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
            {goal.initiatives.map((initiative, iniIdx) => {
              const spanningActivities = initiative.spanning || [];

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
                    const activities = initiative.activities[qk] || [];
                    const quarterTitle = getQuarterTitle(qk);
                    const months = parseMonthsFromQuarterTitle(quarterTitle);

                    const fullQuarterActivities = activities.filter(a => !a.position || a.position === 'full');
                    const earlyActivities = activities.filter(a => a.position === 'early');
                    const midActivities = activities.filter(a => a.position === 'mid');
                    const lateActivities = activities.filter(a => a.position === 'late');

                    return (
                      <div
                        key={qIdx}
                        className={`border-r ${qIdx === 3 ? 'border-r-0' : ''} relative`}
                        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                      >
                        {fullQuarterActivities.length > 0 && (
                          <div className="p-2 flex flex-col gap-1">
                            {fullQuarterActivities.map((act) => {
                              const bgColor = getTypeColor(act.type);
                              const textColor = getTextColor(bgColor);
                              const dropdownId = `${goal.id}-${initiative.id}-${qk}-${act.id}`;
                              return (
                                <div key={act.id} className="relative">
                                  <div
                                    className="group inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-85 relative w-full"
                                    style={{ background: bgColor, color: textColor }}
                                  >
                                    {act.name}
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
                                          onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter: qk }, act);
                                        }}
                                        className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                      >
                                        <Pencil size={9} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteActivity(goal.id, initiative.id, qk, act.id);
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
                                      {qkeys.map((targetQ, idx) => (
                                        <button
                                          key={targetQ}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyActivity(goal.id, initiative.id, qk, act.id, [targetQ]);
                                          }}
                                          disabled={targetQ === qk}
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
                        )}
                        <div className="grid grid-cols-3 h-full min-h-[60px]">
                          {[earlyActivities, midActivities, lateActivities].map((positionActivities, monthIdx) => (
                            <div
                              key={monthIdx}
                              className={`p-2 flex flex-col gap-1 ${monthIdx < 2 ? 'border-r border-dashed' : ''}`}
                              style={{ borderColor: 'var(--border-light, rgba(0,0,0,0.06))' }}
                            >
                              <div className="text-[9px] font-medium text-center mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                                {months[monthIdx] || ''}
                              </div>
                              {positionActivities.map((act) => {
                          const bgColor = getTypeColor(act.type);
                          const textColor = getTextColor(bgColor);
                          const dropdownId = `${goal.id}-${initiative.id}-${qk}-${act.id}`;
                          return (
                            <div key={act.id} className="relative">
                              <div
                                className="group inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-85 relative"
                                style={{ background: bgColor, color: textColor }}
                              >
                                {act.name}
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
                                      onOpenEditModal({ goalId: goal.id, initiativeId: initiative.id, quarter: qk }, act);
                                    }}
                                    className="bg-black/40 hover:bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                                  >
                                    <Pencil size={9} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteActivity(goal.id, initiative.id, qk, act.id);
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
                                  {qkeys.map((targetQ, idx) => (
                                    <button
                                      key={targetQ}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyActivity(goal.id, initiative.id, qk, act.id, [targetQ]);
                                      }}
                                      disabled={targetQ === qk}
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
        ))}
      </div>
    </div>
  );
}
