import { useState, useMemo } from 'react';
import { X, Upload, Check, XCircle, CreditCard as Edit2, AlertCircle, FileText, Filter, CheckSquare, Square, Trash2 } from 'lucide-react';
import type { NormalizedActivityCandidate, SourceType, ActivityType, Owner, Status, Quarter, ImportDiagnostics } from '../lib/import-types';
import { processImportFile, updateCandidate, deleteBatch } from '../lib/import-processor';

interface ImportStagingModalProps {
  roadmapId: string;
  userId: string;
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

export function ImportStagingModal({ roadmapId, userId, onClose, onImportComplete }: ImportStagingModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState<NormalizedActivityCandidate[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<ImportDiagnostics | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedActivityCandidate>>({});
  const [filters, setFilters] = useState<FilterState>({
    sourceType: 'all',
    status: 'all',
    owner: 'all',
    quarter: 'all',
    flaggedOnly: false,
  });

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
        setStep('review');
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

  const handleDelete = async (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleCancel = async () => {
    if (batchId && candidates.length > 0) {
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

  const handleConfirmImport = () => {
    const includedCandidates = candidates.filter(c => c.include);
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

        {step === 'review' && (
          <>
            {diagnostics && (
              <div className="p-4 border-b bg-blue-50">
                <div className="flex items-start gap-2">
                  <FileText size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-2">Import Diagnostics</p>
                    <div className="text-sm text-blue-800 space-y-1">
                      {diagnostics.detectedAdapter && (
                        <p><strong>Detected Format:</strong> {diagnostics.detectedAdapter}</p>
                      )}
                      {diagnostics.dateFields && (
                        <div className="mt-2">
                          <p className="font-semibold">Training Date Mapping:</p>
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
                            <li className="font-semibold mt-1">
                              Selected Field: {diagnostics.dateFields.selectedField}
                            </li>
                          </ul>
                        </div>
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
                    <th className="p-3 w-12"></th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Raw Title</th>
                    <th className="p-3">Suggested Title</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Flags</th>
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

                    return (
                      <tr
                        key={candidate.id}
                        className={`border-b hover:bg-gray-50 ${
                          !candidate.include ? 'opacity-50' : ''
                        }`}
                      >
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
                          {candidate.flags && candidate.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.flags.map((flag, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs"
                                  title={flag}
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
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
