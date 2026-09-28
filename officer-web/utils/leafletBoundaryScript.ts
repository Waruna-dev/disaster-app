/**
 * Shared vanilla-JS helpers injected into Leaflet WebView pages that draw a dotted
 * affected-area boundary — evenly-spaced white dot markers walked along a polygon's
 * edges, or placed around a fallback circle. Used by both utils/reportMap.ts (DMC
 * main map) and utils/floodIncidentMapHtml.ts (flood incident detail map) so the
 * boundary-dot math can't drift between the two maps that both need to render the
 * same FloodIncident.polygon/radiusMeters shape.
 */
export const BOUNDARY_DOTS_SCRIPT = `
    function haversineM(a, b) {
      var R = 6371000;
      var dLat = (b.lat - a.lat) * Math.PI / 180;
      var dLng = (b.lng - a.lng) * Math.PI / 180;
      var lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function lerp(a, b, t) {
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    // Evenly-spaced points walked along a closed ring's edges.
    function boundaryDots(ring, spacing) {
      var pts = ring.map(function (p) { return { lat: p.latitude, lng: p.longitude }; });
      pts.push(pts[0]);
      var dots = [];
      var carry = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var segLen = haversineM(a, b);
        if (segLen === 0) continue;
        var dist = spacing - carry;
        while (dist < segLen) {
          dots.push(lerp(a, b, dist / segLen));
          dist += spacing;
        }
        carry = dist - segLen;
      }
      return dots;
    }
    function destPoint(origin, bearingDeg, distanceM) {
      var R = 6371000;
      var brng = bearingDeg * Math.PI / 180;
      var lat1 = origin.lat * Math.PI / 180, lng1 = origin.lng * Math.PI / 180;
      var dR = distanceM / R;
      var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dR) + Math.cos(lat1) * Math.sin(dR) * Math.cos(brng));
      var lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(dR) * Math.cos(lat1), Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2));
      return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
    }
    // Evenly-spaced points around a circle's circumference (the polygon fallback
    // shape for an incident with fewer than 3 distinct GPS points).
    function circleDots(center, radius, spacing) {
      var circumference = 2 * Math.PI * radius;
      var count = Math.max(12, Math.round(circumference / spacing));
      var dots = [];
      for (var i = 0; i < count; i++) {
        dots.push(destPoint(center, (360 / count) * i, radius));
      }
      return dots;
    }
`;
