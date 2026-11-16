import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days} d ago` : formatDate(iso);
}
