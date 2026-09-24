import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useEffect, useState } from 'react';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

// Sans clé MapTiler : tuiles démo MapLibre (frontières des pays uniquement), repeintes pareil.
const BASE_STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/pastel/style.json?key=${MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json';

export const palette = {
  land: '#FFF6EC',
  water: '#C4E4F5',
  waterLine: '#A9D6EE',
  green: '#E2F2D5',
  border: '#E9CFC0',
  road: '#FFFFFF',
  label: '#8A7C96',
  labelStrong: '#5E5169',
  halo: '#FFF6EC',
};

const HIDDEN = /poi|housenumber|building|transit|railway|aeroway|airport|ferry|path|track|minor|service|tunnel|bridge|road.*label|highway.*(label|shield)|shield|oneway|landuse(?!.*park)/i;
const WATER = /water|ocean|sea|lake|river|coastline/i;
const GREEN = /park|wood|forest|grass|landcover|national/i;
const ROAD = /road|highway|transportation|motorway|trunk|primary|secondary|street/i;
const BOUNDARY = /boundary|admin|countries-boundary|geolines/i;

function hide(layer: LayerSpecification): LayerSpecification {
  return { ...layer, layout: { ...(layer.layout ?? {}), visibility: 'none' } } as LayerSpecification;
}

/** Repeint un style vectoriel en version "illustration" pastel. */
export function pastelize(style: StyleSpecification): StyleSpecification {
  const isDemo = !MAPTILER_KEY;

  const layers = style.layers.map((layer): LayerSpecification => {
    const id = layer.id;

    switch (layer.type) {
      case 'background':
        // Dans le style démo, le fond représente l'océan.
        return { ...layer, paint: { 'background-color': isDemo ? palette.water : palette.land } };

      case 'fill':
        if (isDemo && id === 'countries-fill') {
          return { ...layer, paint: { 'fill-color': palette.land, 'fill-outline-color': palette.border } };
        }
        if (WATER.test(id)) return { ...layer, paint: { 'fill-color': palette.water } };
        if (GREEN.test(id)) return { ...layer, paint: { 'fill-color': palette.green, 'fill-opacity': 0.7 } };
        return hide(layer);

      case 'line':
        if (WATER.test(id)) {
          return isDemo ? hide(layer) : { ...layer, paint: { 'line-color': palette.waterLine, 'line-width': 1 } };
        }
        if (BOUNDARY.test(id)) {
          if (/geolines/.test(id)) return hide(layer);
          return {
            ...layer,
            paint: { 'line-color': palette.border, 'line-width': 1.2, 'line-dasharray': [2, 2] },
          };
        }
        if (HIDDEN.test(id)) return hide(layer);
        if (ROAD.test(id) && /motorway|trunk|major|primary/i.test(id)) {
          return { ...layer, paint: { 'line-color': palette.road, 'line-width': 1.4, 'line-opacity': 0.8 } };
        }
        return hide(layer);

      case 'symbol': {
        if (HIDDEN.test(id) || ROAD.test(id)) return hide(layer);
        const strong = /country|continent|capital|city/i.test(id);
        return {
          ...layer,
          paint: {
            'text-color': strong ? palette.labelStrong : palette.label,
            'text-halo-color': palette.halo,
            'text-halo-width': 1.6,
            'text-halo-blur': 0.5,
          },
        } as LayerSpecification;
      }

      case 'fill-extrusion':
      case 'hillshade':
      case 'heatmap':
      case 'raster':
      case 'circle':
        return hide(layer);

      default:
        return layer;
    }
  });

  return { ...style, layers };
}

let cached: StyleSpecification | null = null;
let inflight: Promise<StyleSpecification> | null = null;

function loadStyle(): Promise<StyleSpecification> {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch(BASE_STYLE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Style ${res.status}`);
      return res.json() as Promise<StyleSpecification>;
    })
    .then((style) => (cached = pastelize(style)))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Style pastel mis en cache pour toute la session. */
export function usePastelStyle(): { style: StyleSpecification | null; error: unknown } {
  const [style, setStyle] = useState(cached);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (style) return;
    let alive = true;
    loadStyle().then(
      (s) => alive && setStyle(s),
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, [style]);

  return { style, error };
}
