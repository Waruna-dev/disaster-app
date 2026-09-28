import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types/report';

/**
 * Live feed of the 5 most recently reviewed reports. This compound query
 * (status `in` + orderBy reviewedAt) needs a Firestore composite index — see
 * firestore.indexes.json at the repo root, or the console error's direct link.
 */
export function useRecentActivity() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'reports'),
      where('status', 'in', ['Verified', 'Rejected']),
      orderBy('reviewedAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReports(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Report));
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to recent activity:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { reports, loading };
}
