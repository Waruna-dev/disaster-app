import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { DisasterType } from '../types/report';
import { DEFAULT_REGION } from './reportMap';

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

export interface WarningMapItem {
  id: string;
  title: string;
  affectedArea: string;
  hazardType: DisasterType;
  riskLevel: RiskLevel;
  status: 'Active' | 'Expired' | 'Cancelled';
  latitude: number;
  longitude: number;
  radius: number;
  polygon: { latitude: number; longitude: number }[] | null;
}

/**
 * "All Warnings" overview map for the Public Warnings list (app/(DMC)/alerts.tsx):
 * every warning's zone drawn at once, filled by risk color, circle or officer-drawn
 * polygon depending on what each one was published with. Same WebView + Leaflet
 * approach as every other map here (see utils/warningMapHtml.ts for why, not
 * react-native-maps). Tapping a zone posts {type:'editWarning', id} back to the
 * host WebView so the officer can jump straight into editing it.
 */
export function buildWarningsMapHtml(warnings: WarningMapItem[]): string {
  const payload = warnings.map((w) => ({
    id: w.id,
    title: w.title,
    area: w.affectedArea,
    hazardLabel: w.hazardType === 'flood' ? 'Flood' : 'Landslide',
    color: RISK_COLOR[w.riskLevel] ?? Colors.warning,
    riskLevel: w.riskLevel,
    status: w.status,
    lat: w.latitude,
    lng: w.longitude,
    radius: w.radius,
    polygon: w.polygon,
  }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef2f1; }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 160px; }
    .popup-title { font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; margin-bottom: 6px; }
    .popup-link { font-size: 11px; font-weight: 700; color: ${Colors.primary}; background: none; border: none; padding: 0; cursor: pointer; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var warnings = ${JSON.stringify(payload)};
    var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var bounds = [];

    warnings.forEach(function (w) {
      var shapeOptions = {
        color: w.color,
        weight: 2,
        fillColor: w.color,
        fillOpacity: w.status === 'Active' ? 0.32 : 0.14,
        dashArray: w.status === 'Active' ? null : '6,5',
      };

      var popupHtml =
        '<div class="popup">' +
          '<div class="popup-title">' + w.hazardLabel + ' &middot; ' + w.title + '</div>' +
          '<div class="popup-meta">' + w.area + ' &middot; ' + w.riskLevel + ' &middot; ' + w.status + '</div>' +
          '<button class="popup-link" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'editWarning\\', id:\\'' + w.id + '\\'}))">Edit warning &rarr;</button>' +
        '</div>';

      var layer;
      if (w.polygon && w.polygon.length >= 3) {
        var ring = w.polygon.map(function (p) { return [p.latitude, p.longitude]; });
        layer = L.polygon(ring, shapeOptions).addTo(map);
        ring.forEach(function (ll) { bounds.push(ll); });
      } else {
        layer = L.circle([w.lat, w.lng], Object.assign({ radius: w.radius }, shapeOptions)).addTo(map);
        bounds.push([w.lat, w.lng]);
      }
      layer.bindPopup(popupHtml);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }
  </script>
</body>
</html>`;
}
