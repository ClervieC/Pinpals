import type { MapMember } from '@/lib/types';

export type MapLayer = 'friends' | 'memories';

/** Un souvenir tel que la carte l'affiche : ses villes dans l'ordre, sa couverture. */
export type MapMemory = {
  id: string;
  kind: 'memory' | 'trip';
  title: string;
  color: string;
  coverUrl?: string;
  stops: { lat: number; lng: number }[];
};

export type GroupMapProps = {
  /** Ami·es (pins, piles) ou souvenirs (vignettes, trajets des voyages). */
  layer: MapLayer;
  members: MapMember[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Tap sur une pile : la fiche de la ville liste ses membres (même quand le zoom ne peut plus les séparer). */
  onCluster: (members: MapMember[]) => void;
  memories: MapMemory[];
  selectedMemoryId: string | null;
  onSelectMemory: (id: string | null) => void;
  /** Hauteur occupée en bas de l'écran (bottom sheet), pour centrer le pin sélectionné au-dessus. */
  bottomInset: number;
  topInset: number;
};

type Bounds = [west: number, south: number, east: number, north: number];

/** Cadre initial : tout le groupe visible. `null` si personne n'a encore posé son pin. */
export function initialView(members: MapMember[]): { center: [number, number]; zoom: number } | { bounds: Bounds } | null {
  if (members.length === 0) return null;
  if (members.length === 1) return { center: [members[0].lng, members[0].lat], zoom: 4 };

  const lngs = members.map((m) => m.lng);
  const lats = members.map((m) => m.lat);
  const bounds: Bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  // Tout le monde dans la même ville : on évite un zoom au niveau de la rue.
  if (bounds[2] - bounds[0] < 1 && bounds[3] - bounds[1] < 1) {
    return { center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2], zoom: 7 };
  }
  return { bounds };
}
