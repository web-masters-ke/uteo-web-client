"use client";

import Link from "next/link";
import type { Booking } from "@/lib/types";
import { fmtRelative } from "@/lib/format";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
  CONFIRMED:   { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  IN_PROGRESS: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
  COMPLETED:   { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  CANCELLED:   { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400" },
  DISPUTED:    { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
};

export default function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: (id: string) => void }) {
  const trainerName = booking.trainer?.user
    ? `${booking.trainer.user.firstName} ${booking.trainer.user.lastName}`
    : "Trainer";
  const avatar = booking.trainer?.user?.avatar;
  const initials = booking.trainer?.user
    ? (booking.trainer.user.firstName[0] + booking.trainer.user.lastName[0]).toUpperCase()
    : "T";
  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.PENDING;
  const date = new Date(booking.scheduledAt);

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-primary-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-600"
    >
      {avatar ? (
        <img src={avatar} alt={trainerName} className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{trainerName}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
          <span>{date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{booking.duration} min</span>
          <span className="capitalize">{booking.sessionType.toLowerCase()}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          KES {booking.amount?.toLocaleString()}
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
          {booking.status.replace("_", " ")}
        </span>
      </div>
    </Link>
  );
}
