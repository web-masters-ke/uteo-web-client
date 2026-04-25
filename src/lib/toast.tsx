'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast { id: string; type: ToastType; message: string; }

interface ToastContextType { toasts: Toast[]; addToast: (type: ToastType, message: string) => void; removeToast: (id: string) => void; }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, []);

  const colorMap: Record<ToastType, string> = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-200',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg animate-fade-in ${colorMap[toast.type]}`}>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
