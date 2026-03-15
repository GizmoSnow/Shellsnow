import { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Printer, FileDown, RotateCcw, Moon, Sun, Upload, Image, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase, Roadmap, RoadmapData, Activity } from '../lib/supabase';
import RoadmapGrid from '../components/RoadmapGrid';
import GoalsPanel from '../components/GoalsPanel';
import AddActivityModal from '../components/AddActivityModal';
import FiscalYearSettings from '../components/FiscalYearSettings';
import ResetConfirmationModal from '../components/ResetConfirmationModal';
import { EngagementValueSummary } from '../components/EngagementValueSummary';
import { SalesforceContributionSummary } from '../components/SalesforceContributionSummary';
import { exportToPptx } from '../lib/pptx-export';
import { exportToPng } from '../lib/png-export';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getAllRoadmapMonths } from '../lib/fiscal-year';
import { createDefaultSuccessPathItems } from '../lib/default-success-path';
import { getAllTypeMetadata, getTypeMetadata, DEFAULT_ACTIVITY_TYPES, getNextAvailableColor } from '../lib/activity-types';
import type { ActivityTypeMetadata, ActivityOwner } from '../lib/activity-types';
import salesforceLogo from '../assets/69416b267de7ae6888996981_logo_(1).svg';

interface RoadmapBuilderProps {
  roadmapId: string;
}

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  csm: 'CSM',
  architect: 'Success Architect',
  specialist: 'Success Specialist',
  advisory: 'Product Advisory',
  enablement: 'Enablement',
  event: 'Event',
};

const TYPE_COLORS: Record<string, string> = {
  csm: '#45C65A',
  architect: '#0D9DDA',
  specialist: '#5867E8',
  advisory: '#7526E3',
  enablement: '#06A59A',
  event: '#F38303',
};

const TYPE_OWNERS: Record<string, ActivityOwner> = {
  csm: 'salesforce',
  architect: 'salesforce',
  specialist: 'salesforce',
  advisory: 'salesforce',
  enablement: 'salesforce',
  event: 'salesforce',
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
  const [addingNewType, setAddingNewType] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeOwner, setNewTypeOwner] = useState<'salesforce' | 'partner' | 'customer'>('customer');
  const [customerLogoBase64, setCustomerLogoBase64] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFiscalYearSettings, setShowFiscalYearSettings] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [fiscalConfig, setFiscalConfig] = useState<FiscalYearConfig>({
    startMonth: 0,
    baseYear: 26,
    roadmapStartQuarter: 1
  });
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 2000);

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoadmap();
  }, [roadmapId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          setToolbarCollapsed(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (roadmap) {
      const timeoutId = setTimeout(() => {
        saveRoadmap();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [roadmap, title, data, fiscalConfig, customerLogoBase64]);

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

    const { error } = await supabase
      .from('roadmaps')
      .update({
        title,
        data,
        customer_logo_base64: customerLogoBase64,
        fiscal_start_month: fiscalConfig.startMonth,
        base_fiscal_year: fiscalConfig.baseYear,
        roadmap_start_quarter: fiscalConfig.roadmapStartQuarter,
        updated_at: new Date().toISOString()
      })
      .eq('id', roadmapId);

    if (error) {
      console.error('Error saving roadmap:', error);
    }
  };

  const handleExportPptx = async () => {
    setExporting(true);
    try {
      await exportToPptx(title, data, customerLogoBase64, fiscalConfig);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    const wasCollapsed = toolbarCollapsed;
    setToolbarCollapsed(true);
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await exportToPng(title, data, customerLogoBase64);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
      setToolbarCollapsed(wasCollapsed);
    }
  };

  const handleReset = () => {
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
  };

  const getTypeLabel = (typeKey: string) => {
    const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
    return metadata?.label || data.typeLabels?.[typeKey] || typeKey;
  };

  const updateTypeLabel = (typeKey: string, newLabel: string) => {
    const newData = { ...data };
    const customTypeIndex = newData.customActivityTypes?.findIndex(t => t.key === typeKey);

    if (customTypeIndex !== undefined && customTypeIndex >= 0 && newData.customActivityTypes) {
      newData.customActivityTypes[customTypeIndex] = {
        ...newData.customActivityTypes[customTypeIndex],
        label: newLabel
      };
    } else {
      if (!newData.typeLabels) {
        newData.typeLabels = {};
      }
      newData.typeLabels[typeKey] = newLabel;
    }

    setData(newData);
    setEditingTypeKey(null);
  };

  const updateTypeColor = async (typeKey: string, newColor: string) => {
    const newData = { ...data };
    const customTypeIndex = newData.customActivityTypes?.findIndex(t => t.key === typeKey);

    if (customTypeIndex !== undefined && customTypeIndex >= 0 && newData.customActivityTypes) {
      newData.customActivityTypes[customTypeIndex] = {
        ...newData.customActivityTypes[customTypeIndex],
        color: newColor
      };
    } else {
      if (!newData.typeColors) {
        newData.typeColors = {};
      }
      newData.typeColors[typeKey] = newColor;
    }

    setData(newData);

    // Save immediately when color changes
    if (roadmap) {
      await supabase
        .from('roadmaps')
        .update({ data: newData })
        .eq('id', roadmapId);
    }
  };

  const getTypeColor = (typeKey: string) => {
    // First check for user-customized colors
    if (data.typeColors?.[typeKey]) {
      return data.typeColors[typeKey];
    }
    // Then check metadata (default or custom types)
    const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
    return metadata?.color || '#6c63ff';
  };

  const getTypeOwner = (typeKey: string): ActivityOwner | undefined => {
    const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
    if (metadata?.owner) return metadata.owner;

    return data.typeOwners?.[typeKey] || TYPE_OWNERS[typeKey];
  };

  const getAllTypeKeys = () => {
    const allMetadata = getAllTypeMetadata(data.customActivityTypes);
    const metadataKeys = allMetadata.map(m => m.key);

    const legacyKeys = Object.keys(data.typeLabels || {}).filter(key => !metadataKeys.includes(key));

    return [...metadataKeys, ...legacyKeys];
  };

  const generateDefaultColor = () => {
    return getNextAvailableColor(data.customActivityTypes, data.typeColors);
  };

  const handleAddCustomType = () => {
    setAddingNewType(true);
    setNewTypeLabel('');
  };

  const confirmAddCustomType = () => {
    if (!newTypeLabel.trim()) {
      setAddingNewType(false);
      setNewTypeLabel('');
      setNewTypeOwner('customer');
      return;
    }

    const trimmedLabel = newTypeLabel.trim();
    const lowerLabel = trimmedLabel.toLowerCase();

    if (lowerLabel === 'salesforce' || lowerLabel === 'partner' || lowerLabel === 'customer') {
      alert('Cannot create a type named "Salesforce", "Partner", or "Customer" as these are owner values, not activity types.');
      return;
    }

    const typeKey = trimmedLabel.toLowerCase().replace(/\s+/g, '_');

    if (getAllTypeKeys().includes(typeKey)) {
      alert('A type with this name already exists');
      return;
    }

    const newData = { ...data };
    if (!newData.customActivityTypes) {
      newData.customActivityTypes = [];
    }

    newData.customActivityTypes.push({
      key: typeKey,
      label: trimmedLabel,
      color: generateDefaultColor(),
      owner: newTypeOwner
    });

    setData(newData);
    setAddingNewType(false);
    setNewTypeLabel('');
    setNewTypeOwner('customer');
  };

  const cancelAddCustomType = () => {
    setAddingNewType(false);
    setNewTypeLabel('');
    setNewTypeOwner('customer');
  };

  const deleteCustomType = (typeKey: string) => {
    const isDefault = DEFAULT_ACTIVITY_TYPES.some(t => t.key === typeKey);
    if (isDefault) return;

    const newData = { ...data };

    if (newData.customActivityTypes) {
      newData.customActivityTypes = newData.customActivityTypes.filter(t => t.key !== typeKey);
    }

    if (newData.typeLabels) {
      delete newData.typeLabels[typeKey];
    }
    if (newData.typeColors) {
      delete newData.typeColors[typeKey];
    }
    if (newData.typeOwners) {
      delete newData.typeOwners[typeKey];
    }

    setData(newData);
  };

  const updateHeaderColor = (color: string) => {
    const newData = { ...data };
    newData.headerColor = color;
    setData(newData);
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
        <div className="px-8 py-4 flex items-center justify-between" style={{ background: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'var(--surface)' }}>
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
              <img
                src={customerLogoBase64}
                alt="Customer logo"
                className="h-10 object-contain"
                style={theme === 'dark' ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.8))' } : {}}
              />
            )}
            <img
              src={salesforceLogo}
              alt="Salesforce"
              className="h-10 object-contain"
              style={theme === 'dark' ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.8))' } : {}}
            />
            <button
              onClick={() => setToolbarCollapsed(prev => !prev)}
              className="p-2 rounded-lg transition-colors ml-2"
              style={{ color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title={toolbarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            >
              {toolbarCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
        </div>

        {/* Logo upload section and control buttons - collapsible toolbar */}
        {!toolbarCollapsed && (
          <>
            <div className="px-8 py-4 flex items-center gap-2 print-hide" style={{
              background: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'var(--surface)',
              borderBottom: '1px solid var(--border)'
            }}>
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
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setCustomerLogoBase64(null);

                    const { error } = await supabase
                      .from('roadmaps')
                      .update({ customer_logo_base64: null })
                      .eq('id', roadmapId);

                    if (error) {
                      console.error('Error removing logo:', error);
                      setCustomerLogoBase64(customerLogoBase64);
                    }
                  }}
                  className="px-3 py-2 border rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    color: '#dc2626',
                    background: 'var(--surface)'
                  }}
                  title="Remove customer logo"
                >
                  Remove Logo
                </button>
              )}
            </div>

            {/* Control buttons section */}
            <div className="px-8 py-4 flex items-center gap-2 print-hide" style={{
              background: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'var(--surface)',
              borderBottom: '1px solid var(--border)'
            }}>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Header Color:</label>
                <input
                  type="color"
                  value={data.headerColor || '#0B1D3A'}
                  onChange={(e) => updateHeaderColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                  title="Change header background color"
                />
              </div>
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
                onClick={() => setShowResetConfirmation(true)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold"
                style={{ background: '#066afe' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0554d1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#066afe'}
              >
                <RotateCcw size={16} />
                Reset All
              </button>
            </div>
          </>
        )}
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
          {getAllTypeKeys().map((typeKey) => (
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

        {/* Salesforce Contribution Summary - Compact */}
        <SalesforceContributionSummary
          data={data}
          fiscalConfig={fiscalConfig}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          typeLabels={data.typeLabels || {}}
          typeColors={data.typeColors || {}}
          typeOwners={data.typeOwners || {}}
          defaultTypeLabels={DEFAULT_TYPE_LABELS}
          defaultTypeColors={TYPE_COLORS}
          defaultTypeOwners={TYPE_OWNERS}
        />

        {/* Engagement Value Summary - Minimal Breakdown Drawer */}
        <EngagementValueSummary
          data={data}
          fiscalConfig={fiscalConfig}
          selectedYear={selectedYear}
          typeLabels={data.typeLabels || {}}
          typeColors={data.typeColors || {}}
          typeOwners={data.typeOwners || {}}
          defaultTypeLabels={DEFAULT_TYPE_LABELS}
          defaultTypeColors={TYPE_COLORS}
          defaultTypeOwners={TYPE_OWNERS}
        />

        {/* Screen legend - hidden when printing */}
        <div
          className="rounded-xl mb-5 print-hide"
          style={{
            border: '1px solid var(--border)',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'var(--surface)'
          }}
        >
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {getAllTypeKeys().map((typeKey) => {
                const isDefault = DEFAULT_TYPE_LABELS.hasOwnProperty(typeKey);
                return (
                  <div
                    key={typeKey}
                    className="inline-flex items-center gap-3 rounded-full px-4 h-9 relative group transition-all whitespace-nowrap"
                    style={{
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div className="relative flex items-center">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all"
                        style={{ background: getTypeColor(typeKey), ringColor: 'var(--primary)' }}
                        onClick={() => setEditingColorKey(editingColorKey === typeKey ? null : typeKey)}
                      ></div>
                      {editingColorKey === typeKey && (
                        <input
                          type="color"
                          value={getTypeColor(typeKey)}
                          onChange={(e) => updateTypeColor(typeKey, e.target.value)}
                          onBlur={() => setEditingColorKey(null)}
                          className="absolute top-0 left-0 w-3.5 h-3.5 opacity-0 cursor-pointer"
                          style={{ width: '40px', height: '40px', marginTop: '-10px', marginLeft: '-10px' }}
                          autoFocus
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
                        className="border border-[#0176D3] rounded px-2 py-1 outline-none min-w-[120px] text-xs font-medium -my-1"
                        style={{ background: 'var(--surface)', color: 'var(--text)' }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingTypeKey(typeKey)}
                        className="cursor-pointer transition-colors text-xs font-medium"
                        style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'var(--text)' }}
                        title="Click to edit label"
                      >
                        {getTypeLabel(typeKey)}
                      </span>
                    )}
                    {!isDefault && (
                      <button
                        onClick={() => deleteCustomType(typeKey)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full p-1 -mr-1"
                        title="Delete custom type"
                      >
                        <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </button>
                    )}
                    {isDefault && <div className="w-0"></div>}
                  </div>
                );
              })}
              {addingNewType ? (
                <div
                  className="inline-flex items-center gap-3 rounded-full px-4 h-9 whitespace-nowrap"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    border: '1px solid var(--primary)'
                  }}
                >
                  <input
                    type="text"
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        confirmAddCustomType();
                      }
                      if (e.key === 'Escape') {
                        cancelAddCustomType();
                      }
                    }}
                    placeholder="Type name..."
                    autoFocus
                    className="border-0 outline-none text-xs font-medium bg-transparent"
                    style={{ color: 'var(--text)', minWidth: '100px' }}
                  />
                  <select
                    value={newTypeOwner}
                    onChange={(e) => setNewTypeOwner(e.target.value as 'salesforce' | 'partner' | 'customer')}
                    className="border-0 outline-none text-xs font-medium bg-transparent"
                    style={{ color: 'var(--text)' }}
                  >
                    <option value="salesforce">Salesforce</option>
                    <option value="partner">Partner</option>
                    <option value="customer">Customer</option>
                  </select>
                  <button
                    onClick={confirmAddCustomType}
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-colors text-xs shrink-0"
                    style={{ background: '#2E844A', color: 'white' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#45C65A'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#2E844A'}
                    title="Confirm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={cancelAddCustomType}
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-colors text-xs shrink-0"
                    style={{ background: '#AA3001', color: 'white' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F38303'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#AA3001'}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddCustomType}
                  className="inline-flex items-center gap-2 rounded-full px-4 h-9 text-xs font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    color: 'var(--primary)',
                    border: '1px dashed var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'}
                >
                  + Add Type
                </button>
              )}
            </div>
          </div>
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

      <ResetConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={handleReset}
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
        customActivityTypes={data.customActivityTypes}
        fiscalConfig={fiscalConfig}
        getTypeColor={getTypeColor}
        getTypeLabel={getTypeLabel}
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
