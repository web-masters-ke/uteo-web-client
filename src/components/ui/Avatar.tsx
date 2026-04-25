'use client';
import { getInitials } from '@/lib/utils';

interface AvatarProps { src?: string | null; firstName: string; lastName: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; }
const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };

export default function Avatar({ src, firstName, lastName, size = 'md', className = '' }: AvatarProps) {
  if (src) return <img src={src} alt={`${firstName} ${lastName}`} className={`${sizeMap[size]} rounded-full object-cover ${className}`} />;
  return <div className={`${sizeMap[size]} rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold ${className}`}>{getInitials(firstName, lastName)}</div>;
}
