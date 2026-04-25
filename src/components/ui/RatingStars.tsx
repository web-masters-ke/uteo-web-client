'use client';
interface RatingStarsProps { rating: number; maxRating?: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onChange?: (r: number) => void; showValue?: boolean; className?: string; }
const sz = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
export default function RatingStars({ rating, maxRating = 5, size = 'md', interactive = false, onChange, showValue = false, className = '' }: RatingStarsProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i + 1 <= Math.floor(rating);
        return (
          <button key={i} type="button" disabled={!interactive} onClick={() => interactive && onChange?.(i + 1)} className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}>
            <svg className={sz[size]} viewBox="0 0 24 24" fill={filled ? '#F77B0F' : '#D1D5DB'}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className={`${!filled ? 'dark:fill-gray-600' : ''}`} />
            </svg>
          </button>
        );
      })}
      {showValue && <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">{Number(rating || 0).toFixed(1)}</span>}
    </div>
  );
}
