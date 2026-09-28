import { FloodReading, FloodStation, FloodStatus } from '../types/flood';

/**
 * Sri Lanka Irrigation Department's public real-time river gauge network, the same
 * feature service behind their "Realtime Water Level in Major River" ArcGIS dashboard
 * (arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38). Public, unauthenticated,
 * no API key — read-only ArcGIS REST queries.
 */
const SERVICES_BASE = 'https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services';
const STATIONS_URL = `${SERVICES_BASE}/hydrostations/FeatureServer/0/query`;
const READINGS_URL = `${SERVICES_BASE}/gauges_2_view/FeatureServer/0/query`;

// Readings arrive roughly hourly per station; 500 of the most recent rows is enough
// to cover a fresh reading for every station without pulling the whole log.
const LATEST_READINGS_SAMPLE_SIZE = 500;

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

/** The 40+ monitored stations with their static basin and flood-level thresholds. */
export async function fetchFloodStations(signal?: AbortSignal): Promise<FloodStation[]> {
  const url =
    `${STATIONS_URL}?where=1%3D1&outFields=station,basin,Alert_Level,Minor_Flood_Level,Major_Flood_Level,Unit` +
    `&orderByFields=station&resultRecordCount=200&f=json`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Failed to load flood stations');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood stations');

  return (json.features ?? []).map((f: any) => ({
    station: f.attributes.station?.trim() ?? '',
    basin: f.attributes.basin?.trim() ?? '',
    alertLevel: f.attributes.Alert_Level != null && Number.isFinite(f.attributes.Alert_Level) ? f.attributes.Alert_Level : null,
    minorFloodLevel: f.attributes.Minor_Flood_Level != null && Number.isFinite(f.attributes.Minor_Flood_Level) ? f.attributes.Minor_Flood_Level : null,
    majorFloodLevel: f.attributes.Major_Flood_Level != null && Number.isFinite(f.attributes.Major_Flood_Level) ? f.attributes.Major_Flood_Level : null,
    unit: f.attributes.Unit ?? 'm',
  })).filter((s: FloodStation) => s.station);
}

function toReading(attributes: any): FloodReading | null {
  const gauge = attributes.gauge?.trim();
  const timestamp = attributes.CreationDate;
  let waterLevel = attributes.water_level;

  if (!gauge || typeof timestamp !== 'number' || waterLevel == null || !Number.isFinite(waterLevel)) {
    return null;
  }

  const rainFall = attributes.rain_fall;
  const alertLevel = attributes.alertpull;
  const minorFloodLevel = attributes.minorpull;
  const majorFloodLevel = attributes.majorpull;

  return {
    gauge,
    basin: attributes.basin?.trim() ?? '',
    waterLevel,
    rainFall: rainFall != null && Number.isFinite(rainFall) ? rainFall : null,
    alertLevel: alertLevel != null && Number.isFinite(alertLevel) ? alertLevel : null,
    minorFloodLevel: minorFloodLevel != null && Number.isFinite(minorFloodLevel) ? minorFloodLevel : null,
    majorFloodLevel: majorFloodLevel != null && Number.isFinite(majorFloodLevel) ? majorFloodLevel : null,
    timestamp,
  };
}

/** Most recent reading per station (deduped from a recent sample of the reading log). */
export async function fetchLatestFloodReadings(signal?: AbortSignal): Promise<FloodReading[]> {
  const url =
    `${READINGS_URL}?where=1%3D1&outFields=gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate` +
    `&orderByFields=CreationDate+DESC&resultRecordCount=${LATEST_READINGS_SAMPLE_SIZE}&f=json`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Failed to load flood readings');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood readings');

  const seen = new Set<string>();
  const latest: FloodReading[] = [];
  for (const f of json.features ?? []) {
    const reading = toReading(f.attributes);
    if (!reading) continue;
    const gauge = reading.gauge;
    if (seen.has(gauge)) continue;
    seen.add(gauge);
    latest.push(reading);
  }
  return latest;
}

/** Chronological reading history for one station, most recent `count` points. */
export async function fetchFloodHistory(gauge: string, count = 150, signal?: AbortSignal): Promise<FloodReading[]> {
  const where = `gauge='${escapeSqlString(gauge)}'`;
  const url =
    `${READINGS_URL}?where=${encodeURIComponent(where)}&outFields=gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate` +
    `&orderByFields=CreationDate+DESC&resultRecordCount=${count}&f=json`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Failed to load flood history');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood history');

  return (json.features ?? [])
    .map((f: any) => toReading(f.attributes))
    .filter((r: any): r is FloodReading => r !== null)
    .reverse();
}

/**
 * Every reading in the last `days` days that reached at least the alert level,
 * newest first. The threshold comparison runs server-side so only relevant rows
 * come back; callers classify each one with getFloodStatus.
 */
export async function fetchFloodEvents(days = 4, signal?: AbortSignal): Promise<FloodReading[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const where = `CreationDate >= timestamp '${since}' AND alertpull IS NOT NULL AND water_level >= alertpull`;
  const url =
    `${READINGS_URL}?where=${encodeURIComponent(where)}&outFields=gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate` +
    `&orderByFields=CreationDate+DESC&resultRecordCount=1000&f=json`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Failed to load flood events');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood events');

  return (json.features ?? [])
    .map((f: any) => toReading(f.attributes))
    .filter((r: any): r is FloodReading => r !== null);
}

export function getFloodStatus(
  waterLevel: number | null | undefined,
  alertLevel: number | null | undefined,
  minorFloodLevel: number | null | undefined,
  majorFloodLevel: number | null | undefined
): FloodStatus {
  if (
    waterLevel == null ||
    !Number.isFinite(waterLevel) ||
    (alertLevel == null && minorFloodLevel == null && majorFloodLevel == null)
  ) {
    return 'unknown';
  }

  if (majorFloodLevel != null && waterLevel >= majorFloodLevel) return 'major';
  if (minorFloodLevel != null && waterLevel >= minorFloodLevel) return 'minor';
  if (alertLevel != null && waterLevel >= alertLevel) return 'alert';
  return 'normal';
}
