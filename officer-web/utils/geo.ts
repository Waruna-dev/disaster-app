import { ReportLocation } from '../types/report';

/**
 * Small geometry helpers used only by the flood-incident-polygon feature
 * (utils/floodIncidents.ts). Kept separate from utils/reportGrouping.ts, which has
 * its own km-radius clustering for a different screen (pending-report review) —
 * this file's contract (meters, 300m threshold, convex hull) is specific to that
 * feature and shouldn't drift if the other one changes.
 */

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: ReportLocation, b: ReportLocation): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function computeCentroid(points: ReportLocation[]): ReportLocation {
  return {
    latitude: points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
    longitude: points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
  };
}

/** Rounds to ~11cm precision so near-identical GPS fixes (duplicate reports) collapse to one point. */
function dedupeKey(p: ReportLocation): string {
  return `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
}

export function uniquePoints(points: ReportLocation[]): ReportLocation[] {
  const seen = new Map<string, ReportLocation>();
  for (const p of points) {
    const key = dedupeKey(p);
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}

/**
 * Andrew's monotone chain convex hull. Treats latitude/longitude as a flat x/y
 * plane, which is an acceptable approximation for a single flood incident's
 * footprint (at most a few km across) and keeps this dependency-free.
 * Requires >= 3 distinct points; callers should fall back to a circle otherwise.
 */
export function convexHull(points: ReportLocation[]): ReportLocation[] {
  const pts = uniquePoints(points).sort((a, b) => a.longitude - b.longitude || a.latitude - b.latitude);
  if (pts.length < 3) return pts;

  const cross = (o: ReportLocation, a: ReportLocation, b: ReportLocation) =>
    (a.longitude - o.longitude) * (b.latitude - o.latitude) - (a.latitude - o.latitude) * (b.longitude - o.longitude);

  const lower: ReportLocation[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }

  const upper: ReportLocation[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Deterministic short id from a set of report IDs — order-independent. */
export function hashIds(ids: string[]): string {
  const sorted = [...ids].sort().join('|');
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = (hash * 33) ^ sorted.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
