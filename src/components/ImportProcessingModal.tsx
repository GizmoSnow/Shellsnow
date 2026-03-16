import { Loader2 } from 'lucide-react';

interface ImportProcessingModalProps {
  isOpen: boolean;
  activityCount: number;
}

export default function ImportProcessingModal({
  isOpen,
  activityCount,
}: ImportProcessingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Import
            </h2>
            <p className="text-gray-600">
              Importing {activityCount} {activityCount === 1 ? 'activity' : 'activities'} to your roadmap...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
