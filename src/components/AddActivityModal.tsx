import { useState, useEffect } from 'react';
import { Activity, SpanningActivity } from '../lib/supabase';

interface AddActivityModalProps {
  isOpen: boolean;
  context: any;
  editingActivity?: Activity | SpanningActivity | null;
  typeLabels?: Record<string, string>;
  quarterTitles?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
  getTypeColor: (typeKey: string) => string;
  onClose: () => void;
  onAdd: (activity: Activity | SpanningActivity) => void;
}

const DEFAULT_TYPE_KEYS = [
  { key: 'csm', label: 'CSM-led' },
  { key: 'architect', label: 'Success Architect' },
  { key: 'specialist', label: 'Success Specialist' },
  { key: 'review', label: 'Success Review' },
  { key: 'event', label: 'Event' },
  { key: 'partner', label: 'Partner' },
  { key: 'trailhead', label: 'Trailhead' },
];

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#ffffff';
}

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

export default function AddActivityModal({ isOpen, context, editingActivity, typeLabels, quarterTitles, getTypeColor, onClose, onAdd }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('csm');
  const [isSpanning, setIsSpanning] = useState(false);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [position, setPosition] = useState<'early' | 'mid' | 'late'>('early');

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setName(editingActivity.name);
        setSelectedType(editingActivity.type);
        if ('quarters' in editingActivity) {
          setIsSpanning(true);
          setSelectedQuarters(editingActivity.quarters || []);
        } else {
          setIsSpanning(false);
          setSelectedQuarters([]);
          setPosition(('position' in editingActivity && editingActivity.position) ? editingActivity.position : 'early');
        }
      } else {
        setName('');
        setSelectedType('csm');
        setIsSpanning(context?.quarter === 'spanning');
        setSelectedQuarters(context?.quarter === 'spanning' ? ['q1', 'q2', 'q3', 'q4'] : []);
        setPosition('early');
      }
    }
  }, [isOpen, editingActivity, context]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isSpanning && selectedQuarters.length === 0) {
      alert('Please select at least one quarter for spanning activity');
      return;
    }

    if (isSpanning) {
      onAdd({
        id: editingActivity ? editingActivity.id : uid(),
        name: name.trim(),
        type: selectedType,
        quarters: selectedQuarters
      });
    } else {
      onAdd({
        id: editingActivity ? editingActivity.id : uid(),
        name: name.trim(),
        type: selectedType,
        position: position
      });
    }

    setName('');
    setSelectedType('csm');
    setIsSpanning(false);
    setSelectedQuarters([]);
    setPosition('early');
  };

  const toggleQuarter = (qk: string) => {
    if (selectedQuarters.includes(qk)) {
      setSelectedQuarters(selectedQuarters.filter(q => q !== qk));
    } else {
      setSelectedQuarters([...selectedQuarters, qk].sort());
    }
  };

  const getQuarterTitle = (qkey: string) => {
    return quarterTitles?.[qkey as keyof typeof quarterTitles] || qkey.toUpperCase();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-[#1a1d27] border border-[#2e3248] rounded-2xl p-8 w-[440px] max-w-[90vw] animate-modalIn" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-extrabold text-[#e8eaf6] mb-6">{editingActivity ? 'Edit Activity' : 'Add Activity'}</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                Activity Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. CSM Health Check"
                className="w-full bg-[#0f1117] border border-[#2e3248] rounded-lg px-4 py-3 text-[#e8eaf6] text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_TYPE_KEYS.map((type) => {
                  const bgColor = getTypeColor(type.key);
                  const textColor = getTextColor(bgColor);
                  return (
                    <div
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      className="cursor-pointer px-2 py-2 rounded-lg text-[10px] font-semibold text-center transition-all"
                      style={{
                        background: bgColor,
                        color: textColor,
                        border: selectedType === type.key ? '2px solid white' : '2px solid transparent'
                      }}
                    >
                      {typeLabels?.[type.key] || type.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {!isSpanning && (
              <div>
                <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                  Position in Quarter
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'early' as const, label: 'Early' },
                    { value: 'mid' as const, label: 'Mid' },
                    { value: 'late' as const, label: 'Late' }
                  ].map((pos) => (
                    <div
                      key={pos.value}
                      onClick={() => setPosition(pos.value)}
                      className="cursor-pointer px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all"
                      style={{
                        background: position === pos.value ? '#6c63ff' : '#22263a',
                        color: position === pos.value ? '#ffffff' : '#7b82a8',
                        border: position === pos.value ? '2px solid #6c63ff' : '2px solid #2e3248'
                      }}
                    >
                      {pos.label}
                    </div>
                  ))}
                </div>
              </div>
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
                  className="w-4 h-4 rounded border-[#2e3248] text-[#6c63ff] focus:ring-[#6c63ff] focus:ring-offset-0"
                />
                <span className="text-xs font-semibold text-[#7b82a8] uppercase tracking-wide">
                  Spanning Activity
                </span>
              </label>
              <p className="text-xs text-[#7b82a8] mt-1 ml-6">
                Creates a wide pill that stretches across multiple quarters
              </p>
            </div>

            {isSpanning && (
              <div>
                <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                  Select Quarters
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['q1', 'q2', 'q3', 'q4'].map((qk) => (
                    <div
                      key={qk}
                      onClick={() => toggleQuarter(qk)}
                      className="cursor-pointer px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all"
                      style={{
                        background: selectedQuarters.includes(qk) ? '#6c63ff' : '#22263a',
                        color: selectedQuarters.includes(qk) ? '#ffffff' : '#7b82a8',
                        border: selectedQuarters.includes(qk) ? '2px solid #6c63ff' : '2px solid #2e3248'
                      }}
                    >
                      {getQuarterTitle(qk)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#22263a] hover:bg-[#2e3248] border border-[#2e3248] text-[#e8eaf6] rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#6c63ff] hover:bg-[#5a52e0] text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5"
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
