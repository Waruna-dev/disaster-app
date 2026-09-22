import { Report, ReportLocation } from '../types/report';

export interface ReportGroup {
  id: string;
  disasterType: Report['disasterType'];
  affectedArea: string;
  reports: Report[];
  centroid: ReportLocation | null;
}

const CLUSTER_RADIUS_KM = 3;

function haversineKm(a: ReportLocation, b: ReportLocation): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Client-computed clustering — there's no `incidents` collection or grouping
 * pipeline in Firestore (see incidents.tsx), so "auto-grouping" here means: same
 * disaster type, and either within CLUSTER_RADIUS_KM of each other (when both have
 * GPS) or an exact affectedArea match (fallback for reports with no coordinates).
 * A lone report has nothing to merge with, so singleton clusters aren't a "group".
 */
export function groupPendingReports(reports: Report[]): ReportGroup[] {
  const byType = new Map<Report['disasterType'], Report[]>();
  for (const r of reports) {
    if (!byType.has(r.disasterType)) byType.set(r.disasterType, []);
    byType.get(r.disasterType)!.push(r);
  }

  const clusters: Report[][] = [];

  for (const typeReports of byType.values()) {
    const ordered = [...typeReports].sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
    const used = new Set<string>();

    for (const seed of ordered) {
      if (used.has(seed.id)) continue;
      const cluster = [seed];
      used.add(seed.id);

      for (const candidate of ordered) {
        if (used.has(candidate.id)) continue;
        const isNear =
          seed.location && candidate.location
            ? haversineKm(seed.location, candidate.location) <= CLUSTER_RADIUS_KM
            : seed.affectedArea.trim().toLowerCase() === candidate.affectedArea.trim().toLowerCase();
        if (isNear) {
          cluster.push(candidate);
          used.add(candidate.id);
        }
      }
      clusters.push(cluster);
    }
  }

  const grouped = clusters.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);

  return grouped.map((clusterReports, index) => {
    const located = clusterReports.filter((r): r is Report & { location: ReportLocation } => !!r.location);
    const centroid: ReportLocation | null = located.length
      ? {
          latitude: located.reduce((sum, r) => sum + r.location.latitude, 0) / located.length,
          longitude: located.reduce((sum, r) => sum + r.location.longitude, 0) / located.length,
        }
      : null;

    return {
      id: `INC-${String(index + 1).padStart(3, '0')}`,
      disasterType: clusterReports[0].disasterType,
      affectedArea: clusterReports[0].affectedArea,
      reports: clusterReports,
      centroid,
    };
  });
}

export function ungroupedPendingReports(reports: Report[], groups: ReportGroup[]): Report[] {
  const groupedIds = new Set(groups.flatMap((g) => g.reports.map((r) => r.id)));
  return reports.filter((r) => !groupedIds.has(r.id));
}
