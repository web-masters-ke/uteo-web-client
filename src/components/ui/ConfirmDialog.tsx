'use client';
import Modal from './Modal';
interface Props { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; variant?: 'danger' | 'warning' | 'info'; isLoading?: boolean; }
const btn = { danger: 'bg-red-600 hover:bg-red-700 text-white', warning: 'bg-amber-600 hover:bg-amber-700 text-white', info: 'bg-primary-500 hover:bg-primary-600 text-white' };
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', isLoading = false }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">{cancelText}</button>
        <button onClick={onConfirm} disabled={isLoading} className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${btn[variant]}`}>{isLoading ? 'Loading...' : confirmText}</button>
      </div>
    </Modal>
  );
}
