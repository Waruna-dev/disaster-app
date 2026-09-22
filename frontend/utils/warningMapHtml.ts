import { Colors } from '../constants/colors';

export type IncidentPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

const RISK_COLOR: Record<string, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

// Same WebView + Leaflet approach as utils/reportMap.ts and utils/userMapHtml.ts
// (react-native-maps renders solid black on Android under the New Architecture —
// see reportMap.ts for the upstream issue). Draws a draggable warning-zone marker
// with a radius circle around it, plus small reference pins for already-verified
// incidents so the officer can see what they're drawing the zone around. Tapping
// the map or dragging the marker posts {type:'locationChange', lat, lng} back to
// the host WebView; window.setRadius/window.setLocation let React Native push
// updates the other way (radius slider, "use my location", "pick incident").
export function buildWarningMapHtml(
  latitude: number,
  longitude: number,
  radius: number,
  riskLevel: string,
  incidents: IncidentPin[] = []
): string {
  const zoneColor = RISK_COLOR[riskLevel] ?? Colors.warning;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { display: none; }
    .zone-marker {
      width: 26px;
      height: 26px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background-color: ${zoneColor};
      border: 2px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .incident-pin {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: ${Colors.textDark};
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var incidents = ${JSON.stringify(incidents)};
    var map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    incidents.forEach(function (p) {
      var icon = L.divIcon({ className: '', html: '<div class="incident-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([p.lat, p.lng], { icon: icon }).bindTooltip(p.label).addTo(map);
    });

    var zoneIcon = L.divIcon({ className: '', html: '<div class="zone-marker"></div>', iconSize: [26, 26], iconAnchor: [13, 24] });
    var marker = L.marker([${latitude}, ${longitude}], { icon: zoneIcon, draggable: true }).addTo(map);
    var circle = L.circle([${latitude}, ${longitude}], {
      radius: ${radius},
      color: '${zoneColor}',
      fillColor: '${zoneColor}',
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    function report(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationChange', lat: lat, lng: lng }));
    }

    marker.on('drag', function (e) {
      circle.setLatLng(e.target.getLatLng());
    });
    marker.on('dragend', function (e) {
      var pos = e.target.getLatLng();
      report(pos.lat, pos.lng);
    });

    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      report(e.latlng.lat, e.latlng.lng);
    });

    // Called from React Native when the radius slider/preset changes.
    window.setRadius = function (meters) {
      circle.setRadius(meters);
    };

    // Called from React Native ("use my location" or picking a verified incident).
    window.setLocation = function (lat, lng) {
      var pos = [lat, lng];
      marker.setLatLng(pos);
      circle.setLatLng(pos);
      map.setView(pos, 14);
    };
  </script>
</body>
</html>`;
}
