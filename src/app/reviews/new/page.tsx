'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RatingStars from '@/components/ui/RatingStars';
import { reviewService } from '@/lib/services/reviews';
import { useToast } from '@/lib/toast';

function NewReviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';
  const { addToast } = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { addToast('error', 'Please select a rating'); return; }
    if (!comment.trim()) { addToast('error', 'Please write a comment'); return; }
    if (!bookingId) { addToast('error', 'Invalid booking reference'); return; }

    setIsSubmitting(true);
    try {
      await reviewService.create({ bookingId, rating, comment: comment.trim() });
      addToast('success', 'Review submitted!');
      router.push('/reviews');
    } catch {
      addToast('error', 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Write a Review</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rating</label>
          <div className="flex justify-center">
            <RatingStars rating={rating} size="lg" interactive onChange={setRating} />
          </div>
          {rating > 0 && <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">{rating}/5 stars</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Review</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            placeholder="Share your experience with this trainer..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F77B0F] outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#F77B0F] text-white font-semibold rounded-lg hover:bg-[#e06a0d] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

export default function NewReviewPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin h-8 w-8 border-4 border-[#F77B0F] border-t-transparent rounded-full" /></div>}><NewReviewPageInner /></Suspense>;
}
