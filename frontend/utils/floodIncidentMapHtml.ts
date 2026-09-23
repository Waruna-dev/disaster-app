import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { ReportLocation } from '../types/report';
import { FloodIncidentReport } from '../types/floodIncident';
import { BOUNDARY_DOTS_SCRIPT } from './leafletBoundaryScript';

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

export interface FloodIncidentMapData {
  reports: FloodIncidentReport[];
  centroid: ReportLocation;
  polygon: ReportLocation[] | null;
  radiusMeters: number;
  riskLevel: RiskLevel;
}

/**
 * Read-only map for one flood incident: 300m grouping circles, the affected-area
 * polygon (or circle fallback), and a report/risk overlay — rendered on the same
 * OpenStreetMap tiles every other screen's WebView+Leaflet map uses (see
 * utils/reportMap.ts, utils/userMapHtml.ts, utils/warningMapHtml.ts). Still
 * WebView+Leaflet under the hood, for the same reason every other map here is
 * (react-native-maps renders solid black on Android under the New Architecture —
 * react-native-maps/react-native-maps#5462).
 */
export function buildFloodIncidentMapHtml(data: FloodIncidentMapData): string {
  const zoneColor = RISK_COLOR[data.riskLevel];
  const points = data.reports.map((r) => ({
    id: r.id,
    lat: r.location.latitude,
    lng: r.location.longitude,
    ref: r.referenceNumber,
    area: r.affectedArea,
  }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef2f1; }
    .leaflet-control-attribution { font-size: 9px; }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 140px; }
    .popup-title { font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
    .report-pin {
      width: 24px; height: 24px; border-radius: 50%;
      background: #E4402F; border: 2px solid #FFFFFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .boundary-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #FFFFFF; border: 1.5px solid rgba(0,0,0,0.25);
      box-shadow: 0 0 3px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${JSON.stringify(points)};
    var polygon = ${JSON.stringify(data.polygon)};
    var centroid = ${JSON.stringify(data.centroid)};
    var radiusMeters = ${data.radiusMeters};
    var zoneColor = '${zoneColor}';
    var BOUNDARY_DOT_SPACING_M = 45;
    ${BOUNDARY_DOTS_SCRIPT}
    var map = L.map('map', { zoomControl: true }).setView([centroid.latitude, centroid.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var bounds = [];
    var boundaryPoints;

    // Affected-area boundary: the convex-hull polygon when there are enough distinct
    // points, otherwise a solid reference circle (never a polygon from <3 points).
    // Either way the outline is traced with evenly-spaced white dots, matching the
    // reference design, instead of a dashed grouping circle per report.
    if (polygon && polygon.length >= 3) {
      var ring = polygon.map(function (p) { return [p.latitude, p.longitude]; });
      L.polygon(ring, {
        color: zoneColor,
        weight: 2,
        fillColor: zoneColor,
        fillOpacity: 0.32,
      }).addTo(map);
      ring.forEach(function (ll) { bounds.push(ll); });
      boundaryPoints = boundaryDots(polygon, BOUNDARY_DOT_SPACING_M);
    } else {
      L.circle([centroid.latitude, centroid.longitude], {
        radius: radiusMeters,
        color: zoneColor,
        weight: 2,
        fillColor: zoneColor,
        fillOpacity: 0.32,
      }).addTo(map);
      boundaryPoints = circleDots({ lat: centroid.latitude, lng: centroid.longitude }, radiusMeters, BOUNDARY_DOT_SPACING_M);
    }

    boundaryPoints.forEach(function (p) {
      var dotIcon = L.divIcon({ html: '<div class="boundary-dot"></div>', className: '', iconSize: [8, 8], iconAnchor: [4, 4] });
      L.marker([p.lat, p.lng], { icon: dotIcon, interactive: false }).addTo(map);
    });

    points.forEach(function (p) {
      var icon = L.divIcon({
        html: '<div class="report-pin">\u{1F4A7}</div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
      var popupHtml =
        '<div class="popup">' +
          '<div class="popup-title">' + p.ref + '</div>' +
          '<div class="popup-meta">' + p.area + '</div>' +
        '</div>';
      marker.bindPopup(popupHtml);
      marker.on('click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reportTap', id: p.id }));
      });
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    }
  </script>
</body>
</html>`;
}
