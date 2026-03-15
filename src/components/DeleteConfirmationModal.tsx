import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roadmapTitle: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  roadmapTitle
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl max-w-md w-full p-6"
        style={{ background: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-6">
          <div
            className="p-3 rounded-full flex-shrink-0"
            style={{ background: 'rgba(232, 25, 75, 0.1)' }}
          >
            <AlertTriangle size={24} style={{ color: '#e8194b' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Delete Roadmap?
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <span className="font-semibold" style={{ color: 'var(--text)' }}>"{roadmapTitle}"</span>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold transition-colors border"
            style={{
              color: 'var(--text)',
              borderColor: 'var(--border)',
              background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-white rounded-lg font-semibold transition-all"
            style={{ background: '#e8194b' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c71540'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#e8194b'}
          >
            Delete Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
