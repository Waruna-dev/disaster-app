import { FloodReading } from '../types/flood';

export function normalizeStationName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function calculateLast24HourRainfall(
  history: FloodReading[],
  stationName: string,
  referenceTimestamp?: number
): number | null {
  const normalizedTarget = normalizeStationName(stationName);

  const validRecords = history.filter((r) => {
    if (!r.gauge) return false;
    if (normalizeStationName(r.gauge) !== normalizedTarget) return false;
    if (typeof r.timestamp !== 'number' || !Number.isFinite(r.timestamp)) return false;
    if (r.rainFall === null || !Number.isFinite(r.rainFall) || r.rainFall < 0) return false;
    return true;
  });

  if (validRecords.length === 0) return null;

  // Remove duplicates by timestamp
  const uniqueRecordsMap = new Map<number, FloodReading>();
  for (const r of validRecords) {
    if (!uniqueRecordsMap.has(r.timestamp)) {
      uniqueRecordsMap.set(r.timestamp, r);
    }
  }

  const uniqueRecords = Array.from(uniqueRecordsMap.values());

  // Define 24-hour window
  let latestTimestamp = referenceTimestamp;
  if (!latestTimestamp) {
    latestTimestamp = Math.max(...uniqueRecords.map((r) => r.timestamp));
  }
  const cutoff = latestTimestamp - 24 * 60 * 60 * 1000;

  // Sum valid records
  let hasRecordsInWindow = false;
  let total = 0;

  for (const r of uniqueRecords) {
    if (r.timestamp >= cutoff && r.timestamp <= latestTimestamp) {
      hasRecordsInWindow = true;
      total += r.rainFall!;
    }
  }

  if (!hasRecordsInWindow) return null;

  return total;
}
