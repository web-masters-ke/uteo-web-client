"use client";

export default function RatingStars({
  rating,
  onRate,
  size = "md",
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };
  const sz = sizes[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
        >
          <svg
            className={`${sz} ${i <= Math.round(rating) ? "text-secondary-400" : "text-zinc-200 dark:text-zinc-700"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
