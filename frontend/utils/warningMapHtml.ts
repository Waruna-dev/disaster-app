import { Colors } from '../constants/colors';
import { DisasterType } from '../types/report';

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

// Landslide zones render in this earth-tone brown everywhere the risk-level color
// would otherwise apply, so a landslide zone reads as a landslide at a glance
// instead of blending into whatever risk-level shade a flood zone would use —
// matches the brown already used for landslide elsewhere (e.g. app/(DMC)/group-details.tsx's
// DISASTER_CONFIG). Flood zones keep the existing risk-level color unchanged.
export const LANDSLIDE_ZONE_COLOR = '#8A5A2B';

export function getZoneColor(hazardType: DisasterType, riskLevel: string): string {
  if (hazardType === 'landslide') return LANDSLIDE_ZONE_COLOR;
  return RISK_COLOR[riskLevel] ?? Colors.warning;
}

// A dashed border on top of the color swap gives landslide zones a second,
// non-color cue ("another pattern") so the distinction still reads for anyone
// who can't easily tell brown from blue/orange at a glance.
export function getZoneDashArray(hazardType: DisasterType): string | null {
  return hazardType === 'landslide' ? '8,5' : null;
}

/** An already-published warning's zone, shown as a read-only reference shape so
 * an officer positioning a new (or edited) zone can see what's already covered.
 * Colored by its own riskLevel (dashed + lighter, vs. the solid-filled zone being
 * actively placed) so risk is still legible at a glance, not flattened to grey. */
export type ExistingWarningZone = {
  id: string;
  label: string;
  riskLevel: keyof typeof RISK_COLOR | string;
  latitude: number;
  longitude: number;
  radius: number;
  polygon: { latitude: number; longitude: number }[] | null;
};

// Same WebView + Leaflet approach as utils/reportMap.ts and utils/userMapHtml.ts
// (react-native-maps renders solid black on Android under the New Architecture —
// see reportMap.ts for the upstream issue). Draws a draggable warning-zone marker
// with a radius circle around it, plus small reference pins for already-verified
// incidents so the officer can see what they're drawing the zone around. Tapping
// the map or dragging the marker posts {type:'locationChange', lat, lng} back to
// the host WebView; window.setRadius/window.setLocation let React Native push
// updates the other way (radius slider, "use my location", "pick incident").
// When a `polygon` (>= 3 points) is passed instead, the circle/marker are skipped
// entirely and this renders a read-only preview of that boundary — actually
// drawing/editing one happens in the full-screen Polygon Creator
// (utils/polygonDrawMapHtml.ts + components/PolygonCreatorModal.tsx).
export function buildWarningMapHtml(
  latitude: number,
  longitude: number,
  radius: number,
  riskLevel: string,
  hazardType: DisasterType = 'flood',
  incidents: IncidentPin[] = [],
  polygon: { latitude: number; longitude: number }[] | null = null,
  existingWarnings: ExistingWarningZone[] = [],
  fitToExisting: boolean = false
): string {
  const zoneColor = getZoneColor(hazardType, riskLevel);
  const zoneDashArray = getZoneDashArray(hazardType);
  const hasPolygon = !!polygon && polygon.length >= 3;

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
      border: 2px ${zoneDashArray ? 'dashed' : 'solid'} #FFFFFF;
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
    var incidents = ${JSON.stringify(incidents)};
    var map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    incidents.forEach(function (p) {
      var icon = L.divIcon({ className: '', html: '<div class="incident-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([p.lat, p.lng], { icon: icon }).bindTooltip(p.label).addTo(map);
    });

    // Already-published warnings, drawn as read-only reference shapes so an
    // officer can see what's already covered before placing a new or edited
    // zone on top — never interactive, unlike the zone below. Colored by each
    // one's own risk level (dashed border, lighter fill) so the *pattern* reads
    // as "already published" at a glance while still showing its risk color,
    // as opposed to the zone being actively placed (solid border, filled 0.3).
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

    var hasPolygon = ${hasPolygon};

    if (hasPolygon) {
      // Read-only preview of an officer-drawn boundary (see utils/polygonDrawMapHtml.ts
      // for where it's actually created/edited, in the full-screen Polygon Creator).
      // No drag/click handling here — "Edit boundary" re-opens that full-screen map.
      var ring = ${JSON.stringify((polygon ?? []).map((p) => [p.latitude, p.longitude]))};
      L.polygon(ring, {
        color: '${zoneColor}',
        weight: 2,
        fillColor: '${zoneColor}',
        fillOpacity: 0.3,
        dashArray: ${zoneDashArray ? `'${zoneDashArray}'` : 'null'},
      }).addTo(map);
      map.fitBounds(ring, { padding: [24, 24] });
    } else {
      var zoneIcon = L.divIcon({ className: '', html: '<div class="zone-marker"></div>', iconSize: [26, 26], iconAnchor: [13, 24] });
      var marker = L.marker([${latitude}, ${longitude}], { icon: zoneIcon, draggable: true }).addTo(map);
      var circle = L.circle([${latitude}, ${longitude}], {
        radius: ${radius},
        color: '${zoneColor}',
        fillColor: '${zoneColor}',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: ${zoneDashArray ? `'${zoneDashArray}'` : 'null'},
      }).addTo(map);

      var report = function (lat, lng) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationChange', lat: lat, lng: lng }));
      };

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

      // Full-screen circle editor only (fitToExisting): widen the opening view to
      // cover every already-published zone too, so the officer sees how the new
      // zone relates to what's already covered instead of having to pan to find
      // it. The small inline card keeps its tight zoom on just the current pin.
      if (${fitToExisting} && existingWarnings.length) {
        var fitPoints = [[${latitude}, ${longitude}]];
        existingWarnings.forEach(function (w) {
          if (w.polygon && w.polygon.length >= 3) {
            w.polygon.forEach(function (p) { fitPoints.push([p.latitude, p.longitude]); });
          } else {
            fitPoints.push([w.latitude, w.longitude]);
          }
        });
        map.fitBounds(fitPoints, { padding: [40, 40] });
      }
    }
  </script>
</body>
</html>`;
}
