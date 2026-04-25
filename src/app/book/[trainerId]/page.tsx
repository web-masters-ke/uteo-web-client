'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import BookingWizard from '@/components/booking/BookingWizard';
import { Trainer, Booking } from '@/lib/types';
import { trainerService } from '@/lib/services/trainers';
import { formatCurrency } from '@/lib/utils';

export default function BookTrainerPage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trainerService
      .getById(trainerId)
      .then(setTrainer)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainerId]);

  if (loading) return <PageSkeleton />;

  if (!trainer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trainer Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This trainer profile may have been removed or is unavailable.</p>
        <Link
          href="/trainers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F77B0F] text-white rounded-lg hover:bg-[#e06a0d] text-sm font-medium"
        >
          Browse Trainers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href={`/trainers/${trainerId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#F77B0F] hover:text-[#F77B0F] font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Profile
      </Link>

      {/* Trainer info banner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 flex items-center gap-4">
        <Avatar
          src={trainer.avatarUrl || trainer.user?.avatarUrl}
          firstName={trainer.firstName || trainer.user?.firstName || '?'}
          lastName={trainer.lastName || trainer.user?.lastName || '?'}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {trainer.firstName || trainer.user?.firstName} {trainer.lastName || trainer.user?.lastName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {trainer.specialization || 'General Trainer'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold text-secondary-500 dark:text-secondary-400">
              {formatCurrency(trainer.hourlyRate || 0)}/hr
            </span>
            {trainer.rating > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {Number(trainer.rating || 0).toFixed(1)} ({trainer.totalReviews} reviews)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Booking Wizard - inline mode with trainer pre-selected */}
      <BookingWizard
        preselectedTrainer={trainer}
        inline
        onSuccess={(booking: Booking) => {
          router.push(`/bookings/${booking.id}`);
        }}
      />
    </div>
  );
}
