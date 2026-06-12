import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(date: string | undefined): string { if (!date) return '—'; try { return format(parseISO(date), 'MMM d, yyyy'); } catch { return date; } }
export function formatDateTime(date: string | undefined): string { if (!date) return '—'; try { return format(parseISO(date), 'MMM d, yyyy h:mm a'); } catch { return date; } }
export function formatTime(time: string | undefined): string { if (!time) return '—'; try { const [h, m] = time.split(':').map(Number); const period = h >= 12 ? 'PM' : 'AM'; const hour = h % 12 || 12; return `${hour}:${m.toString().padStart(2, '0')} ${period}`; } catch { return time; } }
export function formatRelative(date: string | undefined): string { if (!date) return '—'; try { return formatDistanceToNow(parseISO(date), { addSuffix: true }); } catch { return date; } }
export function formatCurrency(amount: number, currency = 'KES'): string { return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
export function getInitials(firstName?: string | null, lastName?: string | null): string { return `${(firstName || '?').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase(); }
export function cn(...classes: (string | boolean | undefined | null)[]): string { return classes.filter(Boolean).join(' '); }
export function truncate(str: string, length: number): string { return str.length <= length ? str : str.slice(0, length) + '...'; }
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Job share URLs read better with the title in them, e.g.
//   /jobs/senior-react-developer-cmq7ut26p0003d03cm1w8kfl1
// The trailing cuid still uniquely identifies the job. cuids contain no
// dashes, so the slug stays human-readable and the id is recoverable by
// taking the segment after the final dash (see jobIdFromSlug).
export function jobSlug(title: string | undefined, id: string): string {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug ? `${slug}-${id}` : id;
}

// Recovers the job id from either a bare id or a `slug-id` path segment.
export function jobIdFromSlug(param: string): string {
  return param.split('-').pop() || param;
}
