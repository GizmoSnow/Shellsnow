import { AlertTriangle } from 'lucide-react';

interface ResetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetConfirmationModal({ isOpen, onClose, onConfirm }: ResetConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 md:p-8 w-full max-w-[440px] animate-modalIn" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
              Reset to Default Template?
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This will delete <strong>ALL</strong> your goals, activities, and customizations and reset to a blank template. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-transparent rounded-lg font-semibold transition-colors"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}
