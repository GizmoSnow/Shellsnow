import { X, Plus, Pencil, Copy } from 'lucide-react';
import { RoadmapData, Goal, Initiative, Activity } from '../lib/supabase';
import { useState } from 'react';

interface RoadmapGridProps {
  data: RoadmapData;
  onDataChange: (data: RoadmapData) => void;
  onOpenAddModal: (context: any) => void;
  onOpenEditModal: (context: any, activity: Activity) => void;
}

const DEFAULT_TYPE_COLORS: Record<string, string> = {
  csm: '#e8194b',
  architect: '#00b4d8',
  specialist: '#1a1d3e',
  review: '#7b82a8',
  event: '#f77f00',
  partner: '#f4a261',
  trailhead: '#9b5de5',
};

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#ffffff';
}

export default function RoadmapGrid({ data, onDataChange, onOpenAddModal, onOpenEditModal }: RoadmapGridProps) {
  const getTypeColor = (typeKey: string) => {
    return data.typeColors?.[typeKey] || DEFAULT_TYPE_COLORS[typeKey] || '#6c63ff';
  };
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const [copyDropdown, setCopyDropdown] = useState<string | null>(null);

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
      <div className="min-w-[900px] rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}>
          <div className="p-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.2)' }}></div>
          {quarters.map((q, i) => (
            <div
              key={i}
              className={`p-4 text-center font-extrabold text-base tracking-wider border-r ${i === 3 ? 'border-r-0' : ''}`}
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
            >
              {q}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[200px_repeat(4,1fr)] border-b" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="p-3 border-r text-xs font-semibold uppercase tracking-wide flex items-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Success Path
          </div>
          {qkeys.map((q, i) => (
            <div key={i} className={`p-2 flex justify-center items-center border-r ${i === 3 ? 'border-r-0' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <div className="bg-[#e8194b] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                {i === 0 ? 'Success Path' : 'Success Path Review'}
              </div>
            </div>
          ))}
        </div>

        {data.goals.map((goal, goalIdx) => (
          <div key={goal.id} className={`${goalIdx < data.goals.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
            {goal.initiatives.map((initiative, iniIdx) => {
              if (initiative.spanning) {
                return (
                  <div key={initiative.id} className="grid grid-cols-[200px_1fr] border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="p-2 border-r text-[10px] font-semibold uppercase tracking-wide flex items-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                      {initiative.label}
                    </div>
                    <div className="p-2 flex flex-col gap-1" style={{ background: 'var(--surface2)' }}>
                      {initiative.spanning.map((sp) => {
                        const bgColor = getTypeColor(sp.type);
                        const textColor = getTextColor(bgColor);
                        return (
                          <div
                            key={sp.id}
                            className="group flex items-center justify-center px-4 py-2 rounded-full font-bold text-xs relative transition-all hover:opacity-85"
                            style={{ background: bgColor, color: textColor }}
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
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={initiative.id} className="grid grid-cols-[200px_repeat(4,1fr)]">
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

                  {qkeys.map((qk, qIdx) => {
                    const activities = initiative.activities[qk] || [];
                    return (
                      <div
                        key={qIdx}
                        className={`p-2 border-r flex flex-col gap-1 min-h-[60px] ${qIdx === 3 ? 'border-r-0' : ''}`}
                        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                      >
                        {activities.map((act) => {
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
                                      {quarters[idx]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <button
                          onClick={() => onOpenAddModal({ goalId: goal.id, initiativeId: initiative.id, quarter: qk })}
                          className="border border-dashed rounded-md px-2 py-1 text-[10px] font-medium transition-all mt-0.5"
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
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
