import { useState, useEffect } from 'react';
import { Activity } from '../lib/supabase';

interface AddActivityModalProps {
  isOpen: boolean;
  context: any;
  editingActivity?: Activity | null;
  typeLabels?: Record<string, string>;
  onClose: () => void;
  onAdd: (activity: Activity) => void;
}

const DEFAULT_TYPES = [
  { key: 'csm', label: 'CSM-led', bg: '#e8194b', text: '#ffffff' },
  { key: 'architect', label: 'Success Architect', bg: '#00b4d8', text: '#0f1117' },
  { key: 'specialist', label: 'Success Specialist', bg: '#1a1d3e', text: '#ffffff' },
  { key: 'review', label: 'Success Review', bg: '#7b82a8', text: '#ffffff' },
  { key: 'event', label: 'Event', bg: '#f77f00', text: '#ffffff' },
  { key: 'partner', label: 'Partner', bg: '#f4a261', text: '#0f1117' },
  { key: 'trailhead', label: 'Trailhead', bg: '#9b5de5', text: '#ffffff' },
];

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

export default function AddActivityModal({ isOpen, context, editingActivity, typeLabels, onClose, onAdd }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('csm');

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setName(editingActivity.name);
        setSelectedType(editingActivity.type);
      } else {
        setName('');
        setSelectedType('csm');
      }
    }
  }, [isOpen, editingActivity]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: editingActivity ? editingActivity.id : uid(),
      name: name.trim(),
      type: selectedType
    });

    setName('');
    setSelectedType('csm');
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
                {DEFAULT_TYPES.map((type) => (
                  <div
                    key={type.key}
                    onClick={() => setSelectedType(type.key)}
                    className="cursor-pointer px-2 py-2 rounded-lg text-[10px] font-semibold text-center transition-all"
                    style={{
                      background: type.bg,
                      color: type.text,
                      border: selectedType === type.key ? '2px solid white' : '2px solid transparent'
                    }}
                  >
                    {typeLabels?.[type.key] || type.label}
                  </div>
                ))}
              </div>
            </div>

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
