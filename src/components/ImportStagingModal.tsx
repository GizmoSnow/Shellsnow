import { useState, useMemo, useEffect } from 'react';
import { X, Upload, Check, XCircle, CreditCard as Edit2, AlertCircle, FileText, Filter, CheckSquare, Square, Trash2, Ban, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type { NormalizedActivityCandidate, SourceType, ActivityType, Owner, Status, Quarter, ImportDiagnostics } from '../lib/import-types';
import { processImportFile, updateCandidate, deleteBatch, loadCandidatesFromDatabase, updateCandidates } from '../lib/import-processor';
import type { RoadmapData } from '../lib/supabase';

interface ImportStagingModalProps {
  roadmapId: string;
  userId: string;
  batchId?: string;
  roadmapData: RoadmapData;
  onClose: () => void;
  onImportComplete: (batchId: string, candidates: NormalizedActivityCandidate[]) => void;
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

export function ImportStagingModal({ roadmapId, userId, batchId: existingBatchId, roadmapData, onClose, onImportComplete }: ImportStagingModalProps) {
  const [step, setStep] = useState<'upload' | 'summary' | 'review'>(existingBatchId ? 'review' : 'upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState<NormalizedActivityCandidate[]>([]);
  const [batchId, setBatchId] = useState<string>(existingBatchId || '');
  const [errors, setErrors] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<ImportDiagnostics | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedActivityCandidate>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    sourceType: 'all',
    status: 'all',
    owner: 'all',
    quarter: 'all',
    flaggedOnly: false,
  });

  useEffect(() => {
    if (existingBatchId) {
      loadExistingBatch();
    }
  }, [existingBatchId]);

  const loadExistingBatch = async () => {
    if (!existingBatchId) return;

    try {
      setIsProcessing(true);
      const data = await loadCandidatesFromDatabase(existingBatchId);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      const result = await processImportFile(file, roadmapId, userId);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.diagnostics) {
        setDiagnostics(result.diagnostics);
      }

      if (result.candidates.length > 0) {
        setBatchId(result.batchId);
        setCandidates(result.candidates);
        setStep('summary');
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
      goalId: candidate.goalId,
      initiativeId: candidate.initiativeId,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      // Calculate month values from override dates if provided
      const updates: any = { ...editForm };

      if (editForm.overrideStartDate) {
        const startDate = new Date(editForm.overrideStartDate);
        updates.overrideStartMonth = startDate.getMonth();
      }

      if (editForm.overrideEndDate) {
        const endDate = new Date(editForm.overrideEndDate);
        updates.overrideEndMonth = endDate.getMonth();
      }

      await updateCandidate(id, updates);
      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await updateCandidate(id, { isDeleted: true });
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedIds.size === 0) {
      alert('No items selected');
      return;
    }

    try {
      await updateCandidates(Array.from(selectedIds), {
        importStatus: 'ignored',
        include: false
      });
      setCandidates(prev =>
        prev.map(c => selectedIds.has(c.id)
          ? { ...c, importStatus: 'ignored', include: false }
          : c
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to ignore items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('No items selected');
      return;
    }

    if (!confirm(`Permanently delete ${selectedIds.size} items?`)) {
      return;
    }

    try {
      await updateCandidates(Array.from(selectedIds), { isDeleted: true });
      setCandidates(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete items');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleCancel = async () => {
    if (batchId && candidates.length > 0 && !existingBatchId) {
      if (confirm('Discard this import batch?')) {
        try {
          await deleteBatch(batchId);
          onClose();
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Failed to cancel');
        }
      }
    } else {
      onClose();
    }
  };

  const handleConfirmImport = async () => {
    const includedCandidates = candidates.filter(c => c.include && c.importStatus !== 'imported');
    if (includedCandidates.length === 0) {
      alert('No activities selected for import');
      return;
    }
    onImportComplete(batchId, includedCandidates);
  };

  const includedCount = filteredCandidates.filter(c => c.include).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Import Activities</h2>
            <p className="text-gray-600 text-sm mt-1">
              Upload CSV or Excel files from OrgCS Engagement, Org62 Support, or Org62 Training reports
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-8 flex-1 flex flex-col items-center justify-center">
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

        {step === 'summary' && diagnostics && (
          <div className="p-8 flex-1 overflow-y-auto">
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

              {/* Diagnostics Panel */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-4 text-lg">Import Diagnostics</h3>
                    <div className="space-y-4 text-sm text-blue-800">
                      {diagnostics.detectedAdapter && (
                        <div>
                          <strong>Detected Format:</strong> {diagnostics.detectedAdapter}
                        </div>
                      )}

                      {diagnostics.adapterScores && diagnostics.adapterScores.length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Adapter Score Breakdown ({diagnostics.adapterScores.length} tested)
                          </summary>
                          <div className="ml-4 mt-2 space-y-1">
                            {diagnostics.adapterScores
                              .sort((a, b) => b.score - a.score)
                              .map((adapter, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-32">{adapter.adapterName}:</div>
                                  <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600"
                                      style={{ width: `${Math.min(adapter.confidence * 100, 100)}%` }}
                                    />
                                  </div>
                                  <div className="w-16 text-right">{adapter.score}</div>
                                </div>
                              ))}
                          </div>
                        </details>
                      )}

                      {diagnostics.normalizedHeaders && diagnostics.normalizedHeaders.length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Detected Headers ({diagnostics.normalizedHeaders.length})
                          </summary>
                          <div className="ml-4 mt-1 text-xs font-mono bg-blue-100 p-2 rounded max-h-32 overflow-y-auto">
                            {diagnostics.rawHeaders?.join(', ')}
                          </div>
                        </details>
                      )}

                      {diagnostics.sampleMappedValues && Object.keys(diagnostics.sampleMappedValues).length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Sample Data (first row)
                          </summary>
                          <div className="ml-4 mt-2 space-y-1 text-xs max-h-48 overflow-y-auto">
                            {Object.entries(diagnostics.sampleMappedValues).slice(0, 10).map(([key, value], idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="font-semibold w-40 flex-shrink-0">{key}:</span>
                                <span className="text-blue-700">{value}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {diagnostics.warnings && diagnostics.warnings.length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Processing Warnings ({diagnostics.warnings.length})
                          </summary>
                          <ul className="ml-4 mt-2 space-y-1 text-xs list-disc list-inside">
                            {diagnostics.warnings.map((warning, idx) => (
                              <li key={idx} className="text-yellow-700">{warning}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {diagnostics.errors && diagnostics.errors.length > 0 && (
                        <details className="mt-2 bg-red-50 border border-red-200 rounded p-3">
                          <summary className="font-semibold cursor-pointer hover:text-red-900 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Processing Errors ({diagnostics.errors.length})
                          </summary>
                          <ul className="ml-4 mt-2 space-y-1 text-xs list-disc list-inside">
                            {diagnostics.errors.map((error, idx) => (
                              <li key={idx} className="text-red-700">{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Summary */}
              {candidates.filter(c => c.flags && c.flags.length > 0).length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-2 text-lg">
                        Activity Warnings ({candidates.filter(c => c.flags && c.flags.length > 0).length})
                      </h3>
                      <p className="text-sm text-yellow-800 mb-3">
                        Some activities have warnings. You can review and fix these in the staging area.
                      </p>
                      <details className="text-sm">
                        <summary className="font-semibold cursor-pointer hover:text-yellow-900">
                          View all warnings
                        </summary>
                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                          {candidates
                            .filter(c => c.flags && c.flags.length > 0)
                            .map((c, idx) => (
                              <div key={idx} className="bg-yellow-100 rounded p-2">
                                <div className="font-medium text-yellow-900">{c.normalizedTitle}</div>
                                <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc list-inside">
                                  {c.flags?.map((flag, fIdx) => (
                                    <li key={fIdx}>{flag}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Summary */}
              {candidates.filter(c => c.errors && c.errors.length > 0).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-2 text-lg">
                        Activity Errors ({candidates.filter(c => c.errors && c.errors.length > 0).length})
                      </h3>
                      <p className="text-sm text-red-800 mb-3">
                        Some activities have critical errors and may not import correctly.
                      </p>
                      <details className="text-sm">
                        <summary className="font-semibold cursor-pointer hover:text-red-900">
                          View all errors
                        </summary>
                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                          {candidates
                            .filter(c => c.errors && c.errors.length > 0)
                            .map((c, idx) => (
                              <div key={idx} className="bg-red-100 rounded p-2">
                                <div className="font-medium text-red-900">{c.normalizedTitle}</div>
                                <ul className="text-xs text-red-700 mt-1 ml-4 list-disc list-inside">
                                  {c.errors?.map((error, eIdx) => (
                                    <li key={eIdx}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div className="p-6 border-t flex items-center justify-between bg-gray-50">
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
        )}

        {step === 'review' && (
          <>
            {diagnostics && (
              <div className="p-4 border-b bg-blue-50">
                <div className="flex items-start gap-2">
                  <FileText size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-2">Import Diagnostics</p>
                    <div className="text-sm text-blue-800 space-y-3">
                      {diagnostics.detectedAdapter && (
                        <p><strong>Detected Format:</strong> {diagnostics.detectedAdapter}</p>
                      )}

                      {diagnostics.adapterScores && diagnostics.adapterScores.length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Adapter Score Breakdown ({diagnostics.adapterScores.length} tested)
                          </summary>
                          <div className="ml-4 mt-2 space-y-1">
                            {diagnostics.adapterScores
                              .sort((a, b) => b.score - a.score)
                              .map((adapter, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-32">{adapter.adapterName}:</div>
                                  <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600"
                                      style={{ width: `${Math.min(adapter.confidence * 100, 100)}%` }}
                                    />
                                  </div>
                                  <div className="w-16 text-right">{adapter.score}</div>
                                </div>
                              ))}
                          </div>
                        </details>
                      )}

                      {diagnostics.normalizedHeaders && diagnostics.normalizedHeaders.length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Detected Headers ({diagnostics.normalizedHeaders.length})
                          </summary>
                          <div className="ml-4 mt-1 text-xs font-mono bg-blue-100 p-2 rounded max-h-32 overflow-y-auto">
                            {diagnostics.rawHeaders?.join(', ')}
                          </div>
                        </details>
                      )}

                      {diagnostics.sampleMappedValues && Object.keys(diagnostics.sampleMappedValues).length > 0 && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Sample Data (first row)
                          </summary>
                          <div className="ml-4 mt-2 space-y-1 text-xs max-h-48 overflow-y-auto">
                            {Object.entries(diagnostics.sampleMappedValues).slice(0, 10).map(([key, value], idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="font-semibold w-40 flex-shrink-0">{key}:</span>
                                <span className="text-blue-700">{value}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {diagnostics.dateFields && (
                        <details className="mt-2">
                          <summary className="font-semibold cursor-pointer hover:text-blue-900">
                            Date Field Mapping
                          </summary>
                          <ul className="ml-4 mt-1 space-y-0.5">
                            {diagnostics.dateFields.completionDate && (
                              <li>Completion Date: {diagnostics.dateFields.completionDate}</li>
                            )}
                            {diagnostics.dateFields.sessionDate && (
                              <li>Session Date: {diagnostics.dateFields.sessionDate}</li>
                            )}
                            {diagnostics.dateFields.enrollmentDate && (
                              <li>Enrollment/Start Date: {diagnostics.dateFields.enrollmentDate}</li>
                            )}
                            {diagnostics.dateFields.endDate && (
                              <li>End Date: {diagnostics.dateFields.endDate}</li>
                            )}
                            <li className="font-semibold mt-1 text-blue-900">
                              ✓ Selected Field: {diagnostics.dateFields.selectedField}
                            </li>
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <span className="text-sm font-semibold">Filters:</span>
                </div>

                <select
                  value={filters.sourceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value as any }))}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="engagement">Engagement</option>
                  <option value="support">Support</option>
                  <option value="training">Training</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={filters.owner}
                  onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value as any }))}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  <option value="all">All Owners</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="partner">Partner</option>
                  <option value="customer">Customer</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.flaggedOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, flaggedOnly: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Flagged Only</span>
                </label>

                <div className="ml-auto flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-sm font-medium">{selectedIds.size} selected</span>
                      <select
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          try {
                            await updateCandidates(Array.from(selectedIds), { goalId: e.target.value, initiativeId: undefined });
                            setCandidates(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, goalId: e.target.value, initiativeId: undefined } : c));
                            e.target.value = '';
                          } catch (error) {
                            alert(error instanceof Error ? error.message : 'Failed to update');
                          }
                        }}
                        className="px-3 py-1.5 text-sm border rounded"
                      >
                        <option value="">Assign Goal...</option>
                        {roadmapData.goals.map(goal => (
                          <option key={goal.id} value={goal.id}>
                            {goal.number} - {goal.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkIgnore}
                        className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors flex items-center gap-1"
                      >
                        <Ban size={14} />
                        Ignore Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete Selected
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleBulkToggle(true)}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                  >
                    Include All
                  </button>
                  <button
                    onClick={() => handleBulkToggle(false)}
                    className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                  >
                    Exclude All
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                    <th className="p-3 w-8"></th>
                    <th className="p-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 w-12"></th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Raw Title</th>
                    <th className="p-3">Suggested Title</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Goal</th>
                    <th className="p-3">Initiative</th>
                    <th className="p-3">Diagnostics</th>
                    <th className="p-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const isEditing = editingId === candidate.id;
                    const displayTitle = candidate.overrideTitle || candidate.normalizedTitle;
                    const displayStartDate = candidate.overrideStartDate || candidate.startDate;
                    const displayEndDate = candidate.overrideEndDate || candidate.endDate;
                    const displayActivityType = candidate.overrideActivityType || candidate.activityType;
                    const displayOwner = candidate.overrideOwner || candidate.owner;
                    const displayStatus = candidate.overrideStatus || candidate.status;
                    const isExpanded = expandedRows.has(candidate.id);
                    const hasErrors = candidate.errors && candidate.errors.length > 0;
                    const hasWarnings = candidate.warnings && candidate.warnings.length > 0;
                    const hasSkipReason = !!candidate.skipReason;
                    const hasDuplicate = candidate.duplicateDetection?.isDuplicate;
                    const hasDiagnostics = hasErrors || hasWarnings || hasSkipReason || hasDuplicate;

                    return (
                      <>
                        <tr
                          key={candidate.id}
                          className={`border-b hover:bg-gray-50 ${
                            !candidate.include ? 'opacity-50' : ''
                          } ${candidate.importStatus === 'ignored' ? 'bg-orange-50' : ''} ${candidate.importStatus === 'imported' ? 'bg-green-50' : ''} ${hasErrors ? 'bg-red-50' : ''}`}
                        >
                          <td className="p-3">
                            {hasDiagnostics && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedRows);
                                  if (isExpanded) {
                                    newExpanded.delete(candidate.id);
                                  } else {
                                    newExpanded.add(candidate.id);
                                  }
                                  setExpandedRows(newExpanded);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(candidate.id)}
                              onChange={() => toggleSelection(candidate.id)}
                              className="rounded"
                            />
                          </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleInclude(candidate.id, candidate.include)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {candidate.include ? (
                              <CheckSquare size={20} className="text-green-600" />
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
                              value={editForm.overrideActivityType || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, overrideActivityType: e.target.value as ActivityType }))}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="standard">Standard</option>
                              <option value="spanning">Spanning</option>
                              <option value="quarter">Quarter</option>
                            </select>
                          ) : (
                            <span className="text-sm capitalize">{displayActivityType}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.overrideOwner || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, overrideOwner: e.target.value as Owner }))}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="salesforce">Salesforce</option>
                              <option value="partner">Partner</option>
                              <option value="customer">Customer</option>
                            </select>
                          ) : (
                            <span className="text-sm capitalize">{displayOwner}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.overrideStatus || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, overrideStatus: e.target.value as Status }))}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span className="text-sm capitalize">{displayStatus?.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.goalId || ''}
                              onChange={(e) => {
                                const goalId = e.target.value || undefined;
                                setEditForm(prev => ({ ...prev, goalId, initiativeId: undefined }));
                              }}
                              className="px-2 py-1 border rounded text-sm w-full"
                            >
                              <option value="">Select Goal...</option>
                              {roadmapData.goals.map(goal => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.number} - {goal.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm">
                              {candidate.goalId
                                ? roadmapData.goals.find(g => g.id === candidate.goalId)?.title || 'Unknown'
                                : <span className="text-red-600 font-medium">Required</span>
                              }
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editForm.initiativeId || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, initiativeId: e.target.value || undefined }))}
                              className="px-2 py-1 border rounded text-sm w-full"
                              disabled={!editForm.goalId}
                            >
                              <option value="">None</option>
                              {editForm.goalId && roadmapData.goals.find(g => g.id === editForm.goalId)?.initiatives.map(initiative => (
                                <option key={initiative.id} value={initiative.id}>
                                  {initiative.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm">
                              {candidate.initiativeId && candidate.goalId
                                ? roadmapData.goals.find(g => g.id === candidate.goalId)?.initiatives.find(i => i.id === candidate.initiativeId)?.label || '-'
                                : '-'
                              }
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {hasErrors && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs flex items-center gap-1">
                                <XCircle size={12} />
                                {candidate.errors!.length} error{candidate.errors!.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {hasWarnings && (
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {candidate.warnings!.length} warning{candidate.warnings!.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {hasDuplicate && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs flex items-center gap-1">
                                <AlertCircle size={12} />
                                Duplicate
                              </span>
                            )}
                            {candidate.flags && candidate.flags.length > 0 && candidate.flags.map((flag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                                title={flag}
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(candidate.id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditForm({});
                                  }}
                                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                  title="Cancel"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(candidate)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(candidate.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && hasDiagnostics && (
                        <tr key={`${candidate.id}-details`} className="bg-gray-50 border-b">
                          <td colSpan={11} className="p-4">
                            <div className="space-y-3 text-sm">
                              {hasSkipReason && (
                                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                                  <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-yellow-900">Skipped</div>
                                    <div className="text-yellow-800 mt-1">{candidate.skipReason}</div>
                                  </div>
                                </div>
                              )}

                              {hasDuplicate && (
                                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded p-3">
                                  <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-orange-900">
                                      Duplicate Detected ({candidate.duplicateDetection!.matchType?.replace('_', ' ')})
                                    </div>
                                    <div className="text-orange-800 mt-1">
                                      {candidate.duplicateDetection!.matchDetails}
                                    </div>
                                  </div>
                                </div>
                              )}

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
                                      {candidate.warnings!.map((warning, idx) => (
                                        <li key={idx} className="list-disc">{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {candidate.validationDetails && (
                                <details className="bg-blue-50 border border-blue-200 rounded p-3">
                                  <summary className="font-semibold text-blue-900 cursor-pointer">
                                    Validation Details
                                  </summary>
                                  <div className="text-blue-800 mt-2 text-xs space-y-1">
                                    <div>Valid: {candidate.validationDetails.isValid ? 'Yes' : 'No'}</div>
                                    {candidate.validationDetails.missingRequired && (
                                      <div>Missing: {candidate.validationDetails.missingRequired.join(', ')}</div>
                                    )}
                                  </div>
                                </details>
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

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{includedCount}</span> of {filteredCandidates.length} activities selected for import
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
                  className="px-4 py-2 bg-[#0176D3] text-white rounded-lg hover:bg-[#0176D3]/90 transition-colors flex items-center gap-2"
                  disabled={includedCount === 0}
                >
                  <Check size={20} />
                  Import {includedCount} Activities
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
