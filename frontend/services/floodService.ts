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
export async function fetchFloodStations(): Promise<FloodStation[]> {
  const url =
    `${STATIONS_URL}?where=1%3D1&outFields=station,basin,Alert_Level,Minor_Flood_Level,Major_Flood_Level,Unit` +
    `&orderByFields=station&resultRecordCount=200&f=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load flood stations');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood stations');

  return (json.features ?? []).map((f: any) => ({
    station: f.attributes.station,
    basin: f.attributes.basin,
    alertLevel: f.attributes.Alert_Level,
    minorFloodLevel: f.attributes.Minor_Flood_Level,
    majorFloodLevel: f.attributes.Major_Flood_Level,
    unit: f.attributes.Unit ?? 'm',
  }));
}

function toReading(attributes: any): FloodReading {
  return {
    gauge: attributes.gauge,
    basin: attributes.basin,
    waterLevel: attributes.water_level,
    rainFall: attributes.rain_fall,
    alertLevel: attributes.alertpull,
    minorFloodLevel: attributes.minorpull,
    majorFloodLevel: attributes.majorpull,
    timestamp: attributes.CreationDate,
  };
}

/** Most recent reading per station (deduped from a recent sample of the reading log). */
export async function fetchLatestFloodReadings(): Promise<FloodReading[]> {
  const url =
    `${READINGS_URL}?where=1%3D1&outFields=gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate` +
    `&orderByFields=CreationDate+DESC&resultRecordCount=${LATEST_READINGS_SAMPLE_SIZE}&f=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load flood readings');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood readings');

  const seen = new Set<string>();
  const latest: FloodReading[] = [];
  for (const f of json.features ?? []) {
    const gauge = f.attributes.gauge;
    if (seen.has(gauge)) continue;
    seen.add(gauge);
    latest.push(toReading(f.attributes));
  }
  return latest;
}

/** Chronological reading history for one station, most recent `count` points. */
export async function fetchFloodHistory(gauge: string, count = 150): Promise<FloodReading[]> {
  const where = `gauge='${escapeSqlString(gauge)}'`;
  const url =
    `${READINGS_URL}?where=${encodeURIComponent(where)}&outFields=gauge,basin,water_level,rain_fall,alertpull,minorpull,majorpull,CreationDate` +
    `&orderByFields=CreationDate+DESC&resultRecordCount=${count}&f=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load flood history');

  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? 'Failed to load flood history');

  return (json.features ?? []).map((f: any) => toReading(f.attributes)).reverse();
}

export function getFloodStatus(
  waterLevel: number,
  alertLevel: number | null,
  minorFloodLevel: number | null,
  majorFloodLevel: number | null
): FloodStatus {
  if (majorFloodLevel != null && waterLevel >= majorFloodLevel) return 'major';
  if (minorFloodLevel != null && waterLevel >= minorFloodLevel) return 'minor';
  if (alertLevel != null && waterLevel >= alertLevel) return 'alert';
  return 'normal';
}
