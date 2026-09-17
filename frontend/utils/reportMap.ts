import { Colors } from '../constants/colors';
import { Report, ReportStatus } from '../types/report';

export type PinnedReport = Report & { location: NonNullable<Report['location']> };

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
export function buildReportsMapHtml(pins: PinnedReport[]): string {
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 150px; }
    .popup-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; margin-bottom: 4px; }
    .popup-link { font-size: 11px; font-weight: 700; color: ${Colors.primary}; background: none; border: none; padding: 0; cursor: pointer; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
    .pin { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${JSON.stringify(points)};
    var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

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
    });

    if (markers.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    } else if (markers.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
    }
  </script>
</body>
</html>`;
}
