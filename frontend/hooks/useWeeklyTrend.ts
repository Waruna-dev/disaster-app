import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types/report';

export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Computed client-side from the live `reports` collection (no dailyStats rollup exists). */
export function useWeeklyTrend() {
  const [days, setDays] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data() as Report;
          const createdAt = data.createdAt?.toDate?.();
          if (!createdAt) return;
          const key = toDateKey(createdAt);
          counts[key] = (counts[key] ?? 0) + 1;
        });

        const today = new Date();
        const next: DayCount[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          const key = toDateKey(day);
          next.push({ date: key, count: counts[key] ?? 0 });
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
