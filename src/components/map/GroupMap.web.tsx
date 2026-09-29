import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/ui';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

import { usePastelStyle } from './pastelStyle';
import { ClusterPin, MemberPin } from './Pins';
import { type GroupMapProps, initialView } from './types';
import { useClusters } from './useClusters';

// Le worker est servi depuis public/ (voir scripts/copy-maplibre-worker.mjs) : dans le bundle
// Metro, maplibre-gl ne peut pas le retrouver à côté de son propre script.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

type Entry = { marker: maplibregl.Marker; el: HTMLDivElement };

export function GroupMap({ members, selectedId, onSelect, bottomInset, topInset }: GroupMapProps) {
  const { style, error } = usePastelStyle();
  const container = useRef<View>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const entries = useRef(new globalThis.Map<string, Entry>());
  const [elements, setElements] = useState<Record<string, HTMLDivElement>>({});
  const [ready, setReady] = useState(false);
  const [start] = useState(() => initialView(members));
  const [zoom, setZoom] = useState(start && 'zoom' in start ? start.zoom : 2);
  const pins = useClusters(members, zoom);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Création de la carte, une fois le style pastel chargé.
  useEffect(() => {
    const node = container.current as unknown as HTMLDivElement | null;
    if (!style || !node) return;

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
    m.on('click', () => onSelectRef.current(null));
    m.on('load', () => setReady(true));
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

  // Synchronise les markers DOM avec les pins (membres + clusters) ; le contenu est rendu en portal.
  useLayoutEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const current = entries.current;
    const wanted = new Set(pins.map((p) => p.id));
    let changed = false;

    for (const [id, entry] of current) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        current.delete(id);
        changed = true;
      }
    }
    for (const pin of pins) {
      const existing = current.get(pin.id);
      if (existing) {
        existing.marker.setLngLat([pin.lng, pin.lat]);
        continue;
      }
      const el = document.createElement('div');
      const marker = new maplibregl.Marker({ element: el, anchor: pin.kind === 'member' ? 'bottom' : 'center' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(m);
      current.set(pin.id, { el, marker });
      changed = true;
    }
    if (changed) setElements(Object.fromEntries([...current].map(([id, e]) => [id, e.el])));
  }, [pins, ready]);

  // Le pin sélectionné passe au premier plan et est recentré au-dessus de la bottom sheet.
  useEffect(() => {
    for (const [id, e] of entries.current) e.el.style.setProperty('z-index', id === selectedId ? '10' : '');
    const target = selectedId ? members.find((x) => x.id === selectedId) : null;
    if (!target || !map.current) return;
    map.current.easeTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.current.getZoom(), 6),
      padding: { top: topInset, bottom: bottomInset, left: 0, right: 0 },
      duration: 450,
    });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {pins.map((pin, i) => {
        const el = elements[pin.id];
        if (!el) return null;
        return createPortal(
          pin.kind === 'member' ? (
            <Pressable onPress={() => onSelect(pin.member.id)} accessibilityLabel={pin.member.display_name}>
              <MemberPin member={pin.member} selected={pin.member.id === selectedId} delay={i * 70} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => map.current?.easeTo({ center: [pin.lng, pin.lat], zoom: pin.expansionZoom, duration: 500 })}
              accessibilityLabel={t('group.clusterA11y', { count: pin.count })}
            >
              <ClusterPin preview={pin.preview} count={pin.count} delay={i * 70} />
            </Pressable>
          ),
          el,
          pin.id,
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
