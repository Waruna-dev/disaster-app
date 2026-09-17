import { Colors } from '../constants/colors';
import { Report } from '../types/report';
import { STATUS_PIN, DISASTER_SYMBOL, DEFAULT_REGION } from './reportMap';

type ReportPoint = {
  id: string;
  lat: number;
  lng: number;
  type: string;
};

export function buildUserMapHtml(reports: Report[]): string {
  const points: ReportPoint[] = reports
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({
      id: r.id,
      lat: r.latitude!,
      lng: r.longitude!,
      type: r.disasterType,
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
    var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Render existing reports
    var markers = [];
    points.forEach(function (p) {
      var iconClass = p.type === 'flood' ? 'pin-flood' : 'pin-landslide';
      var iconSymbol = p.type === 'flood' ? '&#x1F30A;' : '&#x26F0;&#xFE0F;';
      var customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="pin-marker"><div class="pin-inner ' + iconClass + '">' + iconSymbol + '</div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      var marker = L.marker([p.lat, p.lng], {
        icon: customIcon
      }).addTo(map);

      // Instead of popup, we send message to RN when a report is tapped
      marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reportTap', id: p.id }));
      });
      markers.push(marker);
    });

    window.updateMarkers = function(newPointsJson) {
      try {
        var newPoints = JSON.parse(newPointsJson);
        markers.forEach(function(m) { map.removeLayer(m); });
        markers = [];
        
        newPoints.forEach(function (p) {
            var iconClass = p.type === 'flood' ? 'pin-flood' : 'pin-landslide';
            var iconSymbol = p.type === 'flood' ? '&#x1F30A;' : '&#x26F0;&#xFE0F;';
            var customIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="pin-marker"><div class="pin-inner ' + iconClass + '">' + iconSymbol + '</div></div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });

            var marker = L.marker([p.lat, p.lng], {
              icon: customIcon
            }).addTo(map);

            marker.on('click', function(e) {
              L.DomEvent.stopPropagation(e);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reportTap', id: p.id }));
            });
            markers.push(marker);
        });
      } catch(e) { console.error(e); }
    };

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
