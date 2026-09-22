import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report, ReportStatus } from '../types/report';
import { normalizeReport } from '../utils/normalizeReport';

/** Live subscription over `reports`, optionally filtered by status. */
export function useReports(status: ReportStatus | 'all') {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (status !== 'all') constraints.unshift(where('status', '==', status));

    const q = query(collection(db, 'reports'), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReports(snapshot.docs.map((d) => normalizeReport(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to reports:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [status]);

  return { reports, loading, error };
}
