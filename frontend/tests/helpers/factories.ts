import { Timestamp } from 'firebase/firestore';
import type { Report } from '../../types/report';
import type { Warning } from '../../types/alert';
import type { FloodReading, FloodStation } from '../../types/flood';

/** Firestore Timestamp (mocked class) for a given ms epoch. */
export const ts = (ms: number) => Timestamp.fromMillis(ms) as unknown as Timestamp;

let seq = 0;

export function makeReport(overrides: Partial<Report> = {}): Report {
  seq += 1;
  return {
    id: `r${seq}`,
    userId: 'user-1',
    disasterType: 'flood',
    affectedArea: 'Kelaniya',
    description: 'Water rising near the bridge',
    status: 'Pending',
    referenceNumber: `REP-${10000 + seq}`,
    createdAt: ts(1_700_000_000_000 + seq * 1000),
    ...overrides,
  };
}

/** A point `metersNorth` metres due north of (lat, lng) — 1° latitude ≈ 111,195 m. */
export function north(lat: number, lng: number, metersNorth: number) {
  return { latitude: lat + metersNorth / 111_195, longitude: lng };
}

export function makeWarning(overrides: Partial<Warning> = {}): Warning {
  seq += 1;
  return {
    id: `w${seq}`,
    title: 'Flood warning',
    hazardType: 'flood',
    riskLevel: 'HIGH',
    affectedArea: 'Kelaniya',
    latitude: 6.95,
    longitude: 79.92,
    radius: 500,
    polygon: null,
    message: 'Move to higher ground',
    status: 'Active',
    createdBy: 'admin-1',
    createdByName: 'Officer',
    sourceReportId: null,
    createdAt: ts(Date.now() - 60_000),
    expiresAt: ts(Date.now() + 3_600_000),
    ...overrides,
  };
}

export function makeStation(overrides: Partial<FloodStation> = {}): FloodStation {
  return {
    station: 'Hanwella',
    basin: 'Kelani Ganga',
    alertLevel: 7,
    minorFloodLevel: 8,
    majorFloodLevel: 10,
    unit: 'm',
    ...overrides,
  };
}

export function makeReading(overrides: Partial<FloodReading> = {}): FloodReading {
  return {
    gauge: 'Hanwella',
    basin: 'Kelani Ganga',
    waterLevel: 5,
    rainFall: 2,
    alertLevel: 7,
    minorFloodLevel: 8,
    majorFloodLevel: 10,
    timestamp: Date.now() - 10 * 60_000,
    ...overrides,
  };
}

/** A fetch() Response stand-in. */
export function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; contentType?: string } = {}) {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? init.contentType ?? 'application/json' : null) },
    json: async () => body,
  } as unknown as Response;
}
