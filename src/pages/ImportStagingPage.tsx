import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Upload, Check, XCircle, CreditCard as Edit2, AlertCircle, FileText, Filter, CheckSquare, Square, Trash2, Ban, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type { NormalizedActivityCandidate, SourceType, ActivityType, Owner, Status, Quarter, ImportDiagnostics } from '../lib/import-types';
import { processImportFile, updateCandidate, deleteBatch, loadCandidatesFromDatabase, updateCandidates } from '../lib/import-processor';
import type { RoadmapData } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/router';
import { supabase } from '../lib/supabase';
import { executeImport } from '../lib/import-executor';
import type { FiscalYearConfig } from '../lib/fiscal-year';

interface ImportStagingPageProps {
  roadmapId: string;
  batchId: string;
}

type FilterState = {
  sourceType: SourceType | 'all';
  status: Status | 'all';
  owner: Owner | 'all';
  quarter: Quarter | 'all';
  flaggedOnly: boolean;
};

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  engagement: '#0176D3',
  support: '#8B46FF',
  training: '#06A59A',
};

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  engagement: 'Engagement',
  support: 'Support',
  training: 'Training',
};

export function ImportStagingPage({ roadmapId, batchId }: ImportStagingPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'summary' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState<NormalizedActivityCandidate[]>([]);
  const [roadmapData, setRoadmapData] = useState<RoadmapData>({ goals: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<ImportDiagnostics | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedActivityCandidate>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [bulkGoalId, setBulkGoalId] = useState<string>('');
  const [fiscalConfig, setFiscalConfig] = useState<FiscalYearConfig>({ startMonth: 1 });
  const [filters, setFilters] = useState<FilterState>({
    sourceType: 'all',
    status: 'all',
    owner: 'all',
    quarter: 'all',
    flaggedOnly: false,
  });

  useEffect(() => {
    loadRoadmapData();
    if (batchId && batchId !== 'new') {
      loadExistingBatch();
    } else if (batchId === 'new') {
      setStep('upload');
    }
  }, [batchId]);

  const loadRoadmapData = async () => {
    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .select('data, fiscal_year_config')
        .eq('id', roadmapId)
        .single();

      if (error) throw error;
      if (data?.data) {
        setRoadmapData(data.data as RoadmapData);
      }
      if (data?.fiscal_year_config) {
        setFiscalConfig(data.fiscal_year_config as FiscalYearConfig);
      }
    } catch (error) {
      console.error('Failed to load roadmap data:', error);
    }
  };

  const loadExistingBatch = async () => {
    if (!batchId) return;

    try {
      setIsProcessing(true);
      const data = await loadCandidatesFromDatabase(batchId);
      setCandidates(data);
      setStep('review');
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to load batch']);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (filters.sourceType !== 'all' && c.sourceType !== filters.sourceType) return false;
      if (filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.owner !== 'all' && c.owner !== filters.owner) return false;
      if (filters.quarter !== 'all' && !c.quarters?.includes(filters.quarter)) return false;
      if (filters.flaggedOnly && (!c.flags || c.flags.length === 0)) return false;
      return true;
    });
  }, [candidates, filters]);

  const includedCandidates = useMemo(() => {
    return filteredCandidates.filter(c => c.include !== false);
  }, [filteredCandidates]);

  const candidatesWithGoals = useMemo(() => {
    return includedCandidates.filter(c => c.destinationGoalId);
  }, [includedCandidates]);

  const candidatesMissingGoals = useMemo(() => {
    return includedCandidates.filter(c => !c.destinationGoalId);
  }, [includedCandidates]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      const result = await processImportFile(file, roadmapId, user!.id);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.diagnostics) {
        setDiagnostics(result.diagnostics);
      }

      if (result.candidates.length > 0) {
        setCandidates(result.candidates);
        setStep('review');
        // Update URL to include the new batch ID and go directly to staging
        navigate(`/import-staging/${roadmapId}/${result.batchId}`);
      } else {
        setErrors(prev => [...prev, 'No valid activities found in file']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleInclude = async (id: string, currentInclude: boolean) => {
    try {
      await updateCandidate(id, { include: !currentInclude });
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, include: !currentInclude } : c))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update');
    }
  };

  const handleBulkToggle = async (included: boolean) => {
    try {
      const updates = filteredCandidates.map(c =>
        updateCandidate(c.id, { include: included })
      );
      await Promise.all(updates);
      setCandidates(prev =>
        prev.map(c => filteredCandidates.find(fc => fc.id === c.id) ? { ...c, include: included } : c)
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to bulk update');
    }
  };

  const handleEdit = (candidate: NormalizedActivityCandidate) => {
    setEditingId(candidate.id);
    setEditForm({
      overrideTitle: candidate.overrideTitle || candidate.normalizedTitle,
      overrideStartDate: candidate.overrideStartDate || candidate.startDate,
      overrideEndDate: candidate.overrideEndDate || candidate.endDate,
      overrideActivityType: candidate.overrideActivityType || candidate.activityType,
      overrideOwner: candidate.overrideOwner || candidate.owner,
      overrideStatus: candidate.overrideStatus || candidate.status,
      destinationGoalId: candidate.destinationGoalId,
      destinationInitiativeId: candidate.destinationInitiativeId,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateCandidate(id, editForm);
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, ...editForm } : c))
      );
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleQuickGoalAssign = async (candidateId: string, goalId: string) => {
    try {
      await updateCandidate(candidateId, { destinationGoalId: goalId || undefined });
      setCandidates(prev =>
        prev.map(c => (c.id === candidateId ? { ...c, destinationGoalId: goalId || undefined } : c))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to assign goal');
    }
  };

  const handleBulkAssignGoal = async () => {
    if (!bulkGoalId) {
      alert('Please select a goal');
      return;
    }

    try {
      const updates = includedCandidates.map(c =>
        updateCandidate(c.id, {
          destinationGoalId: bulkGoalId,
        })
      );
      await Promise.all(updates);
      setCandidates(prev =>
        prev.map(c =>
          includedCandidates.find(ic => ic.id === c.id)
            ? {
                ...c,
                destinationGoalId: bulkGoalId,
              }
            : c
        )
      );
      setBulkGoalId('');
      alert(`Assigned goal to ${includedCandidates.length} activities`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to bulk assign');
    }
  };

  const handleConfirmImport = async () => {
    if (candidatesMissingGoals.length > 0) {
      alert(`Cannot import: ${candidatesMissingGoals.length} selected activities are missing goal assignments`);
      return;
    }

    if (!confirm(`Import ${includedCandidates.length} activities to roadmap?`)) {
      return;
    }

    setIsProcessing(true);

    try {
      const result = await executeImport(batchId, includedCandidates, roadmapData, fiscalConfig);

      await supabase
        .from('roadmaps')
        .update({ data: result.updatedRoadmapData })
        .eq('id', roadmapId);

      let summary = `Import Complete:\n${result.importedCount} imported\n${result.skippedCount} skipped\n${result.failedCount} failed`;

      if (result.errors.length > 0) {
        summary += '\n\nErrors:';
        result.errors.forEach((failed, idx) => {
          summary += `\n${idx + 1}. ${failed.candidate.rawTitle}: ${failed.error}`;
        });
      }

      alert(summary);
      navigate(`/roadmap/${roadmapId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (candidates.length > 0 && includedCandidates.length > 0) {
      const confirmed = confirm('Leave staging? Your candidates will remain saved.');
      if (!confirmed) return;
    }

    navigate(`/import-workspace/${roadmapId}`);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Import Activities
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {step === 'upload' ? 'Upload New Report' : 'Import Staging'}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {step === 'upload'
                ? 'Select a report file to begin importing activities'
                : 'Review, clean, and assign goals to imported activities'}
            </p>
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-12 flex flex-col items-center justify-center">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Choose a file to import</h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Supported formats: CSV, XLSX, XLS
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
              <div className="px-6 py-3 bg-[#0176D3] text-white rounded-lg hover:bg-[#0176D3]/90 transition-colors flex items-center gap-2">
                <Upload size={20} />
                {isProcessing ? 'Processing...' : 'Select File'}
              </div>
            </label>

            {errors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
                <div className="flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 mb-1">Import Errors</p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Step - same as ImportStagingModal */}
        {step === 'summary' && diagnostics && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Parsed Successfully</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{candidates.length}</p>
                  </div>

                  {candidates.filter(c => c.flags && c.flags.length > 0).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">Warnings</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-700">
                        {candidates.filter(c => c.flags && c.flags.length > 0).length}
                      </p>
                    </div>
                  )}

                  {candidates.filter(c => c.errors && c.errors.length > 0).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Errors</span>
                      </div>
                      <p className="text-2xl font-bold text-red-700">
                        {candidates.filter(c => c.errors && c.errors.length > 0).length}
                      </p>
                    </div>
                  )}
                </div>

                {/* Diagnostics details - keeping it concise for brevity */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-4 text-lg">Import Diagnostics</h3>
                      <div className="space-y-2 text-sm text-blue-800">
                        {diagnostics.detectedAdapter && (
                          <div>
                            <strong>Detected Format:</strong> {diagnostics.detectedAdapter}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Upload
              </button>
              <button
                onClick={() => setStep('review')}
                className="px-6 py-2 bg-[#0176D3] text-white rounded-lg hover:bg-[#0176D3]/90 transition-colors flex items-center gap-2"
              >
                Continue to Staging Area
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <>
            {/* Validation Banner */}
            {candidatesMissingGoals.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900">Goal Assignment Required</h3>
                    <p className="text-sm text-yellow-800 mt-1">
                      <strong>{candidatesMissingGoals.length}</strong> of <strong>{includedCandidates.length}</strong> selected activities are missing goal assignments.
                      Assign goals to all selected activities before importing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleBulkToggle(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Select All ({filteredCandidates.length})
                  </button>
                  <button
                    onClick={() => handleBulkToggle(false)}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkGoalId}
                    onChange={(e) => setBulkGoalId(e.target.value)}
                    className="px-3 py-1.5 border rounded text-sm"
                  >
                    <option value="">Select goal...</option>
                    {roadmapData.goals.map(goal => (
                      <option key={goal.id} value={goal.id}>{goal.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssignGoal}
                    disabled={!bulkGoalId || includedCandidates.length === 0}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign to {includedCandidates.length} Selected
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Include</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Title</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Normalized Title</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Goal</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCandidates.map(candidate => {
                      const isEditing = editingId === candidate.id;
                      const isExpanded = expandedRows.has(candidate.id);
                      const hasWarnings = candidate.flags && candidate.flags.length > 0;
                      const hasErrors = candidate.errors && candidate.errors.length > 0;
                      const displayTitle = candidate.overrideTitle || candidate.normalizedTitle;
                      const displayStartDate = candidate.overrideStartDate || candidate.startDate;
                      const displayEndDate = candidate.overrideEndDate || candidate.endDate;
                      const goalId = isEditing ? editForm.destinationGoalId : candidate.destinationGoalId;
                      const selectedGoal = roadmapData.goals.find(g => g.id === goalId);

                      return (
                        <>
                          <tr key={candidate.id} className={`${hasWarnings ? 'bg-yellow-50' : hasErrors ? 'bg-red-50' : ''}`}>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleExpand(candidate.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </button>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleInclude(candidate.id, candidate.include !== false)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {candidate.include !== false ? (
                                  <CheckSquare size={20} />
                                ) : (
                                  <Square size={20} />
                                )}
                              </button>
                            </td>
                            <td className="p-3">
                              <span
                                className="px-2 py-1 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: SOURCE_TYPE_COLORS[candidate.sourceType] }}
                              >
                                {SOURCE_TYPE_LABELS[candidate.sourceType]}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-gray-600">{candidate.rawTitle}</td>
                            <td className="p-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.overrideTitle || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, overrideTitle: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              ) : (
                                <span className="text-sm font-medium">{displayTitle}</span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {isEditing ? (
                                <div className="flex gap-1 flex-col">
                                  <input
                                    type="date"
                                    value={editForm.overrideStartDate || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, overrideStartDate: e.target.value }))}
                                    className="px-2 py-1 border rounded text-xs"
                                  />
                                  <input
                                    type="date"
                                    value={editForm.overrideEndDate || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, overrideEndDate: e.target.value }))}
                                    className="px-2 py-1 border rounded text-xs"
                                  />
                                </div>
                              ) : (
                                <>
                                  {displayStartDate && <div>{displayStartDate}</div>}
                                  {displayEndDate && displayEndDate !== displayStartDate && (
                                    <div className="text-gray-500">to {displayEndDate}</div>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing ? (
                                <select
                                  value={editForm.destinationGoalId || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, destinationGoalId: e.target.value || undefined }))}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="">Select goal...</option>
                                  {roadmapData.goals.map(goal => (
                                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={candidate.destinationGoalId || ''}
                                  onChange={(e) => handleQuickGoalAssign(candidate.id, e.target.value)}
                                  className={`w-full px-2 py-1 border rounded text-sm ${!candidate.destinationGoalId ? 'border-red-300 bg-red-50 text-red-900 font-semibold' : 'border-gray-300'}`}
                                >
                                  <option value="" className="text-red-600">Required - Select goal...</option>
                                  {roadmapData.goals.map(goal => (
                                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSaveEdit(candidate.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Save"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Cancel"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEdit(candidate)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-4 bg-gray-50">
                                <div className="space-y-3 text-sm">
                                  {hasErrors && (
                                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3">
                                      <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="font-semibold text-red-900">Validation Errors</div>
                                        <ul className="text-red-800 mt-1 space-y-1 ml-4">
                                          {candidate.errors!.map((error, idx) => (
                                            <li key={idx} className="list-disc">{error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}

                                  {hasWarnings && (
                                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                                      <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="font-semibold text-yellow-900">Warnings</div>
                                        <ul className="text-yellow-800 mt-1 space-y-1 ml-4">
                                          {candidate.flags!.map((warning, idx) => (
                                            <li key={idx} className="list-disc">{warning}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>

                {filteredCandidates.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No activities match the current filters
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{candidatesWithGoals.length}</span> of {includedCandidates.length} activities ready to import
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-[#0176D3] text-white rounded-lg hover:bg-[#0176D3]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={candidatesMissingGoals.length > 0 || includedCandidates.length === 0}
                  title={candidatesMissingGoals.length > 0 ? 'All selected activities must have goal assignments' : ''}
                >
                  <Check size={20} />
                  Import {candidatesWithGoals.length} Activities
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
