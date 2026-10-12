import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { haversineMeters } from '../utils/geo';

/* SETTINGS */
// An alert shows if the user is within (alert radius + this buffer) of the alert centre.
const NEARBY_BUFFER_M = 5000; // 5 km
// For testing: set to true to show EVERY active alert regardless of location.
const SHOW_ALL_FOR_DEMO = false;

type Point = { latitude: number; longitude: number };

interface RawWarning {
  id: string;
  title: string;
  hazardType: string;
  riskLevel: string;
  affectedArea: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  message: string;
  status: string;
  createdAtMs: number | null;
  expiresAtMs: number | null;
}

export interface NearbyWarning extends RawWarning {
  distanceM: number | null;
}

// Firestore timestamps can arrive in a few shapes; turn any of them into milliseconds.
const toMillis = (t: any): number | null => {
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t === 'number') return t;
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (typeof t === 'string') {
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
};

const normalize = (d: QueryDocumentSnapshot): RawWarning => {
  const x = d.data() as any;
  return {
    id: d.id,
    title: x.title ?? 'Hazard alert',
    hazardType: x.hazardType ?? 'flood',
    riskLevel: x.riskLevel ?? 'MEDIUM',
    affectedArea: x.affectedArea ?? '',
    latitude: typeof x.latitude === 'number' ? x.latitude : null,
    longitude: typeof x.longitude === 'number' ? x.longitude : null,
    radius: typeof x.radius === 'number' ? x.radius : 0,
    message: x.message ?? '',
    status: x.status ?? 'Active',
    createdAtMs: toMillis(x.createdAt),
    expiresAtMs: toMillis(x.expiresAt),
  };
};

// Active = status is "Active" and the expiry time has not passed.
const isActive = (w: RawWarning, now: number) =>
  String(w.status).toLowerCase() === 'active' &&
  (w.expiresAtMs === null || w.expiresAtMs > now);

// Decides if an alert concerns this user, and how far away it is.
function evaluate(
  w: RawWarning,
  points: Point[],
  homeName: string | null
): { relevant: boolean; distanceM: number | null } {
  const hasCoords = w.latitude !== null && w.longitude !== null;

  let best: number | null = null;
  if (hasCoords) {
    for (const p of points) {
      const d = haversineMeters(p, { latitude: w.latitude as number, longitude: w.longitude as number });
      if (best === null || d < best) best = d;
    }
  }

  if (SHOW_ALL_FOR_DEMO) return { relevant: true, distanceM: best };
  // Nothing known about the user's location -> show everything (safer to over-warn)
  if (points.length === 0 && !homeName) return { relevant: true, distanceM: null };
  // Alert has no map position -> cannot filter, show it
  if (!hasCoords) return { relevant: true, distanceM: null };
  // Inside the alert radius (plus buffer)
  if (best !== null && best <= w.radius + NEARBY_BUFFER_M) return { relevant: true, distanceM: best };
  // Alert text mentions the user's home area, e.g. "Negombo, Western Province"
  if (homeName && w.affectedArea.toLowerCase().includes(homeName)) return { relevant: true, distanceM: best };

  return { relevant: false, distanceM: best };
}

export function useNearbyWarnings(onNewAlert?: (w: NearbyWarning) => void) {
  const { userProfile } = useAuth();
  const [raw, setRaw] = useState<RawWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<Point | null>(null);
  const [gpsDone, setGpsDone] = useState(false);
  const [now, setNow] = useState(Date.now());

  const home = userProfile?.homeArea ?? null;
  const homeLat = home?.latitude;
  const homeLng = home?.longitude;
  const homeNameRaw = home?.name ? home.name.split(',')[0].trim().toLowerCase() : '';
  const homeName = homeNameRaw.length >= 3 ? homeNameRaw : null;

  const points = useMemo<Point[]>(() => {
    const list: Point[] = [];
    if (gps) list.push(gps);
    if (typeof homeLat === 'number' && typeof homeLng === 'number') {
      list.push({ latitude: homeLat, longitude: homeLng });
    }
    return list;
  }, [gps, homeLat, homeLng]);

  // Refs so the Firestore listener always sees the latest values
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const homeNameRef = useRef(homeName);
  homeNameRef.current = homeName;
  const callbackRef = useRef(onNewAlert);
  callbackRef.current = onNewAlert;

  // 1) Get the phone's GPS position
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          setGps({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        }
        if (!cancelled) setGpsDone(true);
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        if (!cancelled) setGps({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });
      } catch (e) {
        console.log('useNearbyWarnings location error:', e);
      } finally {
        if (!cancelled) setGpsDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Listen live to the "warnings" collection
  useEffect(() => {
    const q = query(collection(db, 'warnings'), orderBy('createdAt', 'desc'));
    let first = true;
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRaw(snap.docs.map(normalize));
        setLoading(false);
        setError(null);

        // Pop-up only for alerts that arrive AFTER the first load
        if (!first) {
          snap.docChanges().forEach((c) => {
            if (c.type !== 'added' || c.doc.metadata.hasPendingWrites) return;
            const w = normalize(c.doc);
            if (!isActive(w, Date.now())) return;
            const r = evaluate(w, pointsRef.current, homeNameRef.current);
            if (r.relevant) callbackRef.current?.({ ...w, distanceM: r.distanceM });
          });
        }
        first = false;
      },
      (err) => {
        console.log('useNearbyWarnings listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // 3) Re-check expiry once a minute so expired alerts disappear by themselves
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // 4) Final list: active + relevant to the user, newest first
  const alerts = useMemo<NearbyWarning[]>(() => {
    return raw
      .filter((w) => isActive(w, now))
      .map((w) => {
        const r = evaluate(w, points, homeName);
        return { ...w, distanceM: r.distanceM, _relevant: r.relevant };
      })
      .filter((w) => w._relevant)
      .map(({ _relevant, ...w }) => w as NearbyWarning)
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  }, [raw, points, homeName, now]);

  return {
    alerts,
    loading: loading || !gpsDone,
    error,
    locationKnown: points.length > 0 || !!homeName,
  };
}
