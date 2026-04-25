'use client';
export default function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const getPages = (): (number | string)[] => { const pages: (number | string)[] = []; for (let i = 1; i <= totalPages; i++) { if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) pages.push(i); else if (pages[pages.length - 1] !== '...') pages.push('...'); } return pages; };
  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
      {getPages().map((page, idx) => page === '...' ? <span key={`e-${idx}`} className="px-2 text-gray-400">...</span> : <button key={page} onClick={() => onPageChange(page as number)} className={`w-10 h-10 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{page}</button>)}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
    </div>
  );
}
