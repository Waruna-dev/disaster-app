import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types/report';

export interface DayCount {
  date: string; // YYYY-MM-DD (local day)
  /** Reports submitted that day. */
  submitted: number;
  /** Reports verified (reviewed and approved) that day. */
  verified: number;
}

// Local calendar day, not UTC — otherwise a report filed just after midnight
// local time lands on the previous day's bar for anyone east of UTC.
function toDateKey(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Computed client-side from the live `reports` collection (no dailyStats rollup exists). */
export function useWeeklyTrend() {
  const [days, setDays] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const submitted: Record<string, number> = {};
        const verified: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data() as Report;
          const createdAt = data.createdAt?.toDate?.();
          if (createdAt) {
            const key = toDateKey(createdAt);
            submitted[key] = (submitted[key] ?? 0) + 1;
          }
          const reviewedAt = data.reviewedAt?.toDate?.();
          if (data.status === 'Verified' && reviewedAt) {
            const key = toDateKey(reviewedAt);
            verified[key] = (verified[key] ?? 0) + 1;
          }
        });

        const today = new Date();
        const next: DayCount[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          const key = toDateKey(day);
          next.push({ date: key, submitted: submitted[key] ?? 0, verified: verified[key] ?? 0 });
        }
        setDays(next);
        setLoading(false);
      },
      (err) => {
        console.error('Error computing weekly trend:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { days, loading };
}
