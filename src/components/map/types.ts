import type { MapMember } from '@/lib/types';

export type GroupMapProps = {
  members: MapMember[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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
