import { useEffect, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Resolves residentId -> users/{id}.fullName for display (the incident report schema
 * only stores the id, the same way `authService.registerUser` stores fullName on `users`).
 */
export function useResidentNames(residentIds: string[]) {
  const uniqueIds = Array.from(new Set(residentIds.filter(Boolean))).sort();
  const key = uniqueIds.join(',');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setNames({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const chunks = chunk(uniqueIds, 10);
        const results = await Promise.all(
          chunks.map((ids) => getDocs(query(collection(db, 'users'), where(documentId(), 'in', ids))))
        );
        if (cancelled) return;
        const next: Record<string, string> = {};
        results.forEach((snap) => {
          snap.docs.forEach((d) => {
            next[d.id] = d.data().fullName ?? 'Resident';
          });
        });
        setNames(next);
      } catch (error) {
        console.error('Error resolving resident names:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return names;
}
