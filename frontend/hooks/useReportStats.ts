import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types/report';

export interface ReportStats {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
}

const EMPTY_STATS: ReportStats = { pending: 0, verified: 0, rejected: 0, total: 0 };

// Derived from a single live `reports` listener (fine at prototype scale) rather than
// a maintained rollup doc, since there's no Cloud Functions trigger to keep one updated.
export function useReportStats() {
  const [stats, setStats] = useState<ReportStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const next = { ...EMPTY_STATS };
        snapshot.docs.forEach((d) => {
          const status = (d.data() as Report).status;
          if (status === 'Pending') next.pending += 1;
          else if (status === 'Verified') next.verified += 1;
          else if (status === 'Rejected') next.rejected += 1;
          next.total += 1;
        });
        setStats(next);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to report stats:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { stats, loading };
}
