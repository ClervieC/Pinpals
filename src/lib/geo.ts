import { lang, monthName } from './i18n';
import type { City } from './types';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id: number;
    osm_type: string;
    name?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

/** Autocomplétion de ville via Photon (komoot). Coordonnées = centre de la ville. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, limit: '8', lang, layer: 'city' });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json: { features: PhotonFeature[] } = await res.json();

  const seen = new Set<string>();
  const cities: City[] = [];
  for (const f of json.features) {
    const p = f.properties;
    if (!p.name || !p.country || !p.countrycode) continue;
    const key = `${p.name}|${p.state ?? ''}|${p.countrycode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cities.push({
      id: `${p.osm_type}${p.osm_id}`,
      name: p.name,
      region: p.state && p.state !== p.name ? p.state : null,
      country: p.country,
      countryCode: p.countrycode.toUpperCase(),
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    });
  }
  return cities;
}

/** "RO" -> 🇷🇴 */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** "mars 2026" / "March 2026" */
export function monthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${monthName(d.getMonth())} ${d.getFullYear()}`;
}
