import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Activity, SpanningActivity, RoadmapData } from '../lib/supabase';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getAllRoadmapMonths, getRoadmapQuarters } from '../lib/fiscal-year';
import { getTypeMetadata } from '../lib/activity-types';
import type { ActivityOwner } from '../lib/activity-types';

interface AddActivityModalProps {
  isOpen: boolean;
  context: any;
  editingActivity?: Activity | SpanningActivity | null;
  data: RoadmapData;
  fiscalConfig: FiscalYearConfig;
  getTypeColor: (typeKey: string) => string;
  getTypeLabel: (typeKey: string) => string;
  getAllTypeKeys: () => string[];
  onClose: () => void;
  onAdd: (activity: Activity | SpanningActivity) => void;
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.7 ? '#000000' : '#ffffff';
}

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

export default function AddActivityModal({ isOpen, context, editingActivity, data, fiscalConfig, getTypeColor, getTypeLabel, getAllTypeKeys, onClose, onAdd }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('csm');
  const [selectedOwner, setSelectedOwner] = useState<ActivityOwner>('salesforce');
  const [isSpanning, setIsSpanning] = useState(false);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [status, setStatus] = useState<'on_track' | 'at_risk' | 'blocked'>('on_track');
  const [description, setDescription] = useState('');
  const [isCriticalPath, setIsCriticalPath] = useState(false);

  const roadmapMonths = getAllRoadmapMonths(fiscalConfig);
  const defaultMonth = roadmapMonths.length > 0 ? String(roadmapMonths[0].calendarMonth) : '0';

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setName(editingActivity.name);
        setSelectedType(editingActivity.type);
        setSelectedOwner(editingActivity.owner || 'salesforce');
        setStatus(editingActivity.status || 'on_track');
        setDescription(editingActivity.description || '');
        setIsCriticalPath(editingActivity.isCriticalPath || false);

        if ('quarters' in editingActivity) {
          setIsSpanning(true);
          setSelectedQuarters(editingActivity.quarters || []);
        } else {
          setIsSpanning(false);
          setSelectedQuarters([]);
          const start = ('start_month' in editingActivity && editingActivity.start_month) ? String(editingActivity.start_month) : defaultMonth;
          const end = ('end_month' in editingActivity && editingActivity.end_month) ? String(editingActivity.end_month) : defaultMonth;
          setStartMonth(start);
          setEndMonth(end);
        }
      } else {
        setName('');
        setSelectedType('csm');
        setSelectedOwner('salesforce');
        setIsSpanning(context?.quarter === 'spanning');
        setSelectedQuarters(context?.quarter === 'spanning' ? ['q1', 'q2', 'q3', 'q4'] : []);
        setStartMonth(defaultMonth);
        setEndMonth(defaultMonth);
        setStatus('on_track');
        setDescription('');
        setIsCriticalPath(false);
      }
    }
  }, [isOpen, editingActivity, context, defaultMonth]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const typeMetadata = getTypeMetadata(selectedType, data.typeLabels, data.typeColors, data.typeOwners);
    if (typeMetadata && !editingActivity) {
      setSelectedOwner(typeMetadata.owner);
    }
  }, [selectedType, data, editingActivity]);

  if (!isOpen) return null;

  const allTypeKeys = getAllTypeKeys();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isSpanning && selectedQuarters.length === 0) {
      alert('Please select at least one quarter for spanning activity');
      return;
    }

    if (!isSpanning) {
      const startMonthIndex = roadmapMonths.findIndex(m => String(m.calendarMonth) === startMonth);
      const endMonthIndex = roadmapMonths.findIndex(m => String(m.calendarMonth) === endMonth);

      if (startMonthIndex > endMonthIndex) {
        alert('End Month must be the same as or after Start Month');
        return;
      }
    }

    if (isSpanning) {
      onAdd({
        id: editingActivity ? editingActivity.id : uid(),
        name: name.trim(),
        type: selectedType,
        owner: selectedOwner,
        quarters: selectedQuarters,
        status,
        description: description.trim() || undefined,
        isCriticalPath: isCriticalPath || undefined
      });
    } else {
      onAdd({
        id: editingActivity ? editingActivity.id : uid(),
        name: name.trim(),
        type: selectedType,
        owner: selectedOwner,
        start_month: startMonth,
        end_month: endMonth,
        status,
        description: description.trim() || undefined,
        isCriticalPath: isCriticalPath || undefined
      });
    }

    setName('');
    setSelectedType('csm');
    setSelectedOwner('salesforce');
    setIsSpanning(false);
    setSelectedQuarters([]);
    setStartMonth(defaultMonth);
    setEndMonth(defaultMonth);
    setStatus('on_track');
    setDescription('');
    setIsCriticalPath(false);
  };

  const toggleQuarter = (qk: string) => {
    if (selectedQuarters.includes(qk)) {
      setSelectedQuarters(selectedQuarters.filter(q => q !== qk));
    } else {
      setSelectedQuarters([...selectedQuarters, qk].sort());
    }
  };

  const selectQuarterRange = (quarterIndex: number) => {
    const startMonthIdx = quarterIndex * 3;
    const endMonthIdx = startMonthIdx + 2;
    if (startMonthIdx < roadmapMonths.length && endMonthIdx < roadmapMonths.length) {
      setStartMonth(String(roadmapMonths[startMonthIdx].calendarMonth));
      setEndMonth(String(roadmapMonths[endMonthIdx].calendarMonth));
      setIsSpanning(false);
    }
  };

  const getQuarterMonthRange = (quarterIndex: number) => {
    const startMonthIdx = quarterIndex * 3;
    const endMonthIdx = startMonthIdx + 2;
    if (startMonthIdx < roadmapMonths.length && endMonthIdx < roadmapMonths.length) {
      return `${roadmapMonths[startMonthIdx].abbrev}–${roadmapMonths[endMonthIdx].abbrev}`;
    }
    return '';
  };

  const isQuarterSelected = (quarterIndex: number) => {
    const startMonthIdx = quarterIndex * 3;
    const endMonthIdx = startMonthIdx + 2;
    if (startMonthIdx < roadmapMonths.length && endMonthIdx < roadmapMonths.length) {
      return startMonth === String(roadmapMonths[startMonthIdx].calendarMonth) &&
             endMonth === String(roadmapMonths[endMonthIdx].calendarMonth);
    }
    return false;
  };


  const quarters = getRoadmapQuarters(fiscalConfig);

  const allMonthOptions = roadmapMonths.map(month => ({
    value: String(month.calendarMonth),
    label: month.abbrev,
    quarterIndex: Math.floor(roadmapMonths.indexOf(month) / 3)
  }));

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="rounded-2xl p-6 md:p-8 w-full max-w-[440px] my-auto animate-modalIn" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{editingActivity ? 'Edit Activity' : 'Add Activity'}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'var(--button-neutral-bg)', color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--button-neutral-bg)'}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 max-h-[70vh] overflow-y-auto pr-2">
            {/* Section 1 - Activity Definition */}
            <div className="space-y-4">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-secondary)' }}>
                Activity Definition
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTypeKeys.map((typeKey) => {
                    const bgColor = getTypeColor(typeKey);
                    const textColor = getTextColor(bgColor);
                    const label = getTypeLabel(typeKey);
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setSelectedType(typeKey)}
                        className="cursor-pointer px-3 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                        style={{
                          background: bgColor,
                          color: textColor,
                          border: selectedType === typeKey ? '2px solid white' : '2px solid transparent',
                          boxShadow: selectedType === typeKey ? '0 0 0 3px rgba(255, 255, 255, 0.2)' : 'none'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Owner
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOwner('salesforce')}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedOwner === 'salesforce' ? '#0176D3' : 'var(--button-neutral-bg)',
                      color: selectedOwner === 'salesforce' ? '#ffffff' : 'var(--text-primary)',
                      border: selectedOwner === 'salesforce' ? '2px solid #0176D3' : '2px solid var(--border-subtle)'
                    }}
                  >
                    Salesforce
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOwner('partner')}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedOwner === 'partner' ? '#0176D3' : 'var(--button-neutral-bg)',
                      color: selectedOwner === 'partner' ? '#ffffff' : 'var(--text-primary)',
                      border: selectedOwner === 'partner' ? '2px solid #0176D3' : '2px solid var(--border-subtle)'
                    }}
                  >
                    Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOwner('customer')}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedOwner === 'customer' ? '#0176D3' : 'var(--button-neutral-bg)',
                      color: selectedOwner === 'customer' ? '#ffffff' : 'var(--text-primary)',
                      border: selectedOwner === 'customer' ? '2px solid #0176D3' : '2px solid var(--border-subtle)'
                    }}
                  >
                    Customer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Activity Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CSM Health Check"
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                  style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Description <span className="opacity-60">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors resize-none"
                  style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Section 2 - Timeline Placement */}
            <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-secondary)' }}>
                Timeline Placement
              </div>

              {!isSpanning && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Quick Select Quarter
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {quarters.map((quarter, idx) => {
                        const quarterIndex = idx;
                        const isSelected = isQuarterSelected(quarterIndex);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectQuarterRange(quarterIndex)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: isSelected ? '#066afe' : 'var(--button-neutral-bg)',
                              color: isSelected ? '#ffffff' : 'var(--text-primary)',
                              border: isSelected ? '2px solid #066afe' : '2px solid var(--border-subtle)'
                            }}
                          >
                            {quarter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Start Month
                      </label>
                      <select
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        {allMonthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                        End Month
                      </label>
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        {allMonthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSpanning}
                    onChange={(e) => {
                      setIsSpanning(e.target.checked);
                      if (e.target.checked && selectedQuarters.length === 0) {
                        setSelectedQuarters(['q1', 'q2', 'q3', 'q4']);
                      }
                    }}
                    className="w-4 h-4 rounded text-[#6c63ff] focus:ring-[#6c63ff] focus:ring-offset-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Spanning Activity
                  </span>
                </label>
                <p className="text-xs mt-1 ml-6" style={{ color: 'var(--text-secondary)' }}>
                  Creates a wide pill that stretches across multiple quarters
                </p>
              </div>

              {isSpanning && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Select Quarters
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {quarters.map((quarter, idx) => {
                      const qk = `q${quarter.quarter}`;
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleQuarter(qk)}
                          className="cursor-pointer px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all"
                          style={{
                            background: selectedQuarters.includes(qk) ? '#6c63ff' : 'var(--button-neutral-bg)',
                            color: selectedQuarters.includes(qk) ? '#ffffff' : 'var(--text-secondary)',
                            border: selectedQuarters.includes(qk) ? '2px solid #6c63ff' : '2px solid var(--border-subtle)'
                          }}
                        >
                          {quarter.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3 - Status and Metadata */}
            <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-secondary)' }}>
                Status &amp; Metadata
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('on_track')}
                    className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: status === 'on_track' ? '#22c55e' : 'var(--button-neutral-bg)',
                      color: status === 'on_track' ? '#ffffff' : 'var(--text-primary)',
                      border: status === 'on_track' ? '2px solid #22c55e' : '2px solid var(--border-subtle)'
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    On Track
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('at_risk')}
                    className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: status === 'at_risk' ? '#eab308' : 'var(--button-neutral-bg)',
                      color: status === 'at_risk' ? '#ffffff' : 'var(--text-primary)',
                      border: status === 'at_risk' ? '2px solid #eab308' : '2px solid var(--border-subtle)'
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    At Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('blocked')}
                    className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: status === 'blocked' ? '#ef4444' : 'var(--button-neutral-bg)',
                      color: status === 'blocked' ? '#ffffff' : 'var(--text-primary)',
                      border: status === 'blocked' ? '2px solid #ef4444' : '2px solid var(--border-subtle)'
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCriticalPath}
                    onChange={(e) => setIsCriticalPath(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6c63ff] focus:ring-[#6c63ff] focus:ring-offset-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Critical Path
                  </span>
                </label>
                <p className="text-xs mt-1 ml-6" style={{ color: 'var(--text-secondary)' }}>
                  Mark as critical path to highlight in executive and print views
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-transparent rounded-lg font-semibold transition-colors"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#066afe] hover:bg-[#0554d1] text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5"
              >
                {editingActivity ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
