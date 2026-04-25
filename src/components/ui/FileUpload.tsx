'use client';
import { useState, useRef, useCallback } from 'react';
interface Props { onFileSelect: (file: File) => void; accept?: string; maxSize?: number; preview?: boolean; className?: string; label?: string; }
export default function FileUpload({ onFileSelect, accept = 'image/*', maxSize = 5, preview = true, className = '', label = 'Upload File' }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback((file: File) => { setError(''); if (file.size > maxSize * 1024 * 1024) { setError(`Max ${maxSize}MB`); return; } if (preview && file.type.startsWith('image/')) { const r = new FileReader(); r.onload = (e) => setPreviewUrl(e.target?.result as string); r.readAsDataURL(file); } onFileSelect(file); }, [maxSize, preview, onFileSelect]);
  return (
    <div className={className}>
      <div onClick={() => inputRef.current?.click()} className="cursor-pointer border-2 border-dashed rounded-xl p-4 text-center border-gray-300 dark:border-gray-600 hover:border-primary-400">
        {previewUrl ? <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg mx-auto" /> : <p className="text-sm text-gray-500">{label}</p>}
        <input ref={inputRef} type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
