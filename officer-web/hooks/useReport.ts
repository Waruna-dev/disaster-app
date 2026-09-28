import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types/report';
import { normalizeReport } from '../utils/normalizeReport';

/** Live subscription on a single report doc, so the Details screen updates in place. */
export function useReport(reportId: string | undefined) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'reports', reportId),
      (snap) => {
        setReport(snap.exists() ? normalizeReport(snap.id, snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to report:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [reportId]);

  return { report, loading };
}
