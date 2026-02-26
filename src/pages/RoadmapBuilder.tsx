import { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Printer, FileDown, RotateCcw, Moon, Sun, Upload, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase, Roadmap, RoadmapData, Activity } from '../lib/supabase';
import RoadmapGrid from '../components/RoadmapGrid';
import GoalsPanel from '../components/GoalsPanel';
import AddActivityModal from '../components/AddActivityModal';
import FiscalYearSettings from '../components/FiscalYearSettings';
import { exportToPptx } from '../lib/pptx-export';
import { exportToPng } from '../lib/png-export';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getAllRoadmapMonths } from '../lib/fiscal-year';
import { createDefaultSuccessPathItems } from '../lib/default-success-path';
import salesforceLogo from '../assets/69416b267de7ae6888996981_logo.svg';

interface RoadmapBuilderProps {
  roadmapId: string;
}

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  csm: 'CSM-led',
  architect: 'Success Architect',
  specialist: 'Success Specialist',
  review: 'Success Review',
  event: 'Event',
  partner: 'Partner',
  trailhead: 'Trailhead',
};

const TYPE_COLORS: Record<string, string> = {
  csm: '#04e1cb',
  architect: '#08abed',
  specialist: '#022ac0',
  review: '#aacbff',
  event: '#ff538a',
  partner: '#fcc003',
  trailhead: '#d17dfe',
};

function determineQuarterFromMonth(activity: any, fiscalConfig: FiscalYearConfig): string {
  if (!('start_month' in activity) || activity.start_month === undefined) return 'q1';

  const startMonth = parseInt(activity.start_month);
  const allMonths = getAllRoadmapMonths(fiscalConfig);

  const monthIndex = allMonths.findIndex(m => m.calendarMonth === startMonth);
  if (monthIndex === -1) return 'q1';

  const quarterIndex = Math.floor(monthIndex / 3);
  return `q${quarterIndex + 1}` as 'q1' | 'q2' | 'q3' | 'q4';
}

export default function RoadmapBuilder({ roadmapId }: RoadmapBuilderProps) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [data, setData] = useState<RoadmapData>({ goals: [] });
  const [showGoalsPanel, setShowGoalsPanel] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addContext, setAddContext] = useState<any>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingTypeKey, setEditingTypeKey] = useState<string | null>(null);
  const [editingColorKey, setEditingColorKey] = useState<string | null>(null);
  const [customerLogoBase64, setCustomerLogoBase64] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFiscalYearSettings, setShowFiscalYearSettings] = useState(false);
  const [fiscalConfig, setFiscalConfig] = useState<FiscalYearConfig>({
    startMonth: 0,
    baseYear: 26,
    roadmapStartQuarter: 1
  });

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoadmap();
  }, [roadmapId]);

  useEffect(() => {
    if (roadmap) {
      const timeoutId = setTimeout(() => {
        saveRoadmap();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [title, data, fiscalConfig]);

  const loadRoadmap = async () => {
    const { data: roadmapData, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .maybeSingle();

    if (error) {
      console.error('Error loading roadmap:', error);
      navigate('/dashboard');
    } else if (roadmapData) {
      setRoadmap(roadmapData);
      setTitle(roadmapData.title);

      const fiscalCfg = {
        startMonth: roadmapData.fiscal_start_month ?? 0,
        baseYear: roadmapData.base_fiscal_year ?? 26,
        roadmapStartQuarter: roadmapData.roadmap_start_quarter ?? 1
      };

      let loadedData = roadmapData.data;
      if (!loadedData.successPathItems) {
        if (loadedData.successPathLabels) {
          loadedData.successPathItems = Object.entries(loadedData.successPathLabels)
            .filter(([_, label]) => label)
            .map(([quarter, label]) => ({
              id: `sp_${quarter}`,
              label: label as string,
              quarter
            }));
        } else {
          loadedData.successPathItems = createDefaultSuccessPathItems();
        }
      }

      setData(loadedData);
      setCustomerLogoBase64(roadmapData.customer_logo_base64 || null);
      setFiscalConfig(fiscalCfg);
    }
    setLoading(false);
  };

  const saveRoadmap = async () => {
    if (!roadmap) return;

    await supabase
      .from('roadmaps')
      .update({
        title,
        data,
        fiscal_start_month: fiscalConfig.startMonth,
        base_fiscal_year: fiscalConfig.baseYear,
        roadmap_start_quarter: fiscalConfig.roadmapStartQuarter,
        updated_at: new Date().toISOString()
      })
      .eq('id', roadmapId);
  };

  const handleExportPptx = async () => {
    setExporting(true);
    try {
      await exportToPptx(title, data, customerLogoBase64);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    setExporting(true);
    try {
      await exportToPng(title, data, customerLogoBase64);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default template?')) {
      setData({
        goals: [
          {
            id: 'g1',
            number: 'Goal #1',
            title: 'New Business Growth',
            color: '#6c63ff',
            initiatives: [
              {
                id: 'i1',
                label: 'Key Initiative',
                activities: { q1: [], q2: [], q3: [], q4: [] }
              }
            ]
          }
        ]
      });
    }
  };

  const getTypeLabel = (typeKey: string) => {
    return data.typeLabels?.[typeKey] || DEFAULT_TYPE_LABELS[typeKey] || typeKey;
  };

  const updateTypeLabel = (typeKey: string, newLabel: string) => {
    const newData = { ...data };
    if (!newData.typeLabels) {
      newData.typeLabels = {};
    }
    newData.typeLabels[typeKey] = newLabel;
    setData(newData);
    setEditingTypeKey(null);
  };

  const updateTypeColor = (typeKey: string, newColor: string) => {
    const newData = { ...data };
    if (!newData.typeColors) {
      newData.typeColors = {};
    }
    newData.typeColors[typeKey] = newColor;
    setData(newData);
  };

  const getTypeColor = (typeKey: string) => {
    return data.typeColors?.[typeKey] || TYPE_COLORS[typeKey] || '#6c63ff';
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roadmap) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, JPEG, SVG, or GIF image file');
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { error: updateError } = await supabase
          .from('roadmaps')
          .update({ customer_logo_base64: base64String })
          .eq('id', roadmapId);

        if (updateError) throw updateError;

        setCustomerLogoBase64(base64String);
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        alert('Failed to read logo file');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen print-container" style={{ background: 'var(--bg)' }}>
      <div className="border-b sticky top-0 z-50 print-hide" style={{ borderColor: 'var(--border)' }}>
        {/* Top header bar */}
        <div className="px-8 py-4 flex items-center justify-between" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--text)' }}>
              Success Path Builder
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {customerLogoBase64 && (
              <img src={customerLogoBase64} alt="Customer logo" className="h-10 object-contain" />
            )}
            <img
              src={salesforceLogo}
              alt="Salesforce"
              className="h-10 object-contain"
            />
          </div>
        </div>

        {/* Logo upload section - white background */}
        <div className="px-8 py-4 flex items-center gap-2 print-hide" style={{ background: 'white' }}>
          <label className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold cursor-pointer" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Upload size={16} />
            {uploadingLogo ? 'Uploading...' : customerLogoBase64 ? 'Change Customer Logo' : 'Upload Customer Logo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="hidden"
            />
          </label>
          {customerLogoBase64 && (
            <button
              onClick={async () => {
                if (confirm('Remove customer logo?')) {
                  await supabase
                    .from('roadmaps')
                    .update({ customer_logo_base64: null })
                    .eq('id', roadmapId);
                  setCustomerLogoBase64(null);
                }
              }}
              className="px-3 py-2 border rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              style={{ borderColor: '#d1d5db', color: '#dc2626' }}
            >
              Remove Logo
            </button>
          )}
        </div>

        <div className="border-b print-hide" style={{ borderColor: 'var(--border)' }}></div>

        {/* Control buttons section */}
        <div className="px-8 py-4 flex items-center gap-2 print-hide" style={{ background: 'var(--surface)' }}>
          <div className="flex-1"></div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setShowFiscalYearSettings(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Settings size={16} />
            Fiscal Year
          </button>
          <button
            onClick={() => setShowGoalsPanel(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Settings size={16} />
            Edit Goals
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handleExportPng}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: exporting ? '#6b7280' : '#066afe' }}
            onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = '#0554d1')}
            onMouseLeave={(e) => !exporting && (e.currentTarget.style.background = '#066afe')}
          >
            <Image size={16} />
            {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            onClick={handleExportPptx}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: exporting ? '#6b7280' : '#066afe' }}
            onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = '#0554d1')}
            onMouseLeave={(e) => !exporting && (e.currentTarget.style.background = '#066afe')}
          >
            <FileDown size={16} />
            {exporting ? 'Exporting...' : 'Export PowerPoint'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold"
            style={{ background: '#066afe' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0554d1'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#066afe'}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Roadmap content area */}
      <div className="px-8 py-6 print-roadmap-content" style={{ background: 'var(--bg)' }}>
        {/* Print header with logos - only visible when printing */}
        <div className="hidden print-header print-only" style={{ display: 'none' }}>
          <div className="print-title">{title}</div>
          <div className="flex items-center gap-4">
            {customerLogoBase64 && (
              <img src={customerLogoBase64} alt="Customer logo" style={{ height: '50px', objectFit: 'contain' }} />
            )}
            <img
              src={salesforceLogo}
              alt="Salesforce"
              style={{ height: '50px', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Legend for print - only visible when printing */}
        <div className="hidden print-legend print-only" style={{ display: 'none' }}>
          {Object.entries(TYPE_COLORS).map(([typeKey, color]) => (
            <div key={typeKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: getTypeColor(typeKey) }}></div>
              <span style={{ color: '#000' }}>{getTypeLabel(typeKey)}</span>
            </div>
          ))}
        </div>

        {/* Screen title - hidden when printing */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-3xl font-extrabold bg-transparent border-none outline-none w-full mb-4 print-hide"
          style={{ color: 'var(--text)' }}
          placeholder="Enter roadmap title..."
        />

        {/* Screen legend - hidden when printing */}
        <div className="flex gap-3 mb-5 flex-wrap text-xs font-medium print-hide" style={{ color: 'var(--text-muted)' }}>
          {Object.entries(TYPE_COLORS).map(([typeKey, color]) => (
            <div key={typeKey} className="flex items-center gap-2 relative">
              <div className="relative">
                <div
                  className="w-3 h-3 rounded cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all"
                  style={{ background: getTypeColor(typeKey), ringColor: 'var(--primary)' }}
                  onClick={() => setEditingColorKey(editingColorKey === typeKey ? null : typeKey)}
                ></div>
                {editingColorKey === typeKey && (
                  <input
                    type="color"
                    value={getTypeColor(typeKey)}
                    onChange={(e) => updateTypeColor(typeKey, e.target.value)}
                    className="absolute top-0 left-0 w-3 h-3 opacity-0 cursor-pointer"
                    style={{ width: '40px', height: '40px', marginTop: '-10px', marginLeft: '-10px' }}
                  />
                )}
              </div>
              {editingTypeKey === typeKey ? (
                <input
                  type="text"
                  value={getTypeLabel(typeKey)}
                  onChange={(e) => {
                    const newData = { ...data };
                    if (!newData.typeLabels) {
                      newData.typeLabels = {};
                    }
                    newData.typeLabels[typeKey] = e.target.value;
                    setData(newData);
                  }}
                  onBlur={() => setEditingTypeKey(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTypeKey(null);
                    }
                    if (e.key === 'Escape') {
                      const newData = { ...data };
                      if (newData.typeLabels) {
                        delete newData.typeLabels[typeKey];
                      }
                      setData(newData);
                      setEditingTypeKey(null);
                    }
                  }}
                  autoFocus
                  className="border border-[#6c63ff] rounded px-2 py-0.5 outline-none min-w-[120px]"
                  style={{ background: 'var(--surface)', color: 'var(--text)' }}
                />
              ) : (
                <span
                  onClick={() => setEditingTypeKey(typeKey)}
                  className="cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Click to edit"
                >
                  {getTypeLabel(typeKey)}
                </span>
              )}
            </div>
          ))}
        </div>

        <RoadmapGrid
          data={data}
          fiscalConfig={fiscalConfig}
          onDataChange={setData}
          getTypeColor={getTypeColor}
          onOpenAddModal={(context) => {
            setAddContext(context);
            setEditingActivity(null);
            setShowAddModal(true);
          }}
          onOpenEditModal={(context, activity) => {
            setAddContext(context);
            setEditingActivity(activity);
            setShowAddModal(true);
          }}
        />
      </div>

      <FiscalYearSettings
        isOpen={showFiscalYearSettings}
        config={fiscalConfig}
        onClose={() => setShowFiscalYearSettings(false)}
        onSave={(newConfig) => {
          setFiscalConfig(newConfig);
        }}
      />

      <GoalsPanel
        data={data}
        isOpen={showGoalsPanel}
        onClose={() => setShowGoalsPanel(false)}
        onChange={setData}
      />

      <AddActivityModal
        isOpen={showAddModal}
        context={addContext}
        editingActivity={editingActivity}
        typeLabels={data.typeLabels}
        fiscalConfig={fiscalConfig}
        getTypeColor={getTypeColor}
        onClose={() => {
          setShowAddModal(false);
          setEditingActivity(null);
        }}
        onAdd={(activity) => {
          console.log('=== ADD ACTIVITY DEBUG ===');
          console.log('Activity:', activity);
          console.log('Context:', addContext);
          console.log('Editing:', editingActivity);

          const newData = { ...data };

          if (addContext.isAccountLevel) {
            console.log('Adding to account level');
            const isSpanningActivity = 'quarters' in activity;
            if (isSpanningActivity) {
              if (editingActivity) {
                const index = newData.accountSpanning?.findIndex(a => a.id === activity.id) ?? -1;
                if (index >= 0 && newData.accountSpanning) {
                  newData.accountSpanning[index] = activity as any;
                }
              } else {
                if (!newData.accountSpanning) newData.accountSpanning = [];
                newData.accountSpanning.push(activity as any);
              }
            }
          } else {
            console.log('Adding to goal level');
            const { goalId, initiativeId, quarter } = addContext;
            console.log('Goal ID:', goalId, 'Initiative ID:', initiativeId, 'Quarter:', quarter);

            const goal = newData.goals.find(g => g.id === goalId);
            if (!goal) {
              console.error('Goal not found!');
              return;
            }
            console.log('Found goal:', goal.name);

            const initiative = goal.initiatives.find(i => i.id === initiativeId);
            if (!initiative) {
              console.error('Initiative not found!');
              return;
            }
            console.log('Found initiative:', initiative.name);

            const isSpanningActivity = 'quarters' in activity;

            if (editingActivity) {
              if (isSpanningActivity || quarter === 'spanning') {
                const index = initiative.spanning?.findIndex(a => a.id === activity.id) ?? -1;
                if (index >= 0 && initiative.spanning) {
                  initiative.spanning[index] = activity as any;
                }
              } else {
                const targetQuarter = quarter || determineQuarterFromMonth(activity, fiscalConfig);
                const acts = initiative.activities[targetQuarter as keyof typeof initiative.activities];
                const index = acts.findIndex(a => a.id === activity.id);
                if (index >= 0) {
                  acts[index] = activity as any;
                }
              }
            } else {
              if (isSpanningActivity) {
                console.log('Adding spanning activity');
                if (!initiative.spanning) initiative.spanning = [];
                initiative.spanning.push(activity as any);
              } else {
                const targetQuarter = quarter || determineQuarterFromMonth(activity, fiscalConfig);
                console.log('Target quarter:', targetQuarter);
                if (!initiative.activities[targetQuarter as keyof typeof initiative.activities]) {
                  initiative.activities[targetQuarter as keyof typeof initiative.activities] = [];
                }
                initiative.activities[targetQuarter as keyof typeof initiative.activities].push(activity as any);
                console.log('Activity added to quarter', targetQuarter);
              }
            }
          }

          console.log('New data:', newData);
          setData(newData);
          setShowAddModal(false);
          setEditingActivity(null);
          console.log('=== END ADD ACTIVITY DEBUG ===');
        }}
      />
    </div>
  );
}
