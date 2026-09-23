import { Colors } from '../constants/colors';
import { Report, ReportLocation, ReportStatus } from '../types/report';
import { RiskLevel } from '../types/alert';
import { IncidentReviewStatus } from '../types/floodIncident';
import { BOUNDARY_DOTS_SCRIPT } from './leafletBoundaryScript';

export type PinnedReport = Report & { location: NonNullable<Report['location']> };

const ZONE_RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

/**
 * A flood incident's affected-area shape (see utils/floodIncidents.ts), for
 * overlaying auto-generated polygons on the DMC main map alongside the individual
 * report pins. Kept as a plain subset here (not importing FloodIncidentWithReview
 * directly) so this map util doesn't depend on the flood-incident feature's hook.
 */
export interface IncidentZone {
  id: string;
  affectedArea: string;
  reportCount: number;
  riskLevel: RiskLevel;
  reviewStatus: IncidentReviewStatus;
  centroid: ReportLocation;
  polygon: ReportLocation[] | null;
  radiusMeters: number;
}

export const STATUS_PIN: Record<ReportStatus, string> = {
  Pending: Colors.warning,
  Verified: Colors.primary,
  Rejected: Colors.danger,
};

export const DISASTER_SYMBOL: Record<Report['disasterType'], string> = {
  flood: '\u{1F30A}',
  landslide: '⛰',
};

// Sri Lanka's approximate centre — the Leaflet page starts here, then fits its
// bounds to the pins once they're known (see buildReportsMapHtml).
export const DEFAULT_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

// Renders an OpenStreetMap (Leaflet) page for a WebView — react-native-maps' native
// Google Maps view renders solid black on Android under React Native's New
// Architecture (unresolved upstream: react-native-maps/react-native-maps#5462), and
// that architecture is mandatory as of RN 0.82+ with no opt-out. A WebView + Leaflet
// avoids the native Maps SDK entirely and needs no Google Maps API key. Tapping a
// pin's "View details" posts {type:'viewDetails', id} back to the host WebView.
// Zones render underneath report pins (added to the map first), each as its
// affected-area polygon (or circle fallback) traced with the same dotted white
// boundary as the flood-incident detail map (utils/floodIncidentMapHtml.ts, via
// the shared BOUNDARY_DOTS_SCRIPT) — an auto-generated area an officer hasn't
// approved yet renders lighter/dashed so it reads as unconfirmed at a glance.
export function buildReportsMapHtml(pins: PinnedReport[], zones: IncidentZone[] = []): string {
  const points = pins.map((p) => ({
    id: p.id,
    lat: p.location.latitude,
    lng: p.location.longitude,
    color: STATUS_PIN[p.status],
    symbol: DISASTER_SYMBOL[p.disasterType],
    area: p.affectedArea,
    ref: p.referenceNumber,
    status: p.status,
  }));

  const zonePayload = zones.map((z) => ({
    id: z.id,
    centroid: z.centroid,
    polygon: z.polygon,
    radiusMeters: z.radiusMeters,
    color: ZONE_RISK_COLOR[z.riskLevel],
    approved: z.reviewStatus === 'Approved',
    label: z.affectedArea,
    meta: `${z.reportCount} report${z.reportCount === 1 ? '' : 's'} · ${z.riskLevel} risk · ${z.reviewStatus}`,
  }));

  const tileLayerScript = `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef2f1; }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 150px; }
    .popup-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; margin-bottom: 4px; }
    .popup-link { font-size: 11px; font-weight: 700; color: ${Colors.primary}; background: none; border: none; padding: 0; cursor: pointer; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
    .pin { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
    .zone-boundary-dot { width: 7px; height: 7px; border-radius: 50%; background: #FFFFFF; border: 1.5px solid rgba(0,0,0,0.25); box-shadow: 0 0 3px rgba(0,0,0,0.4); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${JSON.stringify(points)};
    var zones = ${JSON.stringify(zonePayload)};
    var ZONE_DOT_SPACING_M = 45;
    ${BOUNDARY_DOTS_SCRIPT}

    var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 8);

    ${tileLayerScript}

    var bounds = [];

    zones.forEach(function (z) {
      var shapeOptions = {
        color: z.color,
        weight: 2,
        fillColor: z.color,
        fillOpacity: z.approved ? 0.3 : 0.16,
        dashArray: z.approved ? null : '6,5',
      };
      var boundaryPoints;

      if (z.polygon && z.polygon.length >= 3) {
        var ring = z.polygon.map(function (p) { return [p.latitude, p.longitude]; });
        var poly = L.polygon(ring, shapeOptions).addTo(map);
        poly.bindPopup('<div class="popup"><div class="popup-title">' + z.label + '</div><div class="popup-meta">' + z.meta + '</div></div>');
        poly.on('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'viewFloodIncident', id: z.id }));
        });
        ring.forEach(function (ll) { bounds.push(ll); });
        boundaryPoints = boundaryDots(z.polygon, ZONE_DOT_SPACING_M);
      } else {
        var circle = L.circle([z.centroid.latitude, z.centroid.longitude], Object.assign({ radius: z.radiusMeters }, shapeOptions)).addTo(map);
        circle.bindPopup('<div class="popup"><div class="popup-title">' + z.label + '</div><div class="popup-meta">' + z.meta + '</div></div>');
        circle.on('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'viewFloodIncident', id: z.id }));
        });
        bounds.push([z.centroid.latitude, z.centroid.longitude]);
        boundaryPoints = circleDots({ lat: z.centroid.latitude, lng: z.centroid.longitude }, z.radiusMeters, ZONE_DOT_SPACING_M);
      }

      boundaryPoints.forEach(function (p) {
        var dotIcon = L.divIcon({ html: '<div class="zone-boundary-dot"></div>', className: '', iconSize: [7, 7], iconAnchor: [3.5, 3.5] });
        L.marker([p.lat, p.lng], { icon: dotIcon, interactive: false }).addTo(map);
      });
    });

    var markers = [];
    points.forEach(function (p) {
      var icon = L.divIcon({
        html: '<div class="pin" style="background:' + p.color + '">' + p.symbol + '</div>',
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);

      var popupHtml =
        '<div class="popup">' +
          '<div class="popup-title"><span>' + p.symbol + '</span><span>' + p.area + '</span></div>' +
          '<div class="popup-meta">' + p.ref + ' &middot; ' + p.status + '</div>' +
          '<button class="popup-link" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'viewDetails\\', id:\\'' + p.id + '\\'}))">View details &rarr;</button>' +
        '</div>';
      marker.bindPopup(popupHtml);
      markers.push(marker);
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    }
  </script>
</body>
</html>`;
}
