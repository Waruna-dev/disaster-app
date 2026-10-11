import { act } from '@testing-library/react-native';
import { fs } from './firebaseMocks';

type Doc = Record<string, any> & { id: string };

/**
 * Pushes `docs` into every live listener on `collection`, applying each listener's
 * own where('==' | 'in') / orderBy(desc) / limit constraints the way Firestore would,
 * so a screen with several differently-filtered subscriptions (e.g. Pending for the
 * nav badge + Verified for flood incidents) each receives the right subset.
 */
export async function emitCollection(collection: string, docs: Doc[]) {
  await act(async () => {
    for (const l of fs.__listenersFor(collection)) {
      const constraints: any[] = (l.target as any).constraints ?? [];
      let out = docs.filter((d) =>
        constraints.every((c) => {
          if (c.type !== 'where') return true;
          if (c.op === '==') return d[c.field] === c.value;
          if (c.op === 'in') return c.value.includes(d[c.field]);
          return true;
        })
      );
      for (const c of constraints) {
        if (c.type === 'orderBy' && c.dir === 'desc') {
          out = [...out].sort((a, b) => (b[c.field]?.toMillis?.() ?? 0) - (a[c.field]?.toMillis?.() ?? 0));
        }
        if (c.type === 'limit') out = out.slice(0, c.n);
      }
      l.next(fs.__makeQuerySnap(out));
    }
  });
}
