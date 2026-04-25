'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import Avatar from '@/components/ui/Avatar';
import RatingStars from '@/components/ui/RatingStars';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import { Review, Booking } from '@/lib/types';
import { reviewService } from '@/lib/services/reviews';
import { bookingService } from '@/lib/services/bookings';
import { formatDate, cn } from '@/lib/utils';

/* ── Interactive Stars (click-to-rate with hover) ── */
function InteractiveStars({ rating, onChange, size = 'lg' }: { rating: number; onChange: (r: number) => void; size?: 'md' | 'lg' }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <svg
            className={`${sz} ${
              i <= (hover || rating) ? 'text-[#F77B0F]' : 'text-gray-200 dark:text-gray-700'
            } transition-colors`}
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

export default function ReviewsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<'written' | 'received'>('written');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Completed bookings without reviews (for "Leave a Review")
  const [unreviewedBookings, setUnreviewedBookings] = useState<Booking[]>([]);
  const [unreviewedLoading, setUnreviewedLoading] = useState(false);

  // Edit modal state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create review modal
  const [createBooking, setCreateBooking] = useState<Booking | null>(null);
  const [createRating, setCreateRating] = useState(0);
  const [createComment, setCreateComment] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const isTrainer = user?.role === 'TRAINER';

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const fn = tab === 'written' ? reviewService.getMyReviews : reviewService.getReviewsOfMe;
      const data = await fn({ page, limit: 10 });
      setReviews(data.items);
      setTotalPages(data.totalPages);
    } catch {
      addToast('error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [tab, page, addToast]);

  const fetchUnreviewedBookings = useCallback(async () => {
    if (isTrainer) return; // Only clients can leave reviews
    setUnreviewedLoading(true);
    try {
      const res = await bookingService.list({ status: 'COMPLETED', limit: 50 });
      const bookings = res.items || [];
      // Filter out bookings that already have a review
      const myReviews = await reviewService.listMyReviews();
      const reviewedBookingIds = new Set(myReviews.map((r) => r.bookingId));
      const unreviewed = bookings.filter((b) => !reviewedBookingIds.has(b.id));
      setUnreviewedBookings(unreviewed);
    } catch {
      // Silently fail — supplementary feature
    } finally {
      setUnreviewedLoading(false);
    }
  }, [isTrainer]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (tab === 'written') {
      fetchUnreviewedBookings();
    }
  }, [tab, fetchUnreviewedBookings]);

  // ── Edit handlers ──
  const openEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const closeEdit = () => {
    setEditingReview(null);
    setEditRating(0);
    setEditComment('');
  };

  const handleEditSave = async () => {
    if (!editingReview) return;
    if (editRating < 1 || editRating > 5) {
      addToast('error', 'Please select a rating between 1 and 5');
      return;
    }
    setEditSaving(true);
    try {
      await reviewService.update(editingReview.id, {
        rating: editRating,
        comment: editComment || undefined,
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? { ...r, rating: editRating, comment: editComment }
            : r,
        ),
      );
      addToast('success', 'Review updated');
      closeEdit();
    } catch {
      addToast('error', 'Failed to update review');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete handlers ──
  const handleDelete = async () => {
    if (!deletingReview) return;
    setDeleteLoading(true);
    try {
      await reviewService.remove(deletingReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
      addToast('success', 'Review deleted');
      setDeletingReview(null);
      fetchUnreviewedBookings();
    } catch {
      addToast('error', 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Create review handlers ──
  const openCreate = (booking: Booking) => {
    setCreateBooking(booking);
    setCreateRating(0);
    setCreateComment('');
  };

  const closeCreate = () => {
    setCreateBooking(null);
    setCreateRating(0);
    setCreateComment('');
  };

  const handleCreateSave = async () => {
    if (!createBooking) return;
    if (createRating < 1 || createRating > 5) {
      addToast('error', 'Please select a rating between 1 and 5');
      return;
    }
    setCreateSaving(true);
    try {
      await reviewService.create({
        bookingId: createBooking.id,
        rating: createRating,
        comment: createComment || undefined,
      });
      addToast('success', 'Review submitted!');
      closeCreate();
      fetchReviews();
      fetchUnreviewedBookings();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit review';
      addToast('error', msg);
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reviews</h1>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => { setTab('written'); setPage(1); }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'written'
              ? 'bg-[#F77B0F] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          {isTrainer ? 'Reviews of Me' : 'My Reviews'}
        </button>
        <button
          onClick={() => { setTab('received'); setPage(1); }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'received'
              ? 'bg-[#F77B0F] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          {isTrainer ? 'Reviews I Wrote' : 'Reviews of Me'}
        </button>
      </div>

      {/* ── Leave a Review (unreviewed completed bookings) ── */}
      {tab === 'written' && !isTrainer && unreviewedBookings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#F77B0F]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Leave a Review
          </h2>
          <div className="space-y-3">
            {unreviewedBookings.slice(0, 5).map((booking) => {
              const trainer = booking.trainer;
              const trainerUser = (trainer?.user || trainer) as any;
              const trainerName = trainerUser
                ? `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim()
                : 'Trainer';

              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between bg-gradient-to-r from-[#F77B0F]/5 to-transparent border border-[#F77B0F]/20 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    {trainerUser && (
                      <Avatar
                        src={trainerUser.avatarUrl || trainerUser.avatar}
                        firstName={trainerUser.firstName || ''}
                        lastName={trainerUser.lastName || ''}
                        size="sm"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Session with {trainerName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {booking.sessionType} - {formatDate(booking.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openCreate(booking)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#F77B0F] text-white rounded-lg hover:bg-[#C49933] transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Leave Review
                  </button>
                </div>
              );
            })}
            {unreviewedBookings.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{unreviewedBookings.length - 5} more completed sessions awaiting review
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Reviews List ── */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-4">
            {reviews.map((review) => {
              const reviewer = review.reviewer;
              const trainer = review.trainer || review.reviewee;
              const isOwner = user?.id === review.reviewerId;

              return (
                <div
                  key={review.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {reviewer && (
                        <Avatar
                          src={reviewer.avatarUrl || reviewer.avatar}
                          firstName={reviewer.firstName}
                          lastName={reviewer.lastName}
                          size="sm"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RatingStars rating={review.rating} size="sm" />
                      {/* Edit/Delete buttons for own reviews */}
                      {isOwner && tab === 'written' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(review)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F77B0F] dark:text-[#F77B0F]/80 bg-[#F77B0F]/10 dark:bg-[#192C67]/20 rounded-lg hover:bg-[#F77B0F]/15 dark:hover:bg-[#192C67]/30 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingReview(review)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trainer info */}
                  {trainer && (
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Trainer:</span>
                      <Link
                        href={`/trainers/${review.trainerId}`}
                        className="text-xs font-medium text-[#F77B0F] dark:text-[#F77B0F]/80 hover:underline"
                      >
                        {trainer.firstName} {trainer.lastName}
                      </Link>
                    </div>
                  )}

                  {/* Session info */}
                  {review.booking && (
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {review.booking.sessionType} session on {formatDate(review.booking.scheduledAt)}
                      </span>
                    </div>
                  )}

                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {review.comment || 'No comment provided.'}
                  </p>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          title="No reviews yet"
          description={
            tab === 'written'
              ? 'You have not written any reviews yet. Complete a session to leave a review.'
              : 'You have not received any reviews yet.'
          }
        />
      )}

      {/* ── Edit Review Modal ── */}
      <Modal isOpen={!!editingReview} onClose={closeEdit} title="Edit Review" size="md">
        {editingReview && (
          <div>
            {/* Context */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {editingReview.trainer && (
                <Avatar
                  src={editingReview.trainer.avatarUrl || editingReview.trainer.avatar}
                  firstName={editingReview.trainer.firstName || ''}
                  lastName={editingReview.trainer.lastName || ''}
                  size="sm"
                />
              )}
              <div className="text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  Review for{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {editingReview.trainer
                      ? `${editingReview.trainer.firstName} ${editingReview.trainer.lastName}`
                      : 'Trainer'}
                  </span>
                </p>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating
              </label>
              <InteractiveStars rating={editRating} onChange={setEditRating} />
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment
              </label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F77B0F] outline-none resize-none text-sm"
                placeholder="Update your review..."
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {editComment.length}/2000
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || editRating < 1}
                className="px-5 py-2 text-sm font-medium bg-[#F77B0F] text-white rounded-lg hover:bg-[#e06a0d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Review Modal ── */}
      <Modal isOpen={!!createBooking} onClose={closeCreate} title="Leave a Review" size="md">
        {createBooking && (() => {
          const trainer = createBooking.trainer;
          const trainerUser = (trainer?.user || trainer) as any;
          const trainerName = trainerUser
            ? `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim()
            : 'Trainer';

          return (
            <div>
              {/* Session context */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {trainerUser && (
                  <Avatar
                    src={trainerUser.avatarUrl || trainerUser.avatar}
                    firstName={trainerUser.firstName || ''}
                    lastName={trainerUser.lastName || ''}
                    size="sm"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{trainerName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {createBooking.sessionType} session - {formatDate(createBooking.scheduledAt)}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How would you rate this session?
                </label>
                <InteractiveStars rating={createRating} onChange={setCreateRating} />
                {createRating > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {createRating === 5 ? 'Excellent!' : createRating === 4 ? 'Great!' : createRating === 3 ? 'Good' : createRating === 2 ? 'Fair' : 'Poor'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={createComment}
                  onChange={(e) => setCreateComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F77B0F] outline-none resize-none text-sm"
                  placeholder="Tell others about your experience..."
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {createComment.length}/2000
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeCreate}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSave}
                  disabled={createSaving || createRating < 1}
                  className="px-5 py-2 text-sm font-medium bg-[#F77B0F] text-white rounded-lg hover:bg-[#C49933] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createSaving ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
