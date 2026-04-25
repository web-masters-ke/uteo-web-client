'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

function StarIcon({ filled, className = 'h-8 w-8' }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} fill={filled ? '#F77B0F' : 'none'} viewBox="0 0 24 24" stroke={filled ? '#F77B0F' : '#d1d5db'} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function PostSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const bookingId = searchParams.get('bookingId') ?? '';

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completionFired, setCompletionFired] = useState(false);

  // Auto-fire confirm-completion on mount
  useEffect(() => {
    if (!bookingId || completionFired) return;
    setCompletionFired(true);
    apiPost(`/bookings/${bookingId}/confirm-completion`, {}).catch(() => {
      // Non-critical — silently ignore
    });
  }, [bookingId, completionFired]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (rating === 0) {
      addToast('error', 'Please select a star rating before submitting');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/reviews', {
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        revieweeId: undefined, // backend derives from booking
      });
      addToast('success', 'Review submitted — thank you!');
      router.push(bookingId ? `/bookings/${bookingId}` : '/sessions');
    } catch {
      addToast('error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment, bookingId, addToast, router]);

  const handleSkip = () => {
    router.push(bookingId ? `/bookings/${bookingId}` : '/sessions');
  };

  const STAR_LABELS = ['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'];
  const displayRating = hovered || rating;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header card */}
        <div className="bg-[#192C67] rounded-2xl p-8 mb-6 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Session Complete!</h1>
          <p className="text-white/70 text-sm">
            Great work{user?.firstName ? `, ${user.firstName}` : ''}! Your session has been recorded successfully.
          </p>
        </div>

        {/* Review card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Rate your session</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your feedback helps trainers improve and helps other learners choose the right trainer.</p>

          <form onSubmit={handleSubmit}>
            {/* Star rating */}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <StarIcon filled={star <= displayRating} />
                </button>
              ))}
            </div>

            {displayRating > 0 && (
              <p className="text-center text-sm font-medium text-[#F77B0F] mb-6">
                {STAR_LABELS[displayRating]}
              </p>
            )}
            {displayRating === 0 && <div className="mb-6" />}

            {/* Written review */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Written review <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Share your experience — what went well, what could be improved..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/30 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full py-3 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : 'Submit Review'}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>

        {bookingId && (
          <p className="text-center text-xs text-gray-400 mt-4">
            <Link href={`/bookings/${bookingId}`} className="underline hover:text-gray-600">
              Go back to booking details
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function PostSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#192C67] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PostSessionContent />
    </Suspense>
  );
}
