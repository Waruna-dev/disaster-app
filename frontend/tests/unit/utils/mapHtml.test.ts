import vm from 'vm';
import { buildReportsMapHtml, STATUS_PIN, LANDSLIDE_PIN_COLOR, DEFAULT_REGION, PinnedReport, IncidentZone, WarningZone } from '../../../utils/reportMap';
import { buildWarningMapHtml, getZoneColor, getZoneDashArray, LANDSLIDE_ZONE_COLOR } from '../../../utils/warningMapHtml';
import { buildWarningsMapHtml, WarningMapItem } from '../../../utils/warningsMapHtml';
import { buildPolygonDrawMapHtml } from '../../../utils/polygonDrawMapHtml';
import { buildFloodIncidentMapHtml } from '../../../utils/floodIncidentMapHtml';
import { buildUserMapHtml } from '../../../utils/userMapHtml';
import { BOUNDARY_DOTS_SCRIPT } from '../../../utils/leafletBoundaryScript';
import { Colors } from '../../../constants/colors';
import { runMapHtml, clickPopupButton, inlineScripts } from '../../helpers/leafletSandbox';
import { makeReport } from '../../helpers/factories';

const C = { latitude: 6.9271, longitude: 79.8612 };
const TRI = [
  { latitude: 6.92, longitude: 79.86 },
  { latitude: 6.93, longitude: 79.86 },
  { latitude: 6.93, longitude: 79.87 },
];

const pin = (overrides: Partial<PinnedReport> = {}) => makeReport({ location: C, ...overrides }) as PinnedReport;

const zone = (overrides: Partial<IncidentZone> = {}): IncidentZone => ({
  id: 'FLD-1',
  affectedArea: 'Kelaniya',
  reportCount: 3,
  riskLevel: 'MEDIUM',
  reviewStatus: 'Pending',
  centroid: C,
  polygon: null,
  radiusMeters: 300,
  ...overrides,
});

const warningZone = (overrides: Partial<WarningZone> = {}): WarningZone => ({
  id: 'w1',
  title: 'Flood alert',
  affectedArea: 'Kelaniya',
  riskLevel: 'HIGH',
  status: 'Active',
  centroid: C,
  polygon: null,
  radiusMeters: 500,
  ...overrides,
});

describe('getZoneColor / getZoneDashArray', () => {
  it.each([
    ['LOW', '#2E75D6'],
    ['MEDIUM', '#EAB308'],
    ['HIGH', Colors.warning],
    ['CRITICAL', Colors.danger],
    ['UNKNOWN', Colors.warning],
  ])('flood %s → %s', (risk, color) => {
    expect(getZoneColor('flood', risk)).toBe(color);
  });

  it('paints landslide zones brown at every risk level', () => {
    for (const risk of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) expect(getZoneColor('landslide', risk)).toBe(LANDSLIDE_ZONE_COLOR);
  });

  it('dashes only landslide borders', () => {
    expect(getZoneDashArray('landslide')).toBe('8,5');
    expect(getZoneDashArray('flood')).toBeNull();
  });
});

describe('BOUNDARY_DOTS_SCRIPT', () => {
  const ctx: any = { Math };
  vm.createContext(ctx);
  vm.runInContext(BOUNDARY_DOTS_SCRIPT, ctx);

  it('haversineM matches a known distance (1° latitude ≈ 111.2 km)', () => {
    expect(ctx.haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000).toBeCloseTo(111.19, 1);
  });

  it('circleDots places at least 12 dots, all on the radius', () => {
    const dots = ctx.circleDots({ lat: C.latitude, lng: C.longitude }, 100, 45);
    expect(dots.length).toBe(14); // round(2π·100 / 45)
    for (const d of dots) expect(ctx.haversineM({ lat: C.latitude, lng: C.longitude }, d)).toBeCloseTo(100, 0);
    expect(ctx.circleDots({ lat: 0, lng: 0 }, 10, 45)).toHaveLength(12);
  });

  it('boundaryDots spaces dots evenly along a closed ring', () => {
    const dots = ctx.boundaryDots(TRI, 45);
    expect(dots.length).toBeGreaterThan(10);
    for (let i = 1; i < dots.length; i++) {
      // Consecutive dots along the same edge are exactly `spacing` apart; around a corner they're closer.
      expect(ctx.haversineM(dots[i - 1], dots[i])).toBeLessThanOrEqual(45.5);
    }
  });

  it('boundaryDots skips zero-length edges', () => {
    expect(() => ctx.boundaryDots([TRI[0], TRI[0], TRI[1]], 45)).not.toThrow();
  });
});

describe('buildReportsMapHtml (DMC main map)', () => {
  it('produces a page whose script runs and centres on Sri Lanka with no data', () => {
    const html = buildReportsMapHtml([]);
    expect(html).toContain('<!DOCTYPE html>');
    const sb = runMapHtml(html);
    expect(sb.map.view).toEqual({ center: [DEFAULT_REGION.latitude, DEFAULT_REGION.longitude], zoom: 8 });
    expect(sb.map.fitted).toBeNull();
  });

  it('draws one pin per report coloured by status, landslides filled brown', () => {
    const sb = runMapHtml(
      buildReportsMapHtml([pin({ status: 'Pending' }), pin({ status: 'Verified', disasterType: 'landslide' })])
    );
    const markers = sb.ofKind('marker');
    expect(markers).toHaveLength(2);
    expect(markers[0].args[1].icon.html).toContain(`background:${STATUS_PIN.Pending}`);
    expect(markers[1].args[1].icon.html).toContain(`background:${LANDSLIDE_PIN_COLOR}`);
    expect(markers[1].args[1].icon.html).toContain(`border-color:${STATUS_PIN.Verified}`);
    expect(sb.map.fitted).toHaveLength(2);
  });

  it('zooms to a single pin instead of fitting bounds', () => {
    const sb = runMapHtml(buildReportsMapHtml([pin()]));
    expect(sb.map.view).toEqual({ center: [C.latitude, C.longitude], zoom: 12 });
  });

  it('"View details" in a pin popup posts viewDetails with the report id', () => {
    const r = pin();
    const sb = runMapHtml(buildReportsMapHtml([r]));
    expect(clickPopupButton(sb.ofKind('marker')[0].popup!)).toEqual([{ type: 'viewDetails', id: r.id }]);
  });

  it('draws incident zones as circles (lighter/dashed while Pending) with dotted boundaries', () => {
    const sb = runMapHtml(buildReportsMapHtml([], [zone()]));
    const [circle] = sb.ofKind('circle');
    expect(circle.radius).toBe(300);
    expect(circle.args[1]).toMatchObject({ fillOpacity: 0.16, dashArray: '6,5', color: '#EAB308' });
    expect(sb.ofKind('marker').length).toBeGreaterThanOrEqual(12); // boundary dots
    circle.fire('click');
    expect(sb.messages).toEqual([{ type: 'viewFloodIncident', id: 'FLD-1' }]);
  });

  it('draws an Approved polygon zone solid', () => {
    const sb = runMapHtml(buildReportsMapHtml([], [zone({ polygon: TRI, reviewStatus: 'Approved', reportCount: 1 })]));
    const [poly] = sb.ofKind('polygon');
    expect(poly.args[1]).toMatchObject({ fillOpacity: 0.3, dashArray: null });
    expect(poly.popup).toContain('1 report ·'); // singular
  });

  it('overlays warnings and lets the officer jump to editing one', () => {
    const sb = runMapHtml(buildReportsMapHtml([], [], [warningZone({ hazardType: 'landslide', status: 'Expired' })]));
    const [circle] = sb.ofKind('circle');
    expect(circle.args[1]).toMatchObject({ color: LANDSLIDE_ZONE_COLOR, fillOpacity: 0.1 });
    expect(clickPopupButton(circle.popup!)).toEqual([{ type: 'editWarning', id: 'w1' }]);
  });

  it.failing('KNOWN BUG: a report whose affectedArea contains "</script>" breaks out of the page script', () => {
    // affectedArea is free text typed by residents. JSON.stringify does not escape "</",
    // so this closes the <script> early and the rest is parsed as HTML (script injection in the WebView).
    const html = buildReportsMapHtml([pin({ affectedArea: '</script><script>window.pwned=1</script>' })]);
    expect(inlineScripts(html)).toHaveLength(1);
  });

  it.failing('KNOWN BUG: report text is inserted into popups as raw HTML', () => {
    const sb = runMapHtml(buildReportsMapHtml([pin({ affectedArea: '<img src=x onerror=alert(1)>' })]));
    expect(sb.ofKind('marker')[0].popup).not.toContain('<img');
  });
});

describe('buildWarningMapHtml (create-alert circle picker)', () => {
  it('places a draggable marker and radius circle, reporting moves back to RN', () => {
    const sb = runMapHtml(buildWarningMapHtml(C.latitude, C.longitude, 500, 'HIGH'));
    const [marker] = sb.ofKind('marker');
    const [circle] = sb.ofKind('circle');
    expect(marker.args[1].draggable).toBe(true);
    expect(circle.radius).toBe(500);
    expect(circle.args[1].color).toBe(Colors.warning);

    sb.map.click(7, 80);
    expect(circle.latlng).toEqual({ lat: 7, lng: 80 });
    expect(sb.messages).toEqual([{ type: 'locationChange', lat: 7, lng: 80 }]);

    marker.setLatLng([7.1, 80.1]);
    marker.fire('drag');
    marker.fire('dragend');
    expect(circle.latlng).toEqual({ lat: 7.1, lng: 80.1 });
    expect(sb.messages[1]).toEqual({ type: 'locationChange', lat: 7.1, lng: 80.1 });
  });

  it('exposes window.setRadius / window.setLocation for the RN side', () => {
    const sb = runMapHtml(buildWarningMapHtml(C.latitude, C.longitude, 500, 'LOW'));
    sb.window.setRadius(2000);
    expect(sb.ofKind('circle')[0].radius).toBe(2000);
    sb.window.setLocation(8, 81);
    expect(sb.map.view).toEqual({ center: [8, 81], zoom: 14 });
  });

  it('renders a read-only polygon preview (no marker/circle) when given a polygon', () => {
    const sb = runMapHtml(buildWarningMapHtml(C.latitude, C.longitude, 500, 'HIGH', 'landslide', [], TRI));
    expect(sb.ofKind('circle')).toHaveLength(0);
    const [poly] = sb.ofKind('polygon');
    expect(poly.args[1]).toMatchObject({ color: LANDSLIDE_ZONE_COLOR, dashArray: '8,5' });
    expect(sb.window.setRadius).toBeUndefined();
    expect(sb.map.fitted).toHaveLength(3);
  });

  it('draws incident reference pins and existing warnings as non-interactive labelled shapes', () => {
    const sb = runMapHtml(
      buildWarningMapHtml(C.latitude, C.longitude, 500, 'HIGH', 'flood', [{ id: 'i1', lat: 7, lng: 80, label: 'INC-001' }], null, [
        { id: 'e1', label: 'Old zone', riskLevel: 'CRITICAL', latitude: 7.5, longitude: 80.5, radius: 1000, polygon: null },
      ], true)
    );
    expect(sb.ofKind('marker').find((m) => m.tooltip === 'INC-001')).toBeDefined();
    const existing = sb.ofKind('circle').find((c) => c.tooltip === 'Old zone')!;
    expect(existing.args[1]).toMatchObject({ interactive: false, color: Colors.danger });
    // fitToExisting widens the view to the current pin + every existing zone
    expect(sb.map.fitted).toEqual([[C.latitude, C.longitude], [7.5, 80.5]]);
  });
});

describe('buildPolygonDrawMapHtml (Polygon Creator)', () => {
  it('adds vertices on tap, draws a line at 2 and a polygon at 3, posting the full ring each time', () => {
    const sb = runMapHtml(buildPolygonDrawMapHtml(C.latitude, C.longitude, 'MEDIUM'));
    sb.map.click(1, 1);
    expect(sb.ofKind('polyline')).toHaveLength(0);
    sb.map.click(2, 2);
    expect(sb.ofKind('polyline')).toHaveLength(1);
    sb.map.click(3, 1);
    expect(sb.ofKind('polyline')).toHaveLength(0);
    expect(sb.ofKind('polygon')).toHaveLength(1);
    expect(sb.messages.at(-1)).toEqual({
      type: 'polygonChange',
      points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 1 }],
    });
  });

  it('undoLastPoint and clearPoints update the ring and report back', () => {
    const sb = runMapHtml(buildPolygonDrawMapHtml(C.latitude, C.longitude, 'HIGH'));
    [1, 2, 3].forEach((i) => sb.map.click(i, i * 2));
    sb.window.undoLastPoint();
    expect(sb.messages.at(-1).points).toHaveLength(2);
    expect(sb.ofKind('polygon')).toHaveLength(0);
    sb.window.clearPoints();
    expect(sb.messages.at(-1).points).toEqual([]);
    expect(sb.ofKind('marker')).toHaveLength(0);
    expect(() => sb.window.undoLastPoint()).not.toThrow();
  });

  it('dragging a vertex reshapes the polygon and reports on dragend', () => {
    const sb = runMapHtml(buildPolygonDrawMapHtml(C.latitude, C.longitude, 'HIGH', 'flood', TRI));
    expect(sb.messages.at(-1).points).toHaveLength(3);
    const vertex = sb.ofKind('marker')[0];
    vertex.setLatLng([9, 9]);
    vertex.fire('drag');
    vertex.fire('dragend');
    expect(sb.messages.at(-1).points[0]).toEqual({ lat: 9, lng: 9 });
  });

  it('fits the opening view to the starting polygon', () => {
    const sb = runMapHtml(buildPolygonDrawMapHtml(C.latitude, C.longitude, 'HIGH', 'flood', TRI));
    expect(sb.map.fitted).toHaveLength(3);
  });
});

describe('buildFloodIncidentMapHtml', () => {
  const reports = [
    { id: 'a', referenceNumber: 'REP-1', affectedArea: 'Kelaniya', location: TRI[0], createdAt: null },
    { id: 'b', referenceNumber: 'REP-2', affectedArea: 'Kelaniya', location: TRI[1], createdAt: null },
  ];

  it('draws the circle fallback plus dotted boundary and report pins', () => {
    const sb = runMapHtml(buildFloodIncidentMapHtml({ reports, centroid: C, polygon: null, radiusMeters: 250, riskLevel: 'LOW' }));
    const [circle] = sb.ofKind('circle');
    expect(circle.radius).toBe(250);
    expect(circle.args[1].fillColor).toBe('#2E75D6');
    const pins = sb.ofKind('marker').filter((m) => m.popup);
    expect(pins).toHaveLength(2);
    pins[1].fire('click');
    expect(sb.messages).toEqual([{ type: 'reportTap', id: 'b' }]);
  });

  it('draws the convex-hull polygon when present', () => {
    const sb = runMapHtml(buildFloodIncidentMapHtml({ reports, centroid: C, polygon: TRI, radiusMeters: 250, riskLevel: 'CRITICAL' }));
    expect(sb.ofKind('polygon')[0].args[1].fillColor).toBe(Colors.danger);
    expect(sb.ofKind('circle')).toHaveLength(0);
  });
});

describe('buildWarningsMapHtml (all warnings overview)', () => {
  const item = (o: Partial<WarningMapItem> = {}): WarningMapItem => ({
    id: 'w1',
    title: 'Flood',
    affectedArea: 'Kelaniya',
    hazardType: 'flood',
    riskLevel: 'CRITICAL',
    status: 'Active',
    latitude: 7,
    longitude: 80,
    radius: 800,
    polygon: null,
    ...o,
  });

  it('draws every warning, dimmer and dashed when not Active', () => {
    const sb = runMapHtml(buildWarningsMapHtml([item(), item({ id: 'w2', status: 'Cancelled', polygon: TRI, hazardType: 'landslide' })]));
    const [circle] = sb.ofKind('circle');
    const [poly] = sb.ofKind('polygon');
    expect(circle.args[1]).toMatchObject({ fillColor: Colors.danger, fillOpacity: 0.32, dashArray: null });
    expect(poly.args[1]).toMatchObject({ fillColor: LANDSLIDE_ZONE_COLOR, fillOpacity: 0.14, dashArray: '6,5' });
    expect(poly.popup).toContain('Landslide &middot;');
    expect(clickPopupButton(poly.popup!)).toEqual([{ type: 'editWarning', id: 'w2' }]);
  });

  it('zooms to a single warning', () => {
    const sb = runMapHtml(buildWarningsMapHtml([item()]));
    expect(sb.map.view).toEqual({ center: [7, 80], zoom: 13 });
  });
});

describe('buildUserMapHtml (resident map)', () => {
  it('renders warning zones and forwards taps as mapTap', () => {
    const sb = runMapHtml(buildUserMapHtml([], [warningZone()]));
    expect(sb.ofKind('circle')).toHaveLength(1);
    sb.map.click(7, 80);
    expect(sb.messages).toEqual([{ type: 'mapTap', lat: 7, lng: 80 }]);
    expect(sb.ofKind('marker')).toHaveLength(1); // selected-location pin
  });

  it('window.updateWarnings replaces the drawn zones', () => {
    const sb = runMapHtml(buildUserMapHtml([], [warningZone(), warningZone({ id: 'w2', polygon: TRI })]));
    expect(sb.ofKind('circle')).toHaveLength(1);
    expect(sb.ofKind('polygon')).toHaveLength(1);
    sb.window.updateWarnings('[]');
    expect(sb.ofKind('circle')).toHaveLength(0);
    expect(sb.ofKind('polygon')).toHaveLength(0);
  });

  it('centerOnUser moves the selected pin and zooms in', () => {
    const sb = runMapHtml(buildUserMapHtml([]));
    sb.window.centerOnUser(7.5, 80.5);
    sb.window.centerOnUser(7.6, 80.6);
    expect(sb.ofKind('marker')).toHaveLength(1);
    expect(sb.ofKind('marker')[0].latlng).toEqual([7.6, 80.6]);
    expect(sb.map.view).toEqual({ center: [7.6, 80.6], zoom: 14 });
  });

  it('ignores reports without coordinates when building the payload', () => {
    const html = buildUserMapHtml([makeReport({ latitude: 7, longitude: 80 }), makeReport()]);
    expect(html).toMatch(/var points = \[\{"id":"r\d+","lat":7,"lng":80,"type":"flood"\}\];/);
  });

  it.failing("LATENT BUG (UserMapEngine currently passes no warnings here): an apostrophe in a warning title (e.g. \"St. Mary's Rd\") makes the whole page script throw", () => {
    // Warnings are injected as window.updateWarnings('<json>') — a single-quoted JS string.
    expect(() => runMapHtml(buildUserMapHtml([], [warningZone({ title: "St. Mary's Rd" })]))).not.toThrow();
  });

  it.failing('LATENT BUG: a double quote in a warning title silently drops every warning from the map', () => {
    const sb = runMapHtml(buildUserMapHtml([], [warningZone({ title: 'The "Red" zone' }), warningZone({ id: 'w2' })]));
    expect(sb.ofKind('circle')).toHaveLength(2);
  });
});
