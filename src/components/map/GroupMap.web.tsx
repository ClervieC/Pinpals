import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/ui';
import { colors } from '@/lib/theme';

import { focusTarget, layerBounds, ROUTE_LAYOUT, ROUTE_PAINT, routesGeoJSON, useGroupMarkers } from './markers';
import { usePastelStyle } from './pastelStyle';
import { type GroupMapProps, initialView } from './types';

// Le worker est servi depuis public/ (voir scripts/copy-maplibre-worker.mjs) : dans le bundle
// Metro, maplibre-gl ne peut pas le retrouver à côté de son propre script.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

type Entry = { marker: maplibregl.Marker; el: HTMLDivElement };

export function GroupMap(props: GroupMapProps) {
  const { members, selectedId, selectedMemoryId, bottomInset, topInset } = props;
  const { style, error } = usePastelStyle();
  const container = useRef<View>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const entries = useRef(new globalThis.Map<string, Entry>());
  const [elements, setElements] = useState<Record<string, HTMLDivElement>>({});
  const [ready, setReady] = useState(false);
  const [start] = useState(() => initialView(members));
  const [zoom, setZoom] = useState(start && 'zoom' in start ? start.zoom : 2);
  const { markers, routes } = useGroupMarkers(props, zoom);

  // Tap sur le fond de carte : on désélectionne (lu via une ref, la carte n'est créée qu'une fois).
  const clearRef = useRef(() => {});
  useEffect(() => {
    clearRef.current = () => (props.layer === 'friends' ? props.onSelect(null) : props.onSelectMemory(null));
  });

  // Création de la carte, une fois le style pastel chargé.
  useEffect(() => {
    const node = container.current as unknown as HTMLDivElement | null;
    if (!style || !node) return;

    // maplibre-gl.css pose `.maplibregl-map { position: relative }` sur le conteneur, ce qui écrase
    // l'absoluteFill de react-native-web (même spécificité, CSS chargé après) : hauteur 0, carte invisible.
    // Le style inline l'emporte sur les deux.
    node.style.position = 'absolute';
    node.style.inset = '0';

    const m = new maplibregl.Map({
      container: node,
      // maplibre-gl embarque sa propre version du style-spec : types identiques à la version près.
      style: style as unknown as maplibregl.StyleSpecification,
      center: start && 'center' in start ? start.center : [2.35, 30],
      zoom: start && 'zoom' in start ? start.zoom : 1.5,
      minZoom: 1,
      maxZoom: 14,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    m.touchZoomRotate.disableRotation();
    if (start && 'bounds' in start) {
      m.fitBounds(start.bounds, {
        padding: { top: topInset + 40, bottom: bottomInset + 40, left: 50, right: 50 },
        animate: false,
      });
      setZoom(m.getZoom());
    }
    m.on('zoomend', () => setZoom(m.getZoom()));
    m.on('click', () => clearRef.current());
    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: routesGeoJSON([]) });
      m.addLayer({ id: 'routes-line', type: 'line', source: 'routes', paint: ROUTE_PAINT, layout: ROUTE_LAYOUT } as maplibregl.LineLayerSpecification);
      setReady(true);
    });
    map.current = m;

    const current = entries.current;
    return () => {
      current.clear();
      setElements({});
      setReady(false);
      m.remove();
      map.current = null;
    };
  }, [style]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronise les markers DOM avec les marqueurs calculés ; le contenu est rendu en portal.
  useLayoutEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const current = entries.current;
    const wanted = new Set(markers.map((p) => p.id));
    let changed = false;

    for (const [id, entry] of current) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        current.delete(id);
        changed = true;
      }
    }
    for (const item of markers) {
      const existing = current.get(item.id);
      if (existing) {
        existing.marker.setLngLat([item.lng, item.lat]);
        continue;
      }
      const el = document.createElement('div');
      const marker = new maplibregl.Marker({ element: el, anchor: item.anchor }).setLngLat([item.lng, item.lat]).addTo(m);
      current.set(item.id, { el, marker });
      changed = true;
    }
    if (changed) setElements(Object.fromEntries([...current].map(([id, e]) => [id, e.el])));
  }, [markers, ready]);

  // Trajets des voyages.
  useEffect(() => {
    const source = ready ? (map.current?.getSource('routes') as maplibregl.GeoJSONSource | undefined) : undefined;
    source?.setData(routesGeoJSON(routes));
  }, [routes, ready]);

  // Changement de calque : on recadre sur ce qu'il montre (le premier cadre vient de initialView).
  const firstLayer = useRef(true);
  useEffect(() => {
    if (firstLayer.current) {
      firstLayer.current = false;
      return;
    }
    const bounds = layerBounds(props);
    if (bounds && map.current) {
      map.current.fitBounds(bounds, {
        padding: { top: topInset + 40, bottom: bottomInset + 40, left: 50, right: 50 },
        maxZoom: 7,
        duration: 600,
      });
    }
  }, [props.layer]); // eslint-disable-line react-hooks/exhaustive-deps

  // La sélection passe au premier plan et est recentrée au-dessus de la bottom sheet.
  useEffect(() => {
    const front = selectedId ?? (selectedMemoryId ? `memory-${selectedMemoryId}` : null);
    for (const [id, e] of entries.current) e.el.style.setProperty('z-index', id === front ? '10' : '');
    const target = map.current ? focusTarget(props, map.current.getZoom()) : null;
    if (!target || !map.current) return;
    map.current.easeTo({
      ...target,
      padding: { top: topInset, bottom: bottomInset, left: 0, right: 0 },
      duration: 450,
    });
  }, [selectedId, selectedMemoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      <View ref={container} style={StyleSheet.absoluteFill} />
      {!style && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.inkSoft} />
        </View>
      ) : null}
      {error ? (
        <View style={styles.center}>
          <ErrorText error={error} />
        </View>
      ) : null}
      {markers.map((item) => {
        const el = elements[item.id];
        if (!el) return null;
        return createPortal(
          <Pressable onPress={item.onPress} accessibilityLabel={item.label}>
            {item.element}
          </Pressable>,
          el,
          item.id,
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
