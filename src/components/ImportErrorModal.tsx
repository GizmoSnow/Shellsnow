import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ImportError {
  candidate: {
    rawTitle: string;
  };
  error: string;
}

interface ImportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: ImportError[];
  onReturnToStaging?: () => void;
  onNavigateToRoadmap?: () => void;
}

export default function ImportErrorModal({
  isOpen,
  onClose,
  importedCount,
  skippedCount,
  failedCount,
  errors,
  onReturnToStaging,
  onNavigateToRoadmap,
}: ImportErrorModalProps) {
  if (!isOpen) return null;

  const hasSuccess = importedCount > 0;
  const hasFailures = failedCount > 0;
  const isPartialSuccess = hasSuccess && hasFailures;
  const isCompleteFailure = !hasSuccess && hasFailures;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isCompleteFailure && (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            )}
            {isPartialSuccess && (
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            )}
            {hasSuccess && !hasFailures && (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {isCompleteFailure && 'Import Failed'}
              {isPartialSuccess && 'Import Partially Complete'}
              {hasSuccess && !hasFailures && 'Import Complete'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{importedCount}</div>
              <div className="text-sm text-green-600">Imported</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{skippedCount}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-700">{failedCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>

          {hasFailures && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Issues Found
              </h3>
              <div className="space-y-2">
                {errors.map((failed, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      {failed.candidate.rawTitle}
                    </div>
                    <div className="text-sm text-red-700">
                      {formatErrorMessage(failed.error)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSuccess && !hasFailures && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-gray-700">
                All activities were successfully imported to your roadmap!
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {hasFailures && onReturnToStaging && (
            <button
              onClick={onReturnToStaging}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fix Issues
            </button>
          )}
          {hasSuccess && onNavigateToRoadmap && (
            <button
              onClick={onNavigateToRoadmap}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Roadmap
            </button>
          )}
          {!hasSuccess && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatErrorMessage(error: string): string {
  if (error.includes('Missing required field: date')) {
    return 'This activity is missing a date. Please add a start date before importing.';
  }
  if (error.includes('Missing required fields: title or owner')) {
    return 'This activity is missing required information (title or owner).';
  }
  if (error.includes('Goal required before import')) {
    return 'Please assign this activity to a goal before importing.';
  }
  if (error.includes('Selected goal not found')) {
    return 'The selected goal could not be found. Please choose a different goal.';
  }
  if (error.includes('Initiative required for selected goal')) {
    return 'The selected goal requires an initiative to be chosen.';
  }
  return error;
}
