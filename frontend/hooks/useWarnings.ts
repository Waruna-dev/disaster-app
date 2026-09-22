import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Warning } from '../types/alert';

/** Live subscription over `warnings`, newest first. */
export function useWarnings() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'warnings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWarnings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Warning));
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to warnings:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { warnings, loading, error };
}
