"use client";

import Link from "next/link";
import type { TrainerProfile } from "@/lib/types";
import FollowButton from "@/components/FollowButton";
import FavoriteButton from "@/components/FavoriteButton";

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`${sz} ${i <= Math.round(rating) ? "text-secondary-400" : "text-zinc-200 dark:text-zinc-700"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const config: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    CERTIFIED: {
      label: 'Certified',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.68.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    EXPERIENCED: {
      label: 'Experienced',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
    },
    ENTRY_LEVEL: {
      label: 'New',
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="4" />
        </svg>
      ),
    },
  };
  const c = config[tier] || config.ENTRY_LEVEL;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function TrainerTypeBadge({ trainerType }: { trainerType?: string }) {
  if (!trainerType) return null;
  const isProfessional = trainerType === 'PROFESSIONAL' || trainerType === 'BOTH';
  const isVocational = trainerType === 'VOCATIONAL' || trainerType === 'BOTH';
  if (trainerType === 'BOTH') {
    return (
      <div className="flex gap-1">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/30 dark:text-[#5b8bc7]">Professional</span>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Vocational</span>
      </div>
    );
  }
  return isProfessional ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/30 dark:text-[#5b8bc7]">Professional</span>
  ) : isVocational ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Vocational</span>
  ) : null;
}

interface TrainerCardProps {
  trainer: TrainerProfile;
  ctaLabel?: string;
  ctaHref?: string;
  ctaVariant?: "primary" | "secondary" | "outline";
}

export default function TrainerCard({ trainer, ctaLabel, ctaHref, ctaVariant = "primary" }: TrainerCardProps) {
  const name = trainer.user ? `${trainer.user.firstName} ${trainer.user.lastName}` : "Trainer";
  const avatar = trainer.user?.avatar;
  const initials = trainer.user ? (trainer.user.firstName[0] + trainer.user.lastName[0]).toUpperCase() : "T";
  const label = ctaLabel || "View Profile";
  const href = ctaHref || `/trainers/${trainer.id}`;

  const ctaStyles: Record<string, string> = {
    primary: "bg-primary-500 text-white group-hover:bg-primary-600",
    secondary: "bg-secondary-500 text-white group-hover:bg-secondary-600",
    outline: "bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20",
  };

  const trainerUserId = trainer.user?.id as string | undefined;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {/* Full-card click target */}
      <Link href={href} className="absolute inset-0 rounded-2xl z-0" aria-label={`View ${name}'s profile`} tabIndex={-1} />

      <div className="relative z-10 flex items-start gap-3 mb-3">
        {avatar ? (
          <img src={avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
            {trainer.verificationStatus === "VERIFIED" && (
              <svg className="h-4 w-4 flex-shrink-0 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Stars rating={trainer.rating} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">({trainer.totalReviews})</span>
          </div>
        </div>
      </div>

      {/* Tier + Type badges */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 mb-2">
        <TierBadge tier={(trainer as any).tier} />
        <TrainerTypeBadge trainerType={(trainer as any).trainerType} />
      </div>

      {trainer.specialization && (
        <p className="relative z-10 mb-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{trainer.specialization}</p>
      )}

      <div className="relative z-10 flex items-center gap-1.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {trainer.city || trainer.county || trainer.location || "Kenya"}
      </div>

      {trainer.skills && trainer.skills.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1 mb-3">
          {trainer.skills.slice(0, 3).map((skill: any, i: number) => {
            const name = typeof skill === 'string' ? skill : skill?.skill?.name || skill?.name || skill?.skillId || '';
            const level = typeof skill === 'object' ? skill?.skill?.level || skill?.level : null;
            const demand = typeof skill === 'object' ? skill?.skill?.demand || skill?.demand : null;
            const icon = typeof skill === 'object' ? skill?.skill?.icon || skill?.icon : null;
            const demandColor = demand === 'CRITICAL' ? 'border-red-300 dark:border-red-700' : demand === 'HIGH' ? 'border-amber-300 dark:border-amber-700' : '';
            return (
              <span key={name || i} className={`inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 ${demandColor ? `border ${demandColor}` : ''}`}>
                {icon && <span className="text-[10px]">{icon}</span>}
                {name}
                {level && <span className="text-[8px] opacity-60 uppercase">{level.slice(0, 3)}</span>}
              </span>
            );
          })}
          {trainer.skills.length > 3 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
              +{trainer.skills.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div>
          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">KES {trainer.hourlyRate?.toLocaleString()}</span>
          <span className="text-xs text-zinc-400">/hr</span>
        </div>
        <div className="flex items-center gap-2">
          {trainerUserId && <FavoriteButton trainerUserId={trainerUserId} />}
          {trainerUserId && (
            <FollowButton
              userId={trainerUserId}
              initialFollowerCount={(trainer as any).followerCount ?? 0}
              showCount={false}
              className="!px-3 !py-1.5 !text-xs"
            />
          )}
          <Link href={href} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${ctaStyles[ctaVariant] || ctaStyles.primary}`}>
            {label}
          </Link>
        </div>
      </div>
    </div>
  );
}
