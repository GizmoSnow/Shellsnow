import { X, Plus, Trash2 } from 'lucide-react';
import { RoadmapData } from '../lib/supabase';

interface GoalsPanelProps {
  data: RoadmapData;
  isOpen: boolean;
  onClose: () => void;
  onChange: (data: RoadmapData) => void;
}

const COLORS = ['#6c63ff', '#00d4aa', '#f77f00', '#e8194b', '#00b4d8', '#9b5de5'];

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

export default function GoalsPanel({ data, isOpen, onClose, onChange }: GoalsPanelProps) {
  if (!isOpen) return null;

  const updateGoal = (goalId: string, field: string, value: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (goal) {
      (goal as any)[field] = value;
      onChange(newData);
    }
  };

  const updateInitiative = (goalId: string, iniId: string, value: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (goal) {
      const ini = goal.initiatives.find(i => i.id === iniId);
      if (ini) {
        ini.label = value;
        onChange(newData);
      }
    }
  };

  const deleteInitiative = (goalId: string, iniId: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (goal) {
      goal.initiatives = goal.initiatives.filter(i => i.id !== iniId);
      onChange(newData);
    }
  };

  const addInitiative = (goalId: string) => {
    const newData = { ...data };
    const goal = newData.goals.find(g => g.id === goalId);
    if (goal) {
      goal.initiatives.push({
        id: uid(),
        label: 'New Initiative',
        activities: { q1: [], q2: [], q3: [], q4: [] }
      });
      onChange(newData);
    }
  };

  const addGoal = () => {
    const newData = { ...data };
    const colorIdx = newData.goals.length % COLORS.length;
    newData.goals.push({
      id: uid(),
      number: `Goal #${newData.goals.length + 1}`,
      title: 'New Goal',
      color: COLORS[colorIdx],
      initiatives: [
        { id: uid(), label: 'New Initiative', activities: { q1: [], q2: [], q3: [], q4: [] } }
      ]
    });
    onChange(newData);
  };

  const deleteGoal = (goalId: string) => {
    const newData = { ...data };
    newData.goals = newData.goals.filter(g => g.id !== goalId);
    onChange(newData);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-[#1a1d27] border-l border-[#2e3248] z-50 p-6 overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-[#e8eaf6]">Edit Goals</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#22263a] rounded-lg text-[#7b82a8] hover:text-[#e8eaf6] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {data.goals.map((goal) => (
            <div key={goal.id} className="bg-[#22263a] border border-[#2e3248] rounded-xl p-4">
              <div className="h-1 rounded mb-4" style={{ background: goal.color }}></div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                    Goal Number
                  </label>
                  <input
                    type="text"
                    value={goal.number}
                    onChange={(e) => updateGoal(goal.id, 'number', e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <div
                        key={c}
                        onClick={() => updateGoal(goal.id, 'color', c)}
                        className="w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110"
                        style={{
                          background: c,
                          border: goal.color === c ? '3px solid white' : 'none'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7b82a8] uppercase tracking-wide mb-2">
                    Key Initiatives
                  </label>
                  <div className="space-y-2">
                    {goal.initiatives.map((ini) => (
                      <div key={ini.id} className="flex gap-2">
                        <input
                          type="text"
                          value={ini.label}
                          onChange={(e) => updateInitiative(goal.id, ini.id, e.target.value)}
                          className="flex-1 bg-[#0f1117] border border-[#2e3248] rounded-lg px-3 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-colors"
                        />
                        <button
                          onClick={() => deleteInitiative(goal.id, ini.id)}
                          className="px-2 py-1 text-[#e8194b] hover:bg-[#e8194b]/10 border border-[#e8194b]/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addInitiative(goal.id)}
                      className="w-full px-3 py-2 bg-[#22263a] hover:bg-[#2e3248] border border-[#2e3248] text-[#e8eaf6] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Initiative
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="w-full px-3 py-2 text-[#e8194b] hover:bg-[#e8194b]/10 border border-[#e8194b]/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  Remove Goal
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addGoal}
          className="w-full mt-4 px-4 py-3 bg-[#066afe] hover:bg-[#0554d1] text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Goal
        </button>

        <p className="text-xs text-[#7b82a8] text-center mt-4 pt-4 border-t border-[#2e3248]">
          Changes apply immediately to the roadmap.
        </p>
      </div>
    </>
  );
}
