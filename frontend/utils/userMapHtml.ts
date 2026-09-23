import { Colors } from '../constants/colors';
import { Report } from '../types/report';
import { STATUS_PIN, DISASTER_SYMBOL, DEFAULT_REGION, WarningZone } from './reportMap';

const ZONE_RISK_COLOR: Record<string, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

type ReportPoint = {
  id: string;
  lat: number;
  lng: number;
  type: string;
};

export function buildUserMapHtml(reports: Report[], warnings: WarningZone[] = []): string {
  const points: ReportPoint[] = reports
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({
      id: r.id,
      lat: r.latitude!,
      lng: r.longitude!,
      type: r.disasterType,
    }));

  const warningPayload = warnings.map((w) => ({
    id: w.id,
    centroid: w.centroid,
    polygon: w.polygon,
    radiusMeters: w.radiusMeters,
    color: ZONE_RISK_COLOR[w.riskLevel] || Colors.warning,
    active: w.status === 'Active',
    label: w.title,
    meta: `${w.affectedArea} · ${w.riskLevel} risk`,
  }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { display: none; }
    .leaflet-control-zoom {
      margin-top: 60px !important;
      margin-left: 16px !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    .leaflet-control-zoom a {
      color: #0F5B46 !important;
      font-weight: bold !important;
    }
    .popup { font-family: -apple-system, Roboto, sans-serif; min-width: 150px; }
    .popup-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${Colors.textDark}; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: ${Colors.textMuted}; margin-bottom: 4px; }
    .popup-link { font-size: 11px; font-weight: 700; color: ${Colors.primary}; background: none; border: none; padding: 0; cursor: pointer; }
    .leaflet-popup-content-wrapper { border-radius: 10px; }
    .pin-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .pin-inner {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }
    .pin-flood { background-color: #F59E0B; }
    .pin-landslide { background-color: #DC2626; }
    /* Simple styling to make the map look clean */
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${JSON.stringify(points)};
    var warningZones = ${JSON.stringify(warningPayload)};
    var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var warningLayers = [];
    window.updateWarnings = function(newWarningsJson) {
      try {
        var newWarnings = JSON.parse(newWarningsJson);
        warningLayers.forEach(function(l) { map.removeLayer(l); });
        warningLayers = [];
        
        newWarnings.forEach(function (w) {
          var shapeOptions = {
            color: w.color,
            weight: 3,
            fillColor: w.color,
            fillOpacity: w.active ? 0.22 : 0.1,
            dashArray: '4,6',
          };
          var popupHtml = '<div class="popup"><div class="popup-title">' + w.label + '</div><div class="popup-meta">' + w.meta + '</div></div>';

          if (w.polygon && w.polygon.length >= 3) {
            var wRing = w.polygon.map(function (p) { return [p.latitude, p.longitude]; });
            var wPoly = L.polygon(wRing, shapeOptions).addTo(map);
            wPoly.bindPopup(popupHtml);
            warningLayers.push(wPoly);
          } else {
            var wCircle = L.circle([w.centroid.latitude, w.centroid.longitude], Object.assign({ radius: w.radiusMeters }, shapeOptions)).addTo(map);
            wCircle.bindPopup(popupHtml);
            warningLayers.push(wCircle);
          }
        });
      } catch(e) { console.error(e); }
    };

    // Render initial Warnings
    window.updateWarnings('${JSON.stringify(warningPayload)}');

    // Selected location pin (green)
    var selectedMarker = null;
    
    // Custom icon for the selected location
    var greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    function updateSelectedLocation(lat, lng) {
      if (selectedMarker) {
        selectedMarker.setLatLng([lat, lng]);
      } else {
        selectedMarker = L.marker([lat, lng], { icon: greenIcon }).addTo(map);
      }
    }

    function centerOnUser(lat, lng) {
      updateSelectedLocation(lat, lng);
      map.setView([lat, lng], 14);
    }

    // Expose to React Native
    window.updateSelectedLocation = updateSelectedLocation;
    window.centerOnUser = centerOnUser;

    // Map tap handler
    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      updateSelectedLocation(lat, lng);
      // Send coordinates back to React Native
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapTap', lat: lat, lng: lng }));
    });

  </script>
</body>
</html>`;
}
