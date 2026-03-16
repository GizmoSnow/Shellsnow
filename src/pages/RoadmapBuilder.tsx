import { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Printer, FileDown, RotateCcw, Moon, Sun, Upload, Image, ChevronUp, ChevronDown, X, Palette, FileInput, FolderOpen } from 'lucide-react';
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
  const [editingTypeValue, setEditingTypeValue] = useState<string>('');
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
  const [canvasStyle, setCanvasStyle] = useState<'light' | 'dark'>('light');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoadmap();

  }, [roadmapId]);


  useEffect(() => {
    document.documentElement.setAttribute('data-canvas', canvasStyle);
  }, [canvasStyle]);

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
      const timeoutId = setTimeout(async () => {
        try {
          await saveRoadmap();
        } catch (err) {
          console.error('Auto-save failed:', err);
          // Don't navigate away, just show error
          setSaveError('Failed to save changes. Your work is still here.');
          setTimeout(() => setSaveError(null), 5000);
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [roadmap, title, data, fiscalConfig, customerLogoBase64, canvasStyle]);

  const loadRoadmap = async (retryCount = 0) => {
    console.log('[LOAD] Loading roadmap:', { roadmapId, retryCount });

    const { data: roadmapData, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .maybeSingle();

    if (error) {
      console.error('[LOAD ERROR] Failed to load roadmap:', error);

      if (retryCount < 3) {
        console.log('[LOAD] Retrying...', retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadRoadmap(retryCount + 1);
      }

      // Only navigate away if this is the very first load attempt AND we have no existing data
      if (!hasLoadedOnce && !roadmap) {
        alert('Failed to load roadmap. Returning to dashboard.');
        navigate('/dashboard');
      } else {
        console.error('[LOAD] Keeping existing data due to load failure');
        setSaveError('Failed to reload roadmap data');
        setTimeout(() => setSaveError(null), 5000);
      }
      return;
    } else if (!roadmapData) {
      console.error('[LOAD ERROR] Roadmap not found:', roadmapId);

      if (retryCount < 3) {
        console.log('[LOAD] Retrying...', retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadRoadmap(retryCount + 1);
      }

      // Only navigate away if this is the very first load AND roadmap truly doesn't exist
      if (!hasLoadedOnce) {
        alert('Roadmap not found. Returning to dashboard.');
        navigate('/dashboard');
      } else {
        console.error('[LOAD] Roadmap not found on reload, keeping existing data');
        setSaveError('Failed to reload roadmap data');
        setTimeout(() => setSaveError(null), 5000);
      }
      return;
    } else {
      console.log('[LOAD SUCCESS] Roadmap loaded:', roadmapData.id);
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
      setCanvasStyle(roadmapData.canvas_style || 'light');
      setHasLoadedOnce(true);
    }
    setLoading(false);
  };

  const saveRoadmap = async () => {
    if (!roadmap) return;

    try {
      // Validate data shape before saving
      const validateData = (data: RoadmapData) => {
        // Check typeColors are valid strings
        if (data.typeColors) {
          for (const [key, value] of Object.entries(data.typeColors)) {
            if (typeof value !== 'string' || !value || value === 'undefined' || value === 'null') {
              console.error(`Invalid color for type ${key}:`, value);
              return false;
            }
          }
        }

        // Check customActivityTypes colors are valid
        if (data.customActivityTypes) {
          for (const type of data.customActivityTypes) {
            if (type.color && (typeof type.color !== 'string' || !type.color || type.color === 'undefined' || type.color === 'null')) {
              console.error(`Invalid color for custom type ${type.key}:`, type.color);
              return false;
            }
          }
        }

        return true;
      };

      if (!validateData(data)) {
        console.error('Data validation failed. Skipping save to prevent corruption.');
        throw new Error('Invalid data shape detected');
      }

      const payload = {
        title,
        data,
        customer_logo_base64: customerLogoBase64,
        canvas_style: canvasStyle,
        fiscal_start_month: fiscalConfig.startMonth,
        base_fiscal_year: fiscalConfig.baseYear,
        roadmap_start_quarter: fiscalConfig.roadmapStartQuarter,
        updated_at: new Date().toISOString()
      };

      console.log('[SAVE] Saving roadmap:', {
        roadmapId,
        title,
        typeColors: data.typeColors,
        customActivityTypes: data.customActivityTypes?.map(t => ({ key: t.key, color: t.color })),
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase
        .from('roadmaps')
        .update(payload)
        .eq('id', roadmapId);

      if (error) {
        console.error('[SAVE ERROR] Database update failed:', error);
        throw error;
      }

      console.log('[SAVE SUCCESS] Roadmap saved successfully');
      setLastSaveTime(new Date());
      setSaveError(null);
    } catch (err) {
      console.error('[SAVE FAILED] Exception during save:', err);
      throw err;
    }
  };

  const handleExportPptx = async () => {
    setExporting(true);
    try {
      await exportToPptx(title, data, customerLogoBase64, fiscalConfig, canvasStyle);
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
      await exportToPng(title, data, customerLogoBase64, canvasStyle);
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
        },
        {
          id: 'g2',
          number: 'Goal #2',
          title: 'Customer Retention',
          color: '#45C65A',
          initiatives: [
            {
              id: 'i2',
              label: 'Key Initiative',
              activities: { q1: [], q2: [], q3: [], q4: [] }
            }
          ]
        },
        {
          id: 'g3',
          number: 'Goal #3',
          title: 'Product Adoption',
          color: '#F38303',
          initiatives: [
            {
              id: 'i3',
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
    console.log('[COLOR CHANGE] Starting color update:', { typeKey, newColor, currentColor: getTypeColor(typeKey) });

    // Validate color is a valid string
    if (!newColor || typeof newColor !== 'string' || newColor === 'undefined' || newColor === 'null') {
      console.error('[COLOR CHANGE] Invalid color value:', newColor);
      setSaveError('Invalid color value');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    try {
      const newData = { ...data };
      const customTypeIndex = newData.customActivityTypes?.findIndex(t => t.key === typeKey);

      if (customTypeIndex !== undefined && customTypeIndex >= 0 && newData.customActivityTypes) {
        // Immutable update for custom activity type
        newData.customActivityTypes = [...newData.customActivityTypes];
        newData.customActivityTypes[customTypeIndex] = {
          ...newData.customActivityTypes[customTypeIndex],
          color: newColor
        };
        console.log('[COLOR CHANGE] Updated custom type:', newData.customActivityTypes[customTypeIndex]);
      } else {
        // Immutable update for type colors
        if (!newData.typeColors) {
          newData.typeColors = {};
        }
        newData.typeColors = {
          ...newData.typeColors,
          [typeKey]: newColor
        };
        console.log('[COLOR CHANGE] Updated type color:', { typeKey, color: newData.typeColors[typeKey] });
      }

      console.log('[COLOR CHANGE] Applying state update');
      setData(newData);
      console.log('[COLOR CHANGE] Color change complete, autosave will trigger');
    } catch (err) {
      console.error('[COLOR CHANGE ERROR]:', err);
      setSaveError('Failed to update color');
      setTimeout(() => setSaveError(null), 3000);
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
    if (!file || !roadmap) {
      e.target.value = '';
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, JPEG, SVG, or GIF image file');
      e.target.value = '';
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;

          const { error: updateError } = await supabase
            .from('roadmaps')
            .update({ customer_logo_base64: base64String })
            .eq('id', roadmapId);

          if (updateError) throw updateError;

          setCustomerLogoBase64(base64String);
          setUploadingLogo(false);
          e.target.value = '';
        } catch (error) {
          console.error('Logo upload error:', error);
          alert('Failed to upload logo');
          setUploadingLogo(false);
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        alert('Failed to read logo file');
        setUploadingLogo(false);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
      setUploadingLogo(false);
      e.target.value = '';
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
    <div className="min-h-screen print-container" style={{ background: 'var(--bg-app)' }}>
      {saveError && (
        <div
          className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg border max-w-md animate-slideIn"
          style={{
            background: 'var(--error-bg)',
            borderColor: 'var(--error-border)',
            color: 'var(--error-text)'
          }}
        >
          <div className="flex items-start gap-3">
            <X size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">{saveError}</p>
              <p className="text-xs mt-1 opacity-75">Changes will retry automatically</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="border-b sticky top-0 z-50 print-hide backdrop-blur-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--header-bg)' }}>
        {/* Top header bar */}
        <div className="px-8 py-4 flex items-center justify-between" style={{ background: 'var(--header-bg)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--icon-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--header-text)' }}>
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
              style={{ color: 'var(--icon-primary)' }}
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
              background: 'var(--bg-shell)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold cursor-pointer" style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}>
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
                    borderColor: 'var(--border-subtle)',
                    color: '#dc2626',
                    background: 'var(--bg-panel)'
                  }}
                  title="Remove customer logo"
                >
                  Remove Logo
                </button>
              )}
            </div>

            {/* Control buttons section */}
            <div className="px-8 py-4 flex items-center gap-2 print-hide" style={{
              background: 'var(--bg-shell)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Header Color:</label>
                <div className="relative">
                  <input
                    type="color"
                    id="header-color-input"
                    value={data.headerColor || '#066afe'}
                    onChange={(e) => updateHeaderColor(e.target.value)}
                    className="absolute opacity-0 w-0 h-0"
                  />
                  <label
                    htmlFor="header-color-input"
                    className="block w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{
                      backgroundColor: data.headerColor || '#066afe',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    title="Change header background color"
                  />
                </div>
              </div>
              <div className="flex-1"></div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'var(--button-neutral-bg)', color: 'var(--icon-primary)' }}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => {
                  const newStyle = canvasStyle === 'light' ? 'dark' : 'light';
                  setCanvasStyle(newStyle);
                }}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-semibold"
                style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}
                title="Toggle roadmap canvas style"
              >
                <Palette size={16} />
                Canvas: {canvasStyle === 'dark' ? 'Dark' : 'Light'}
              </button>
              <button
                onClick={() => setShowFiscalYearSettings(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
                style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}
              >
                <Settings size={16} />
                Fiscal Year
              </button>
              <button
                onClick={() => setShowGoalsPanel(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
                style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}
              >
                <Settings size={16} />
                Edit Goals
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-semibold"
                style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={() => navigate(`/import-workspace/${roadmapId}`)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold"
                style={{ background: 'var(--primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                <Upload size={16} />
                Import Activities
              </button>
              <button
                onClick={handleExportPng}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: exporting ? '#6b7280' : 'var(--primary)' }}
                onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = 'var(--primary-hover)')}
                onMouseLeave={(e) => !exporting && (e.currentTarget.style.background = 'var(--primary)')}
              >
                <Image size={16} />
                {exporting ? 'Exporting...' : 'Export PNG'}
              </button>
              <button
                onClick={handleExportPptx}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: exporting ? '#6b7280' : 'var(--primary)' }}
                onMouseEnter={(e) => !exporting && (e.currentTarget.style.background = 'var(--primary-hover)')}
                onMouseLeave={(e) => !exporting && (e.currentTarget.style.background = 'var(--primary)')}
              >
                <FileDown size={16} />
                {exporting ? 'Exporting...' : 'Export PowerPoint'}
              </button>
              <button
                onClick={() => setShowResetConfirmation(true)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold"
                style={{ background: 'var(--primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                <RotateCcw size={16} />
                Reset All
              </button>
            </div>
          </>
        )}
      </div>

      {/* Roadmap content area */}
      <div className="px-8 py-6 print-roadmap-content" style={{ background: 'var(--bg-app)' }}>
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
          style={{ color: 'var(--text-primary)' }}
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
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-panel)'
          }}
        >
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {getAllTypeKeys().map((typeKey) => {
                const isDefault = DEFAULT_ACTIVITY_TYPES.some(t => t.key === typeKey);
                return (
                  <div
                    key={typeKey}
                    className="inline-flex items-center gap-3 rounded-full px-4 h-9 relative group transition-all whitespace-nowrap"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)'
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
                        value={editingTypeValue}
                        onChange={(e) => setEditingTypeValue(e.target.value)}
                        onBlur={() => {
                          if (editingTypeValue.trim()) {
                            updateTypeLabel(typeKey, editingTypeValue.trim());
                          } else {
                            setEditingTypeKey(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editingTypeValue.trim()) {
                              updateTypeLabel(typeKey, editingTypeValue.trim());
                            } else {
                              setEditingTypeKey(null);
                            }
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTypeKey(null);
                            setEditingTypeValue('');
                          }
                        }}
                        autoFocus
                        className="border border-[#0176D3] rounded px-2 py-1 outline-none min-w-[120px] text-xs font-medium -my-1"
                        style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
                      />
                    ) : (
                      <span
                        onClick={() => {
                          if (!isDefault) {
                            setEditingTypeKey(typeKey);
                            setEditingTypeValue(getTypeLabel(typeKey));
                          }
                        }}
                        className={!isDefault ? "cursor-pointer transition-colors text-xs font-medium hover:opacity-70" : "text-xs font-medium"}
                        style={{ color: 'var(--text-primary)' }}
                        title={!isDefault ? "Click to edit label" : undefined}
                      >
                        {getTypeLabel(typeKey)}
                      </span>
                    )}
                    {!isDefault && (
                      <button
                        onClick={() => deleteCustomType(typeKey)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full p-1 -mr-1"
                        title="Delete custom type"
                        style={{ color: '#dc2626' }}
                      >
                        <X className="w-3 h-3" />
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
                    background: 'var(--bg-subtle)',
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
                    style={{ color: 'var(--text-primary)', minWidth: '100px' }}
                  />
                  <select
                    value={newTypeOwner}
                    onChange={(e) => setNewTypeOwner(e.target.value as 'salesforce' | 'partner' | 'customer')}
                    className="border-0 outline-none text-xs font-medium bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
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
                    background: 'var(--bg-subtle)',
                    color: 'var(--primary)',
                    border: '1px dashed var(--border-subtle)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
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
        data={data}
        fiscalConfig={fiscalConfig}
        getTypeColor={getTypeColor}
        getTypeLabel={getTypeLabel}
        getAllTypeKeys={getAllTypeKeys}
        onClose={() => {
          setShowAddModal(false);
          setEditingActivity(null);
        }}
        onAdd={(activity, moveInfo) => {
          console.log('=== ADD ACTIVITY DEBUG ===');
          console.log('Activity:', activity);
          console.log('Context:', addContext);
          console.log('Editing:', editingActivity);
          console.log('Move info:', moveInfo);

          const newData = { ...data };

          if (moveInfo && editingActivity) {
            const oldGoalId = addContext.goalId;
            const oldInitiativeId = addContext.initiativeId;
            const oldQuarter = addContext.quarter;
            const newGoalId = moveInfo.goalId;
            const newInitiativeId = moveInfo.initiativeId;

            if (oldGoalId !== newGoalId || oldInitiativeId !== newInitiativeId) {
              const oldGoal = newData.goals.find(g => g.id === oldGoalId);
              const oldInitiative = oldGoal?.initiatives.find(i => i.id === oldInitiativeId);

              if (oldInitiative) {
                if ('quarters' in activity || oldQuarter === 'spanning') {
                  oldInitiative.spanning = oldInitiative.spanning?.filter(a => a.id !== activity.id) || [];
                } else if (oldQuarter) {
                  const acts = oldInitiative.activities[oldQuarter as keyof typeof oldInitiative.activities];
                  const index = acts.findIndex(a => a.id === activity.id);
                  if (index >= 0) {
                    acts.splice(index, 1);
                  }
                }
              }

              const newGoal = newData.goals.find(g => g.id === newGoalId);
              const newInitiative = newGoal?.initiatives.find(i => i.id === newInitiativeId);

              if (newInitiative) {
                if ('quarters' in activity) {
                  if (!newInitiative.spanning) newInitiative.spanning = [];
                  newInitiative.spanning.push(activity as any);
                } else {
                  const targetQuarter = determineQuarterFromMonth(activity, fiscalConfig);
                  if (!newInitiative.activities[targetQuarter as keyof typeof newInitiative.activities]) {
                    newInitiative.activities[targetQuarter as keyof typeof newInitiative.activities] = [];
                  }
                  newInitiative.activities[targetQuarter as keyof typeof newInitiative.activities].push(activity as any);
                }
              }

              setData(newData);
              setShowAddModal(false);
              setEditingActivity(null);
              return;
            }
          }

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
