import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ImportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activityCount: number;
  missingGoalsCount?: number;
}

export default function ImportConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  activityCount,
  missingGoalsCount = 0,
}: ImportConfirmModalProps) {
  if (!isOpen) return null;

  const hasIssues = missingGoalsCount > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {hasIssues ? (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {hasIssues ? 'Cannot Import' : 'Confirm Import'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {hasIssues ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                {missingGoalsCount} {missingGoalsCount === 1 ? 'activity is' : 'activities are'} missing goal assignments and cannot be imported.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  Please assign all selected activities to goals before importing.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">
              Import {activityCount} {activityCount === 1 ? 'activity' : 'activities'} to your roadmap?
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {hasIssues ? 'Close' : 'Cancel'}
          </button>
          {!hasIssues && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
