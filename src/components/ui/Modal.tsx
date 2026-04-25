'use client';
import { useEffect, useRef } from 'react';
interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }
const sz = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; if (isOpen) { document.addEventListener('keydown', fn); document.body.style.overflow = 'hidden'; } return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; }; }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[5vh] pb-[5vh] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className={`${sz[size]} w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl animate-fade-in my-auto max-h-[90vh] flex flex-col`}>
        {title && <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3><button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
