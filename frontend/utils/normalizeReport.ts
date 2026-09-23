import { Report } from '../types/report';

/**
 * Firestore reports store GPS as flat `latitude`/`longitude` fields (see
 * services/reportService.ts's createReport), but the map and grouping code reads a
 * nested `location` object. Without this, `location` is always undefined on real
 * reports, so they never show up as map pins and never cluster into groups. Every
 * read site should go through here instead of casting the Firestore doc directly.
 */
export function normalizeReport(id: string, data: Record<string, any>): Report {
  const report = { id, ...data } as Report;
  if (!report.location && typeof report.latitude === 'number' && typeof report.longitude === 'number') {
    report.location = { latitude: report.latitude, longitude: report.longitude };
  }
  return report;
}
