import { haversineMeters, isValidCoordinate, computeCentroid, uniquePoints, convexHull, hashIds } from '../../../utils/geo';
import { groupPendingReports, ungroupedPendingReports } from '../../../utils/reportGrouping';
import {
  buildFloodIncidents,
  computeIncidentRiskLevel,
  unclusteredFloodReports,
  GROUPING_RADIUS_METERS,
} from '../../../utils/floodIncidents';
import { calculateLast24HourRainfall, normalizeStationName } from '../../../utils/floodCalculations';
import { makeReport, makeReading, north, ts } from '../../helpers/factories';

const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };
const KANDY = { latitude: 7.2906, longitude: 80.6337 };

describe('geo', () => {
  describe('haversineMeters', () => {
    it('is zero for identical points', () => {
      expect(haversineMeters(COLOMBO, COLOMBO)).toBe(0);
    });
    it('measures Colombo → Kandy at roughly 94 km', () => {
      expect(haversineMeters(COLOMBO, KANDY) / 1000).toBeCloseTo(94.4, 0);
    });
    it('is symmetric', () => {
      expect(haversineMeters(COLOMBO, KANDY)).toBeCloseTo(haversineMeters(KANDY, COLOMBO), 6);
    });
    it('agrees with the north() helper to within a metre', () => {
      expect(haversineMeters(COLOMBO, north(COLOMBO.latitude, COLOMBO.longitude, 500))).toBeCloseTo(500, 0);
    });
  });

  describe('isValidCoordinate', () => {
    it.each([
      [0, 0, true],
      [90, 180, true],
      [-90, -180, true],
      [90.0001, 0, false],
      [0, -180.1, false],
      [NaN, 0, false],
      [Infinity, 0, false],
      ['6.9', 79.8, false],
      [null, 79.8, false],
      [undefined, undefined, false],
    ])('(%p, %p) → %p', (lat, lng, expected) => {
      expect(isValidCoordinate(lat, lng)).toBe(expected);
    });
  });

  it('computeCentroid averages coordinates', () => {
    expect(computeCentroid([{ latitude: 0, longitude: 0 }, { latitude: 2, longitude: 4 }])).toEqual({ latitude: 1, longitude: 2 });
  });

  it('computeCentroid of an empty list is NaN (callers must guard)', () => {
    const c = computeCentroid([]);
    expect(Number.isNaN(c.latitude)).toBe(true);
  });

  it('uniquePoints collapses fixes closer than ~11 cm and keeps the first', () => {
    const a = { latitude: 6.1234561, longitude: 80.0000001 };
    const b = { latitude: 6.1234562, longitude: 80.0000002 };
    const c = { latitude: 6.2, longitude: 80 };
    expect(uniquePoints([a, b, c])).toEqual([a, c]);
  });

  describe('convexHull', () => {
    it('returns fewer than 3 distinct points as-is', () => {
      expect(convexHull([COLOMBO, COLOMBO])).toEqual([COLOMBO]);
    });

    it('drops interior points of a square', () => {
      const sq = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
        { latitude: 1, longitude: 1 },
        { latitude: 1, longitude: 0 },
        { latitude: 0.5, longitude: 0.5 },
      ];
      const hull = convexHull(sq);
      expect(hull).toHaveLength(4);
      expect(hull).not.toContainEqual({ latitude: 0.5, longitude: 0.5 });
    });

    it('drops collinear edge points', () => {
      const pts = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0.5 },
        { latitude: 0, longitude: 1 },
        { latitude: 1, longitude: 0 },
      ];
      expect(convexHull(pts)).toHaveLength(3);
    });

    it('returns a degenerate 2-point "hull" for 3+ fully collinear points', () => {
      const line = [0, 1, 2].map((i) => ({ latitude: i, longitude: i }));
      expect(convexHull(line)).toHaveLength(2);
    });
  });

  describe('hashIds', () => {
    it('is order-independent', () => {
      expect(hashIds(['a', 'b', 'c'])).toBe(hashIds(['c', 'a', 'b']));
    });
    it('differs for different sets', () => {
      expect(hashIds(['a', 'b'])).not.toBe(hashIds(['a', 'c']));
    });
    it('does not mutate its input', () => {
      const ids = ['b', 'a'];
      hashIds(ids);
      expect(ids).toEqual(['b', 'a']);
    });
    it('produces a base-36 string', () => {
      expect(hashIds(['x'])).toMatch(/^[0-9a-z]+$/);
    });
  });
});

describe('reportGrouping', () => {
  it('groups same-type reports within 3 km and labels them INC-001…', () => {
    const a = makeReport({ location: COLOMBO, createdAt: ts(1) });
    const b = makeReport({ location: north(COLOMBO.latitude, COLOMBO.longitude, 2000), createdAt: ts(2) });
    const groups = groupPendingReports([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('INC-001');
    expect(groups[0].reports.map((r) => r.id)).toEqual([a.id, b.id]);
    expect(groups[0].centroid!.latitude).toBeCloseTo((a.location!.latitude + b.location!.latitude) / 2, 8);
  });

  it('does not group reports more than 3 km apart', () => {
    const a = makeReport({ location: COLOMBO });
    const b = makeReport({ location: north(COLOMBO.latitude, COLOMBO.longitude, 3500) });
    expect(groupPendingReports([a, b])).toEqual([]);
  });

  it('never mixes disaster types', () => {
    const a = makeReport({ location: COLOMBO, disasterType: 'flood' });
    const b = makeReport({ location: COLOMBO, disasterType: 'landslide' });
    expect(groupPendingReports([a, b])).toEqual([]);
  });

  it('falls back to a case/whitespace-insensitive affectedArea match when GPS is missing', () => {
    const a = makeReport({ affectedArea: ' Kelaniya ' });
    const b = makeReport({ affectedArea: 'kelaniya' });
    const groups = groupPendingReports([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].centroid).toBeNull();
  });

  it('uses the area fallback when only one of the pair has GPS', () => {
    const a = makeReport({ affectedArea: 'Wattala', location: COLOMBO });
    const b = makeReport({ affectedArea: 'Wattala' });
    const [g] = groupPendingReports([a, b]);
    expect(g.reports).toHaveLength(2);
    expect(g.centroid).toEqual(COLOMBO);
  });

  it('seeds clusters from the oldest report and orders groups by size', () => {
    const far = north(COLOMBO.latitude, COLOMBO.longitude, 50_000);
    const small = [makeReport({ location: far, createdAt: ts(1) }), makeReport({ location: far, createdAt: ts(2) })];
    const big = [3, 4, 5].map((t) => makeReport({ location: COLOMBO, createdAt: ts(t) }));
    const groups = groupPendingReports([...small, ...big]);
    expect(groups.map((g) => g.reports.length)).toEqual([3, 2]);
    expect(groups.map((g) => g.id)).toEqual(['INC-001', 'INC-002']);
  });

  it('treats a null createdAt as oldest', () => {
    const late = makeReport({ location: COLOMBO, createdAt: ts(100) });
    const undated = makeReport({ location: COLOMBO, createdAt: null });
    const [g] = groupPendingReports([late, undated]);
    expect(g.reports[0].id).toBe(undated.id);
  });

  it('ungroupedPendingReports returns everything not in a group', () => {
    const a = makeReport({ location: COLOMBO });
    const b = makeReport({ location: COLOMBO });
    const lone = makeReport({ location: KANDY });
    const groups = groupPendingReports([a, b, lone]);
    expect(ungroupedPendingReports([a, b, lone], groups)).toEqual([lone]);
  });

  it('handles an empty list', () => {
    expect(groupPendingReports([])).toEqual([]);
  });
});

describe('floodIncidents', () => {
  const verifiedFlood = (loc: { latitude: number; longitude: number }, extra = {}) =>
    makeReport({ status: 'Verified', disasterType: 'flood', location: loc, ...extra });

  it.each([
    [0, 'LOW'],
    [2, 'LOW'],
    [3, 'MEDIUM'],
    [4, 'MEDIUM'],
    [5, 'HIGH'],
    [6, 'HIGH'],
    [7, 'CRITICAL'],
    [50, 'CRITICAL'],
  ])('computeIncidentRiskLevel(%i) → %s', (n, level) => {
    expect(computeIncidentRiskLevel(n)).toBe(level);
  });

  it('only clusters Verified flood reports', () => {
    const reports = [
      makeReport({ status: 'Pending', location: COLOMBO }),
      makeReport({ status: 'Pending', location: COLOMBO }),
      makeReport({ status: 'Verified', disasterType: 'landslide', location: COLOMBO }),
      makeReport({ status: 'Verified', disasterType: 'landslide', location: COLOMBO }),
    ];
    expect(buildFloodIncidents(reports)).toEqual([]);
  });

  it(`links reports within GROUPING_RADIUS_METERS (${GROUPING_RADIUS_METERS} m)`, () => {
    const a = verifiedFlood(COLOMBO);
    const b = verifiedFlood(north(COLOMBO.latitude, COLOMBO.longitude, GROUPING_RADIUS_METERS - 10));
    const c = verifiedFlood(north(COLOMBO.latitude, COLOMBO.longitude, 10 * GROUPING_RADIUS_METERS));
    const incidents = buildFloodIncidents([a, b, c]);
    expect(incidents).toHaveLength(1);
    expect(incidents[0].reports.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('chains single-link clusters: A–B and B–C close, A–C far, all one incident', () => {
    const step = GROUPING_RADIUS_METERS * 0.9;
    const pts = [0, 1, 2].map((i) => verifiedFlood(north(COLOMBO.latitude, COLOMBO.longitude, i * step)));
    const incidents = buildFloodIncidents(pts);
    expect(incidents).toHaveLength(1);
    expect(incidents[0].reports).toHaveLength(3);
  });

  it('reads flat latitude/longitude when the nested location is absent', () => {
    const a = makeReport({ status: 'Verified', latitude: COLOMBO.latitude, longitude: COLOMBO.longitude });
    const b = makeReport({ status: 'Verified', latitude: COLOMBO.latitude + 0.001, longitude: COLOMBO.longitude });
    expect(buildFloodIncidents([a, b])).toHaveLength(1);
  });

  it('skips reports with invalid coordinates', () => {
    const a = verifiedFlood(COLOMBO);
    const bad = makeReport({ status: 'Verified', location: { latitude: 999, longitude: 0 } });
    expect(buildFloodIncidents([a, bad])).toEqual([]);
  });

  it('uses a circle (min 150 m radius) for fewer than 3 distinct points', () => {
    const [incident] = buildFloodIncidents([verifiedFlood(COLOMBO), verifiedFlood(COLOMBO)]);
    expect(incident.polygon).toBeNull();
    expect(incident.radiusMeters).toBe(150);
  });

  it('pads the circle 60 m past the furthest member', () => {
    const [incident] = buildFloodIncidents([
      verifiedFlood(COLOMBO),
      verifiedFlood(north(COLOMBO.latitude, COLOMBO.longitude, 400)),
    ]);
    expect(incident.radiusMeters).toBeCloseTo(200 + 60, 0);
  });

  it('builds a convex-hull polygon for 3+ distinct points', () => {
    const reports = [
      verifiedFlood(COLOMBO),
      verifiedFlood({ latitude: COLOMBO.latitude + 0.002, longitude: COLOMBO.longitude }),
      verifiedFlood({ latitude: COLOMBO.latitude, longitude: COLOMBO.longitude + 0.002 }),
    ];
    const [incident] = buildFloodIncidents(reports);
    expect(incident.polygon).toHaveLength(3);
    expect(incident.riskLevel).toBe('MEDIUM');
  });

  it('produces a stable id from member ids, independent of input order', () => {
    const a = verifiedFlood(COLOMBO);
    const b = verifiedFlood(COLOMBO);
    expect(buildFloodIncidents([a, b])[0].id).toBe(buildFloodIncidents([b, a])[0].id);
    expect(buildFloodIncidents([a, b])[0].id).toMatch(/^FLD-/);
  });

  it('names the incident after the most common affectedArea and stamps the latest createdAt', () => {
    const reports = [
      verifiedFlood(COLOMBO, { affectedArea: 'Wattala', createdAt: ts(1000) }),
      verifiedFlood(COLOMBO, { affectedArea: 'Kelaniya', createdAt: ts(3000) }),
      verifiedFlood(COLOMBO, { affectedArea: 'Kelaniya ', createdAt: null }),
    ];
    const [incident] = buildFloodIncidents(reports);
    expect(incident.affectedArea).toBe('Kelaniya');
    expect(incident.generatedAt!.toMillis()).toBe(3000);
  });

  it('sorts incidents by size, largest first', () => {
    const farAway = north(COLOMBO.latitude, COLOMBO.longitude, 50_000);
    const incidents = buildFloodIncidents([
      verifiedFlood(farAway),
      verifiedFlood(farAway),
      verifiedFlood(COLOMBO),
      verifiedFlood(COLOMBO),
      verifiedFlood(COLOMBO),
    ]);
    expect(incidents.map((i) => i.reports.length)).toEqual([3, 2]);
  });

  it('unclusteredFloodReports returns verified floods outside every incident', () => {
    const a = verifiedFlood(COLOMBO);
    const b = verifiedFlood(COLOMBO);
    const lone = verifiedFlood(KANDY);
    const pending = makeReport({ status: 'Pending', location: KANDY });
    const incidents = buildFloodIncidents([a, b, lone, pending]);
    expect(unclusteredFloodReports([a, b, lone, pending], incidents)).toEqual([lone]);
  });

  it('documents the grouping radius actually in force (comments elsewhere still say 300 m)', () => {
    expect(GROUPING_RADIUS_METERS).toBe(1000);
  });
});

describe('floodCalculations', () => {
  it('normalizeStationName trims, lowercases and collapses whitespace', () => {
    expect(normalizeStationName('  Nagalagam   Street ')).toBe('nagalagam street');
  });

  const H = 3_600_000;
  const T = 1_700_000_000_000;

  it('returns null when no readings match the station', () => {
    expect(calculateLast24HourRainfall([makeReading({ gauge: 'Other' })], 'Hanwella')).toBeNull();
  });

  it('sums the trailing 24 h relative to the latest reading', () => {
    const history = [
      makeReading({ timestamp: T, rainFall: 5 }),
      makeReading({ timestamp: T - 23 * H, rainFall: 3 }),
      makeReading({ timestamp: T - 25 * H, rainFall: 100 }),
    ];
    expect(calculateLast24HourRainfall(history, 'hanwella')).toBe(8);
  });

  it('includes a reading exactly 24 h old', () => {
    const history = [makeReading({ timestamp: T, rainFall: 1 }), makeReading({ timestamp: T - 24 * H, rainFall: 2 })];
    expect(calculateLast24HourRainfall(history, 'Hanwella')).toBe(3);
  });

  it('ignores duplicate timestamps, negative, null and non-finite rainfall', () => {
    const history = [
      makeReading({ timestamp: T, rainFall: 4 }),
      makeReading({ timestamp: T, rainFall: 4 }),
      makeReading({ timestamp: T - H, rainFall: -1 }),
      makeReading({ timestamp: T - 2 * H, rainFall: null }),
      makeReading({ timestamp: T - 3 * H, rainFall: NaN }),
    ];
    expect(calculateLast24HourRainfall(history, 'Hanwella')).toBe(4);
  });

  it('honours an explicit reference timestamp', () => {
    const history = [makeReading({ timestamp: T - 30 * H, rainFall: 7 })];
    expect(calculateLast24HourRainfall(history, 'Hanwella', T)).toBeNull();
    expect(calculateLast24HourRainfall(history, 'Hanwella', T - 29 * H)).toBe(7);
  });

  it('counts zero rainfall as a valid reading', () => {
    expect(calculateLast24HourRainfall([makeReading({ timestamp: T, rainFall: 0 })], 'Hanwella')).toBe(0);
  });
});
