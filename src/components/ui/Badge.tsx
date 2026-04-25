interface BadgeProps { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral'; size?: 'sm' | 'md'; className?: string; }
const v: Record<string, string> = { primary: 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200', secondary: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200', accent: 'bg-accent-100 dark:bg-accent-800 text-accent-700 dark:text-accent-200', success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
const s: Record<string, string> = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
export default function Badge({ children, variant = 'neutral', size = 'sm', className = '' }: BadgeProps) {
  return <span className={`inline-flex items-center font-medium rounded-full ${v[variant]} ${s[size]} ${className}`}>{children}</span>;
}
