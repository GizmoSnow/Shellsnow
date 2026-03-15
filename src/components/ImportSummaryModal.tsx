import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { ImportSummary } from '../lib/import-types';

interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ImportSummary;
}

export function ImportSummaryModal({ isOpen, onClose, summary }: ImportSummaryModalProps) {
  if (!isOpen) return null;

  const totalProcessed = summary.importedCount + summary.ignoredCount + summary.skippedCount + summary.failedCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Summary</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Imported</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{summary.importedCount}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Info size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Ignored</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">{summary.ignoredCount}</p>
            </div>

            {summary.skippedCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={18} className="text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Skipped</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{summary.skippedCount}</p>
              </div>
            )}

            {summary.failedCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={18} className="text-red-600" />
                  <span className="text-sm font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{summary.failedCount}</p>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-6">
            Processed {totalProcessed} of {totalProcessed} rows
          </div>

          {summary.skippedRows && summary.skippedRows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-600" />
                Skipped Rows ({summary.skippedRows.length})
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {summary.skippedRows.map((row, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium text-yellow-900">
                      Row {row.rowNumber}: {row.title}
                    </div>
                    <div className="text-yellow-700 text-xs mt-0.5">{row.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.failedRows && summary.failedRows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                Failed Rows ({summary.failedRows.length})
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                {summary.failedRows.map((row, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium text-red-900">
                      Row {row.rowNumber}: {row.title}
                    </div>
                    <ul className="text-red-700 text-xs mt-1 ml-4 space-y-0.5">
                      {row.errors.map((error, errorIdx) => (
                        <li key={errorIdx} className="list-disc">{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
