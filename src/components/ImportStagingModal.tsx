import { useState, useEffect } from 'react';
import { X, Upload, Check, XCircle, CreditCard as Edit2, AlertCircle, FileText } from 'lucide-react';
import type { NormalizedActivityCandidate } from '../lib/import-types';
import { processImportFile, loadCandidatesFromDatabase, updateCandidate, deleteBatch } from '../lib/import-processor';

interface ImportStagingModalProps {
  roadmapId: string;
  userId: string;
  onClose: () => void;
  onImportComplete: (batchId: string, candidates: NormalizedActivityCandidate[]) => void;
}

export function ImportStagingModal({ roadmapId, userId, onClose, onImportComplete }: ImportStagingModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState<NormalizedActivityCandidate[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedActivityCandidate>>({});

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

  const handleEdit = (candidate: NormalizedActivityCandidate) => {
    setEditingId(candidate.id);
    setEditForm({
      overrideTitle: candidate.overrideTitle || candidate.normalizedTitle,
      overrideStartDate: candidate.overrideStartDate || candidate.startDate,
      overrideEndDate: candidate.overrideEndDate || candidate.endDate,
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
      alert('Please select at least one activity to import');
      return;
    }
    onImportComplete(batchId, includedCandidates);
  };

  const includedCount = candidates.filter(c => c.include).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Import Activities</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-8 flex-1 flex flex-col items-center justify-center">
            <Upload size={64} className="text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Report File</h3>
            <p className="text-gray-600 mb-6 text-center">
              Supports: OrgCS Engagement Report, Org62 Support Report, Org62 Training Report
            </p>

            <label className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              {isProcessing ? 'Processing...' : 'Choose CSV File'}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>

            {errors.length > 0 && (
              <div className="mt-6 w-full max-w-2xl bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Errors
                </h4>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <>
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Found <strong>{candidates.length}</strong> activities
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>{includedCount}</strong> selected for import
                  </p>
                </div>
                {errors.length > 0 && (
                  <div className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {errors.length} warnings
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    isEditing={editingId === candidate.id}
                    editForm={editForm}
                    onToggleInclude={handleToggleInclude}
                    onEdit={handleEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onEditFormChange={setEditForm}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={includedCount === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {includedCount} {includedCount === 1 ? 'Activity' : 'Activities'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CandidateRowProps {
  candidate: NormalizedActivityCandidate;
  isEditing: boolean;
  editForm: Partial<NormalizedActivityCandidate>;
  onToggleInclude: (id: string, currentInclude: boolean) => void;
  onEdit: (candidate: NormalizedActivityCandidate) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditFormChange: (form: Partial<NormalizedActivityCandidate>) => void;
}

function CandidateRow({
  candidate,
  isEditing,
  editForm,
  onToggleInclude,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditFormChange,
}: CandidateRowProps) {
  const displayTitle = candidate.overrideTitle || candidate.normalizedTitle;
  const displayStartDate = candidate.overrideStartDate || candidate.startDate;
  const displayEndDate = candidate.overrideEndDate || candidate.endDate;

  const hasFlags = candidate.flags && candidate.flags.length > 0;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        candidate.include ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={candidate.include}
          onChange={() => onToggleInclude(candidate.id, candidate.include)}
          className="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.overrideTitle || ''}
                onChange={(e) => onEditFormChange({ ...editForm, overrideTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Activity title"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={editForm.overrideStartDate || ''}
                  onChange={(e) => onEditFormChange({ ...editForm, overrideStartDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  value={editForm.overrideEndDate || ''}
                  onChange={(e) => onEditFormChange({ ...editForm, overrideEndDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSaveEdit(candidate.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-gray-900">{displayTitle}</h3>
                <button
                  onClick={() => onEdit(candidate)}
                  className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  <span className="capitalize">{candidate.sourceType}</span>
                </div>
                {displayStartDate && (
                  <span>Start: {new Date(displayStartDate).toLocaleDateString()}</span>
                )}
                {displayEndDate && (
                  <span>End: {new Date(displayEndDate).toLocaleDateString()}</span>
                )}
                {candidate.status && (
                  <span className="capitalize">{candidate.status.replace('_', ' ')}</span>
                )}
              </div>

              {hasFlags && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {candidate.flags!.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded"
                    >
                      {flag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
