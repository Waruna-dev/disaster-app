import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export function getRelativeTimeString(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Update time unavailable';

  const date = new Date(timestamp);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) return 'Update time unavailable';

  const diffMins = Math.max(0, differenceInMinutes(now, date));
  const diffHours = Math.max(0, differenceInHours(now, date));
  const diffDays = Math.max(0, differenceInDays(now, date));

  if (diffMins < 1) return 'Updated just now';
  if (diffMins < 60) return `Updated ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Updated yesterday';
  return `Updated ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}
