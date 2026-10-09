import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { O } from './theme';

export interface MapMarker {
  id: string; lat: number; lng: number; label?: string; color?: string; sub?: string;
}
export interface MapCircle { lat: number; lng: number; radius: number; color: string }

interface Props {
  markers?: MapMarker[];
  circles?: MapCircle[];
  height?: number;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** When set, clicking the map drops a pin and reports it through onPick. */
  pickable?: boolean;
  pick?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onMarkerPress?: (id: string) => void;
  selectedId?: string | null;
}

const SL = { lat: 7.8731, lng: 80.7718 };

function buildHtml(markers: MapMarker[], circles: MapCircle[], center: { lat: number; lng: number } | undefined, zoom: number, pickable: boolean) {
  const c = center ?? (markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : SL);
  const z = center || markers.length === 1 ? zoom : markers.length ? 8 : 7;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.leaflet-control-attribution{font-size:9px}
.pin{width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.pin.sel{width:32px;height:32px;box-shadow:0 0 0 4px rgba(8,119,95,.35),0 2px 6px rgba(0,0,0,.4)}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var markers=${JSON.stringify(markers)}, circles=${JSON.stringify(circles)};
var map=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([${c.lat},${c.lng}],${z});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var layers=[];
function icon(color,sel){return L.divIcon({className:'',html:'<div class="pin'+(sel?' sel':'')+'" style="background:'+(color||'#08775F')+'"></div>',iconSize:[26,26],iconAnchor:[13,26],popupAnchor:[0,-24]});}
var byId={};
markers.forEach(function(m){
  var mk=L.marker([m.lat,m.lng],{icon:icon(m.color,false)}).addTo(map);
  if(m.label){mk.bindTooltip('<b>'+m.label+'</b>'+(m.sub?'<br/>'+m.sub:''),{direction:'top',offset:[0,-22]});}
  mk.on('click',function(){parent.postMessage({source:'officer-map',type:'marker',id:m.id},'*');});
  byId[m.id]=mk; layers.push(mk);
});
circles.forEach(function(c){var ci=L.circle([c.lat,c.lng],{radius:c.radius,color:c.color,weight:2,fillColor:c.color,fillOpacity:.18}).addTo(map);layers.push(ci);});
if(layers.length>1){try{map.fitBounds(L.featureGroup(layers).getBounds().pad(0.2),{maxZoom:11});}catch(e){}}
var pickMarker=null;
function setPick(lat,lng,fly){
  if(pickMarker){map.removeLayer(pickMarker);}
  pickMarker=L.marker([lat,lng],{icon:icon('#C62828',true)}).addTo(map);
  if(fly){map.setView([lat,lng],Math.max(map.getZoom(),13));}
}
${pickable ? "map.on('click',function(e){setPick(e.latlng.lat,e.latlng.lng,false);parent.postMessage({source:'officer-map',type:'pick',lat:e.latlng.lat,lng:e.latlng.lng},'*');});" : ''}
window.addEventListener('message',function(ev){
  var d=ev.data||{};
  if(d.type==='setPick'){setPick(d.lat,d.lng,true);}
  if(d.type==='select'){Object.keys(byId).forEach(function(id){var m=markers.filter(function(x){return x.id===id;})[0];byId[id].setIcon(icon(m.color,id===d.id));});
    if(d.id&&byId[d.id]){map.setView(byId[d.id].getLatLng(),Math.max(map.getZoom(),12));}}
});
</script></body></html>`;
}

/** Leaflet/OpenStreetMap inside an <iframe> — react-native-webview has no web support, so the officer app uses this. */
export function WebMap({ markers = [], circles = [], height = 280, center, zoom = 13, pickable, pick, onPick, onMarkerPress, selectedId }: Props) {
  const iframeRef = useRef<any>(null);
  const loadedRef = useRef(false);

  const dataKey = JSON.stringify({ markers, circles, center, zoom, pickable: !!pickable });
  const html = useMemo(() => buildHtml(markers, circles, center, zoom, !!pickable), [dataKey]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.source !== 'officer-map') return;
      if (d.type === 'pick') onPick?.(d.lat, d.lng);
      if (d.type === 'marker') onMarkerPress?.(d.id);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPick, onMarkerPress]);

  const post = (msg: any) => iframeRef.current?.contentWindow?.postMessage(msg, '*');

  useEffect(() => {
    if (pick && loadedRef.current) post({ type: 'setPick', lat: pick.lat, lng: pick.lng });
  }, [pick?.lat, pick?.lng]);

  useEffect(() => {
    if (loadedRef.current) post({ type: 'select', id: selectedId ?? null });
  }, [selectedId]);

  useEffect(() => { loadedRef.current = false; }, [html]);

  if (Platform.OS !== 'web') {
    return <View style={{ height, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: O.textMuted }}>Map is available in the web app.</Text></View>;
  }

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: O.border, backgroundColor: '#EAF1EF' }}>
      {React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'map',
        style: { border: 0, width: '100%', height: '100%' },
        onLoad: () => {
          loadedRef.current = true;
          if (pick) post({ type: 'setPick', lat: pick.lat, lng: pick.lng });
          if (selectedId) post({ type: 'select', id: selectedId });
        },
      })}
    </View>
  );
}

/** Free OSM Nominatim search (Sri Lanka only) used by the "Search for a location" boxes. */
export async function searchLocation(q: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lk&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (j?.[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), name: j[0].display_name };
  } catch {}
  return null;
}
export async function reverseLocation(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const j = await r.json();
    return j?.display_name ?? null;
  } catch { return null; }
}
