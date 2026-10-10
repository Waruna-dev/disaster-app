import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SL_CENTER } from '../lib/constants';

export interface MapMarker { id: string; lat: number; lng: number; label?: string; sub?: string; color?: string }
export interface MapCircle { lat: number; lng: number; radius: number; color: string }
export interface MapPolygon { points: [number, number][]; color: string }
interface Props {
  markers?: MapMarker[]; circles?: MapCircle[]; polygons?: MapPolygon[]; height?: number; center?: [number, number]; zoom?: number;
  pickable?: boolean; pick?: [number, number] | null; onPick?: (lat: number, lng: number) => void; onMarkerClick?: (id: string) => void; selectedId?: string | null;
}
const pin = (color: string, sel: boolean) => L.divIcon({ className: '', html: `<div class="pin${sel ? ' sel' : ''}" style="background:${color}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });

/** Leaflet + OpenStreetMap (free, no API key). Keeps one map instance and redraws layers when props change. */
export function MapView({ markers = [], circles = [], polygons = [], height = 280, center, zoom = 13, pickable, pick, onPick, onMarkerClick, selectedId }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickLayer = useRef<L.Marker | null>(null);
  const cb = useRef({ onPick, onMarkerClick });
  cb.current = { onPick, onMarkerClick };
  const fitted = useRef('');

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView(center ?? SL_CENTER, center ? zoom : 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    setTimeout(() => m.invalidateSize(), 50);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const h = (e: L.LeafletMouseEvent) => cb.current.onPick?.(e.latlng.lat, e.latlng.lng);
    if (pickable) { m.on('click', h); m.getContainer().style.cursor = 'crosshair'; }
    return () => { m.off('click', h); m.getContainer().style.cursor = ''; };
  }, [pickable]);

  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const all: L.Layer[] = [];
    markers.forEach((k) => {
      const mk = L.marker([k.lat, k.lng], { icon: pin(k.color ?? '#08775F', k.id === selectedId) }).addTo(g);
      if (k.label) mk.bindTooltip(`<b>${k.label}</b>${k.sub ? `<br/>${k.sub}` : ''}`, { direction: 'top', offset: [0, -22] });
      mk.on('click', () => cb.current.onMarkerClick?.(k.id));
      all.push(mk);
    });
    circles.forEach((c) => all.push(L.circle([c.lat, c.lng], { radius: c.radius, color: c.color, weight: 2, fillColor: c.color, fillOpacity: 0.18 }).addTo(g)));
    polygons.forEach((p) => all.push(L.polygon(p.points, { color: p.color, weight: 2, fillOpacity: 0.2 }).addTo(g)));
    const key = JSON.stringify([markers.map((x) => x.id), circles.length, polygons.length, center, zoom]);
    if (key !== fitted.current) {
      fitted.current = key;
      if (center) m.setView(center, zoom);
      else if (all.length > 1) m.fitBounds(L.featureGroup(all).getBounds().pad(0.2), { maxZoom: 11 });
      else if (all.length === 1) m.setView(markers[0] ? [markers[0].lat, markers[0].lng] : circles[0] ? [circles[0].lat, circles[0].lng] : SL_CENTER, zoom);
    }
  }, [JSON.stringify(markers), JSON.stringify(circles), JSON.stringify(polygons), selectedId, center?.[0], center?.[1], zoom]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    pickLayer.current?.remove(); pickLayer.current = null;
    if (pick) { pickLayer.current = L.marker(pick, { icon: pin('#C62828', true) }).addTo(m); m.setView(pick, Math.max(m.getZoom(), 13)); }
  }, [pick?.[0], pick?.[1]]);

  return <div ref={el} className="map" style={{ height }} />;
}

/** Free OSM Nominatim helpers (Sri Lanka only) for the "Search for a location" boxes. */
export async function searchPlace(q: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lk&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    return j?.[0] ? { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), name: j[0].display_name } : null;
  } catch { return null; }
}
export async function reversePlace(lat: number, lng: number): Promise<string | null> {
  try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`); return (await r.json())?.display_name ?? null; } catch { return null; }
}
