'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
interface Props { placeholder?: string; onSearch: (q: string) => void; debounceMs?: number; className?: string; defaultValue?: string; }
export default function SearchBar({ placeholder = 'Search...', onSearch, debounceMs = 400, className = '', defaultValue = '' }: Props) {
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((q: string) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => onSearch(q), debounceMs); }, [onSearch, debounceMs]);
  useEffect(() => { return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input type="text" value={value} onChange={(e) => { setValue(e.target.value); debouncedSearch(e.target.value); }} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" />
      {value && <button onClick={() => { setValue(''); onSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
    </div>
  );
}
