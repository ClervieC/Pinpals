import { useMemo } from 'react';
import Supercluster from 'supercluster';

import type { MapMember } from '@/lib/types';

export type PinItem =
  | { kind: 'member'; id: string; lng: number; lat: number; member: MapMember }
  | {
      kind: 'cluster';
      id: string;
      lng: number;
      lat: number;
      count: number;
      /** Les premiers membres du cluster, pour la pile d'avatars. */
      preview: MapMember[];
      /** Tous les membres du cluster, pour la fiche de la ville. */
      members: MapMember[];
      expansionZoom: number;
    };

const WORLD: [number, number, number, number] = [-180, -85, 180, 85];

/**
 * Regroupe les membres proches à un niveau de zoom donné.
 * Les groupes sont petits (une promo = quelques dizaines de personnes) : on calcule sur le monde entier
 * plutôt que sur la bbox visible, ce qui évite de faire clignoter les pins pendant un pan.
 */
export function useClusters(members: MapMember[], zoom: number): PinItem[] {
  const index = useMemo(() => {
    const sc = new Supercluster<{ member: MapMember }>({ radius: 56, maxZoom: 14 });
    sc.load(
      members.map((member) => ({
        type: 'Feature',
        properties: { member },
        geometry: { type: 'Point', coordinates: [member.lng, member.lat] },
      })),
    );
    return sc;
  }, [members]);

  const z = Math.max(0, Math.floor(zoom));

  return useMemo(
    () =>
      index.getClusters(WORLD, z).map((f): PinItem => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties;
        if ('cluster' in props && props.cluster) {
          const clusterId = props.cluster_id;
          return {
            kind: 'cluster',
            id: `cluster-${clusterId}`,
            lng,
            lat,
            count: props.point_count,
            preview: index.getLeaves(clusterId, 3).map((leaf) => leaf.properties.member),
            members: index.getLeaves(clusterId, Infinity).map((leaf) => leaf.properties.member),
            expansionZoom: Math.min(index.getClusterExpansionZoom(clusterId), 16),
          };
        }
        const member = (props as { member: MapMember }).member;
        return { kind: 'member', id: member.id, lng, lat, member };
      }),
    [index, z],
  );
}
