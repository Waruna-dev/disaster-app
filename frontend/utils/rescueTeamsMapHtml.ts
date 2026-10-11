import { Colors } from '../constants/colors';
import { RescueTeam } from '../types/rescueTeam';

const STATUS_COLOR: Record<string, string> = {
  Available: '#2E7D32',
  'On Mission': '#1D6FC4',
  Unavailable: '#8A9C99',
};

type TeamPoint = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  status: string;
  meta: string;
};

/** Mirrors utils/sheltersMapHtml.ts's structure — same Leaflet/OSM bridge, rescue-team markers. */
export function buildRescueTeamsMapHtml(teams: RescueTeam[], initialCenter?: { latitude: number; longitude: number }): string {
  const points: TeamPoint[] = teams.map((t) => ({
    id: t.id,
    lat: t.latitude,
    lng: t.longitude,
    name: t.name,
    status: t.status,
    meta: `${t.type} · ${t.members} members`,
  }));

  const center = initialCenter ?? { latitude: 7.8731, longitude: 80.7718 };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { display: none; }
    .leaflet-control-zoom { margin-top: 60px !important; margin-right: 16px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
    .leaflet-control-zoom a { color: #0F5B46 !important; font-weight: bold !important; }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 160px; }
    .popup-title { font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-status { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; color: #fff; margin-bottom: 4px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; margin-bottom: 6px; }
    .popup-link { font-size: 11px; font-weight: 700; color: ${Colors.primary}; background: none; border: none; padding: 0; cursor: pointer; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
    .pin-marker { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
    .pin-inner { transform: rotate(45deg); color: #fff; font-size: 14px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = ${JSON.stringify(points)};
    const statusColors = ${JSON.stringify(STATUS_COLOR)};
    const map = L.map('map', { zoomControl: true }).setView([${center.latitude}, ${center.longitude}], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    function makeIcon(status) {
      const color = statusColors[status] || '${Colors.primary}';
      return L.divIcon({
        className: '',
        html: '<div class="pin-marker" style="background:' + color + '"><div class="pin-inner">&#128737;</div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
    }

    const markers = [];
    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(p.status) }).addTo(map);
      const popupHtml =
        '<div class="popup">' +
          '<div class="popup-title">' + p.name + '</div>' +
          '<div class="popup-status" style="background:' + (statusColors[p.status] || '#08775F') + '">' + p.status + '</div>' +
          '<div class="popup-meta">' + p.meta + '</div>' +
          '<button class="popup-link" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'teamTap\\', id:\\'' + p.id + '\\'}))">View details &#8250;</button>' +
        '</div>';
      marker.bindPopup(popupHtml);
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      try { map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 12 }); } catch (e) {}
    }

    window.centerOnUser = function(lat, lng) {
      map.setView([lat, lng], 12);
    };

    let userMarker = null;
    window.setUserLocation = function(lat, lng) {
      if (userMarker) { map.removeLayer(userMarker); }
      userMarker = L.circleMarker([lat, lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#2E75D6', fillOpacity: 1 }).addTo(map);
    };

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>`;
}
