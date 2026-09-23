import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { ExistingWarningZone, IncidentPin } from './warningMapHtml';

const RISK_COLOR: Record<string, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

/**
 * Full-screen "Polygon Creator" map for Create Public Warning: the officer taps the
 * map to drop vertices, drags them to adjust, and the ring closes live into a filled
 * zoneColor polygon (same fill style as the read-only convex-hull polygon in
 * utils/floodIncidentMapHtml.ts). Same WebView + Leaflet approach as every other map
 * here (see utils/warningMapHtml.ts for why, not react-native-maps).
 *
 * Every edit posts the full vertex list back as {type:'polygonChange', points}, so
 * PolygonCreatorModal never needs to track vertex state itself — it just mirrors
 * whatever the page reports. window.undoLastPoint/clearPoints are called from the
 * modal's toolbar via injectJavaScript.
 */
export function buildPolygonDrawMapHtml(
  latitude: number,
  longitude: number,
  riskLevel: RiskLevel,
  initialPolygon: { latitude: number; longitude: number }[] = [],
  incidents: IncidentPin[] = [],
  existingWarnings: ExistingWarningZone[] = []
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
    .vertex-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #FFFFFF;
      border: 3px solid ${zoneColor};
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .incident-pin {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${Colors.textDark};
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      opacity: 0.85;
    }
    .existing-zone-label {
      background: rgba(255,255,255,0.9);
      border: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      font-family: -apple-system, Roboto, sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: ${Colors.textMedium};
      padding: 2px 6px;
    }
    .existing-zone-label::before { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var zoneColor = '${zoneColor}';
    var incidents = ${JSON.stringify(incidents)};
    var vertices = []; // [{ marker, lat, lng }]
    var ring = null;   // L.polygon while >= 3 points, else null
    var line = null;   // L.polyline while 1-2 points

    var map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    incidents.forEach(function (p) {
      var icon = L.divIcon({ className: '', html: '<div class="incident-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker([p.lat, p.lng], { icon: icon }).bindTooltip(p.label).addTo(map);
    });

    // Already-published warnings, drawn as read-only reference shapes so the
    // officer can see what's already covered while drawing a new boundary.
    // Colored by each one's own risk level (dashed border, lighter fill) so the
    // *pattern* reads as "already published" while still showing its risk
    // color, as opposed to the boundary being actively drawn (solid, filled 0.3).
    var RISK_COLOR = ${JSON.stringify(RISK_COLOR)};
    var existingWarnings = ${JSON.stringify(existingWarnings)};
    existingWarnings.forEach(function (w) {
      var riskColor = RISK_COLOR[w.riskLevel] || '${Colors.textMuted}';
      var existingStyle = {
        color: riskColor,
        weight: 2,
        fillColor: riskColor,
        fillOpacity: 0.16,
        dashArray: '6,5',
        interactive: false,
      };
      var layer;
      if (w.polygon && w.polygon.length >= 3) {
        layer = L.polygon(w.polygon.map(function (p) { return [p.latitude, p.longitude]; }), existingStyle).addTo(map);
      } else {
        layer = L.circle([w.latitude, w.longitude], Object.assign({ radius: w.radius }, existingStyle)).addTo(map);
      }
      layer.bindTooltip(w.label, { permanent: true, direction: 'center', className: 'existing-zone-label' });
    });

    function report() {
      var points = vertices.map(function (v) { return { lat: v.lat, lng: v.lng }; });
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'polygonChange', points: points }));
    }

    function redrawShape() {
      var latlngs = vertices.map(function (v) { return [v.lat, v.lng]; });

      if (line) { map.removeLayer(line); line = null; }
      if (ring) { map.removeLayer(ring); ring = null; }

      if (latlngs.length >= 3) {
        ring = L.polygon(latlngs, {
          color: zoneColor,
          weight: 2,
          fillColor: zoneColor,
          fillOpacity: 0.3,
        }).addTo(map);
      } else if (latlngs.length === 2) {
        line = L.polyline(latlngs, { color: zoneColor, weight: 2, dashArray: '6,6' }).addTo(map);
      }
    }

    function addVertex(lat, lng) {
      var icon = L.divIcon({ className: '', html: '<div class="vertex-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      var marker = L.marker([lat, lng], { icon: icon, draggable: true }).addTo(map);
      var v = { marker: marker, lat: lat, lng: lng };
      marker.on('drag', function (e) {
        var pos = e.target.getLatLng();
        v.lat = pos.lat;
        v.lng = pos.lng;
        redrawShape();
      });
      marker.on('dragend', function () {
        report();
      });
      vertices.push(v);
      redrawShape();
      report();
    }

    map.on('click', function (e) {
      addVertex(e.latlng.lat, e.latlng.lng);
    });

    // Toolbar actions, called from React Native via injectJavaScript.
    window.undoLastPoint = function () {
      var v = vertices.pop();
      if (v) map.removeLayer(v.marker);
      redrawShape();
      report();
    };

    window.clearPoints = function () {
      vertices.forEach(function (v) { map.removeLayer(v.marker); });
      vertices = [];
      redrawShape();
      report();
    };

    var initial = ${JSON.stringify(initialPolygon)};
    if (initial.length) {
      initial.forEach(function (p) { addVertex(p.latitude, p.longitude); });
    }

    // Fit the opening view to cover both any starting vertices (editing an
    // existing boundary) and every already-published zone, so the officer sees
    // how a new area relates to what's already covered right away instead of
    // having to pan/zoom to find it.
    var fitPoints = vertices.length ? vertices.map(function (v) { return [v.lat, v.lng]; }) : [[${latitude}, ${longitude}]];
    existingWarnings.forEach(function (w) {
      if (w.polygon && w.polygon.length >= 3) {
        w.polygon.forEach(function (p) { fitPoints.push([p.latitude, p.longitude]); });
      } else {
        fitPoints.push([w.latitude, w.longitude]);
      }
    });
    if (fitPoints.length > 1) {
      map.fitBounds(fitPoints, { padding: [40, 40] });
    }
  </script>
</body>
</html>`;
}
