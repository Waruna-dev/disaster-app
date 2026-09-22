import { Report } from '../types/report';
import { RiskLevel } from '../types/alert';
import { FloodIncident, FloodIncidentReport } from '../types/floodIncident';
import { computeCentroid, convexHull, hashIds, haversineMeters, isValidCoordinate, uniquePoints } from './geo';

/** Reports within this distance of each other belong to the same flood incident. */
export const GROUPING_RADIUS_METERS = 1000;
// 300

/** Floor for the circle fallback radius, so a tight cluster still draws a visible zone. */
const MIN_CIRCLE_RADIUS_METERS = 150;
/** Padding added around the furthest member point so the circle doesn't hug the pins. */
const CIRCLE_PADDING_METERS = 60;

function resolveLocation(report: Report): { latitude: number; longitude: number } | null {
  const lat = report.location?.latitude ?? report.latitude;
  const lng = report.location?.longitude ?? report.longitude;
  if (lat === undefined || lng === undefined || !isValidCoordinate(lat, lng)) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Report count -> risk level. A simple, documented heuristic (not a hazard model):
 * more independent verified reports clustered in one 300m-linked area implies a
 * larger/more severe affected zone. Officers can still override via reject.
 */
export function computeIncidentRiskLevel(reportCount: number): RiskLevel {
  if (reportCount >= 7) return 'CRITICAL';
  if (reportCount >= 5) return 'HIGH';
  if (reportCount >= 3) return 'MEDIUM';
  return 'LOW';
}

function mostCommonArea(reports: Report[]): string {
  const counts = new Map<string, number>();
  for (const r of reports) {
    const key = r.affectedArea.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = reports[0].affectedArea.trim();
  let bestCount = 0;
  for (const [area, count] of counts) {
    if (count > bestCount) {
      best = area;
      bestCount = count;
    }
  }
  return best;
}

function latestTimestamp(reports: Report[]): Report['createdAt'] {
  return reports.reduce<Report['createdAt']>((latest, r) => {
    if (!r.createdAt) return latest;
    if (!latest || r.createdAt.toMillis() > latest.toMillis()) return r.createdAt;
    return latest;
  }, null);
}

/**
 * Groups verified flood reports into incidents using single-link clustering on GPS
 * distance only (never affectedArea text): two reports in the same incident if
 * there's a chain of reports each within GROUPING_RADIUS_METERS of the next. This
 * mirrors DBSCAN with minPts=1 — reports 300m+ apart from every other report don't
 * join a cluster (min 2 reports form a real incident; a single isolated verified
 * report has nothing to draw an "affected area" around).
 */
export function buildFloodIncidents(reports: Report[]): FloodIncident[] {
  const candidates = reports.filter((r) => r.disasterType === 'flood' && r.status === 'Verified');

  const withLocation: { report: Report; location: { latitude: number; longitude: number } }[] = [];
  for (const report of candidates) {
    const location = resolveLocation(report);
    if (location) withLocation.push({ report, location });
  }

  // Union-Find over withLocation's indices.
  const parent = withLocation.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < withLocation.length; i++) {
    for (let j = i + 1; j < withLocation.length; j++) {
      if (haversineMeters(withLocation[i].location, withLocation[j].location) <= GROUPING_RADIUS_METERS) {
        union(i, j);
      }
    }
  }

  const clusters = new Map<number, { report: Report; location: { latitude: number; longitude: number } }[]>();
  withLocation.forEach((entry, i) => {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(entry);
  });

  const incidents: FloodIncident[] = [];

  for (const members of clusters.values()) {
    if (members.length < 2) continue; // a lone report has nothing to group with

    const memberReports = members.map((m) => m.report);
    const points = members.map((m) => m.location);
    const distinctPoints = uniquePoints(points);
    const centroid = computeCentroid(points);

    let polygon: FloodIncident['polygon'] = null;
    let radiusMeters: number;

    if (distinctPoints.length >= 3) {
      polygon = convexHull(distinctPoints);
      radiusMeters = Math.max(...points.map((p) => haversineMeters(centroid, p))) + CIRCLE_PADDING_METERS;
    } else {
      const maxDist = points.length ? Math.max(...points.map((p) => haversineMeters(centroid, p))) : 0;
      radiusMeters = Math.max(MIN_CIRCLE_RADIUS_METERS, maxDist + CIRCLE_PADDING_METERS);
    }

    const incidentReports: FloodIncidentReport[] = members.map((m) => ({
      id: m.report.id,
      referenceNumber: m.report.referenceNumber,
      affectedArea: m.report.affectedArea,
      location: m.location,
      createdAt: m.report.createdAt,
    }));

    incidents.push({
      id: `FLD-${hashIds(memberReports.map((r) => r.id))}`,
      affectedArea: mostCommonArea(memberReports),
      reports: incidentReports,
      centroid,
      polygon,
      radiusMeters,
      riskLevel: computeIncidentRiskLevel(memberReports.length),
      generatedAt: latestTimestamp(memberReports),
    });
  }

  return incidents.sort((a, b) => b.reports.length - a.reports.length);
}

/** Verified flood reports that didn't join any incident (no/invalid GPS, or >300m from every other verified flood report). */
export function unclusteredFloodReports(reports: Report[], incidents: FloodIncident[]): Report[] {
  const clusteredIds = new Set(incidents.flatMap((i) => i.reports.map((r) => r.id)));
  return reports.filter((r) => r.disasterType === 'flood' && r.status === 'Verified' && !clusteredIds.has(r.id));
}
