import type { LineLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ReactElement } from 'react';

import { ClusterPin, MemberPin, MemoryPin, StopDot } from './Pins';
import type { GroupMapProps } from './types';
import { useClusters } from './useClusters';

/** Un marqueur prêt à poser, quelle que soit l'implémentation de la carte (native ou web). */
export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  anchor: 'bottom' | 'center';
  label: string;
  onPress: () => void;
  element: ReactElement;
};

/** Trajet d'un voyage : ses villes dans l'ordre. */
export type MapRoute = { id: string; coordinates: [number, number][] };

/**
 * Tout ce que la carte dessine, calculé une fois pour les deux plateformes :
 * GroupMap.native et GroupMap.web ne font que poser ces marqueurs et ces lignes.
 */
export function useGroupMarkers(props: GroupMapProps, zoom: number): { markers: MapMarker[]; routes: MapRoute[] } {
  const { layer, members, selectedId, onSelect, onCluster, memories, selectedMemoryId, onSelectMemory } = props;
  const pins = useClusters(members, zoom);

  if (layer === 'friends') {
    const markers = pins.map((pin, i): MapMarker =>
      pin.kind === 'member'
        ? {
            id: pin.id,
            lng: pin.lng,
            lat: pin.lat,
            anchor: 'bottom',
            label: pin.member.display_name,
            onPress: () => onSelect(pin.member.id),
            element: <MemberPin member={pin.member} selected={pin.member.id === selectedId} delay={i * 70} />,
          }
        : {
            id: pin.id,
            lng: pin.lng,
            lat: pin.lat,
            anchor: 'center',
            label: pin.members.map((m) => m.display_name).join(', '),
            onPress: () => onCluster(pin.members),
            element: <ClusterPin preview={pin.preview} count={pin.count} delay={i * 70} />,
          },
    );
    return { markers, routes: [] };
  }

  const located = memories.filter((m) => m.stops.length > 0);
  const selected = located.find((m) => m.id === selectedMemoryId);
  const markers: MapMarker[] = located.map((m, i) => ({
    id: `memory-${m.id}`,
    lng: m.stops[0].lng,
    lat: m.stops[0].lat,
    anchor: 'bottom',
    label: m.title,
    onPress: () => onSelectMemory(m.id),
    element: <MemoryPin coverUrl={m.coverUrl} color={m.color} kind={m.kind} selected={m.id === selectedMemoryId} delay={i * 60} />,
  }));
  // Les étapes numérotées du voyage sélectionné (la 1re est sous la vignette).
  if (selected && selected.kind === 'trip') {
    selected.stops.slice(1).forEach((stop, i) =>
      markers.push({
        id: `stop-${selected.id}-${i + 1}`,
        lng: stop.lng,
        lat: stop.lat,
        anchor: 'center',
        label: String(i + 2),
        onPress: () => onSelectMemory(selected.id),
        element: <StopDot n={i + 2} />,
      }),
    );
  }
  const routes = located
    .filter((m) => m.kind === 'trip' && m.stops.length > 1)
    .map((m) => ({ id: m.id, coordinates: m.stops.map((s): [number, number] => [s.lng, s.lat]) }));
  return { markers, routes };
}

/** Où recentrer la caméra quand la sélection change (ami·e ou souvenir). */
export function focusTarget(props: GroupMapProps, zoom: number): { center: [number, number]; zoom: number } | null {
  if (props.layer === 'friends') {
    const m = props.selectedId ? props.members.find((x) => x.id === props.selectedId) : null;
    return m ? { center: [m.lng, m.lat], zoom: Math.max(zoom, 6) } : null;
  }
  const memory = props.memories.find((x) => x.id === props.selectedMemoryId);
  if (!memory || memory.stops.length === 0) return null;
  const lng = memory.stops.reduce((a, s) => a + s.lng, 0) / memory.stops.length;
  const lat = memory.stops.reduce((a, s) => a + s.lat, 0) / memory.stops.length;
  return { center: [lng, lat], zoom: memory.stops.length > 1 ? Math.min(zoom, 5) : Math.max(zoom, 6) };
}

/**
 * Cadre du calque affiché (ami·es ou villes des souvenirs), appliqué quand on change de calque.
 * [ouest, sud, est, nord] ; un seul point est élargi pour ne pas zoomer au niveau de la rue.
 */
export function layerBounds(props: GroupMapProps): [number, number, number, number] | null {
  const points =
    props.layer === 'friends'
      ? props.members.map((m) => [m.lng, m.lat])
      : props.memories.flatMap((m) => m.stops.map((s) => [s.lng, s.lat]));
  if (points.length === 0) return null;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const pad = points.length === 1 ? 1 : 0;
  return [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad];
}

/** Les trajets au format GeoJSON, pour la couche de lignes. */
export function routesGeoJSON(routes: MapRoute[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: routes.map((r) => ({ type: 'Feature', properties: { id: r.id }, geometry: { type: 'LineString', coordinates: r.coordinates } })),
  };
}

/** Style des trajets : pointillés corail, partagé par les deux cartes. */
export const ROUTE_PAINT: LineLayerSpecification['paint'] = {
  'line-color': '#E04A2F',
  'line-width': 3,
  'line-dasharray': [2, 2],
};

export const ROUTE_LAYOUT: LineLayerSpecification['layout'] = { 'line-cap': 'round', 'line-join': 'round' };
