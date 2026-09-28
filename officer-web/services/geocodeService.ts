import { ReportLocation } from '../types/report';

/**
 * Forward-geocodes a free-text address to coordinates via OpenStreetMap's Nominatim
 * API, used as a fallback for reports submitted without device GPS coordinates (e.g.
 * location permission denied). Matches the OSM/Leaflet stack already used for the
 * map screens, so it needs no API key. Returns null if the address can't be resolved.
 */
export async function geocodeAddress(address: string): Promise<ReportLocation | null> {
  const query = address.trim();
  if (!query) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DisasterManagementApp/1.0' },
    });
    if (!response.ok) return null;

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const latitude = parseFloat(results[0].lat);
    const longitude = parseFloat(results[0].lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}
