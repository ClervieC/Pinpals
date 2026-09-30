import { Camera, type CameraRef, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/ui';
import { colors } from '@/lib/theme';

import { focusTarget, layerBounds, ROUTE_LAYOUT, ROUTE_PAINT, routesGeoJSON, useGroupMarkers } from './markers';
import { usePastelStyle } from './pastelStyle';
import { type GroupMapProps, initialView } from './types';

export function GroupMap(props: GroupMapProps) {
  const { members, selectedId, selectedMemoryId, onSelect, onSelectMemory, bottomInset, topInset, layer } = props;
  const { style, error } = usePastelStyle();
  const camera = useRef<CameraRef>(null);
  // Cadre calculé une seule fois : la carte ne doit pas sauter quand les données se rafraîchissent.
  const [start] = useState(() => initialView(members));
  const [zoom, setZoom] = useState(start && 'zoom' in start ? start.zoom : 2);
  const { markers, routes } = useGroupMarkers(props, zoom);
  const padding = { top: topInset + 40, bottom: bottomInset + 40, left: 50, right: 50 };

  // La sélection (tap ou swipe de card) est recentrée au-dessus de la bottom sheet.
  useEffect(() => {
    const target = focusTarget(props, zoom);
    if (!target) return;
    camera.current?.easeTo({
      ...target,
      padding: { top: topInset, bottom: bottomInset, left: 0, right: 0 },
      duration: 450,
    });
    // On ne recentre que lorsque la sélection change, pas à chaque zoom.
  }, [selectedId, selectedMemoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de calque : on recadre sur ce qu'il montre (le premier cadre vient d'initialViewState).
  const firstLayer = useRef(true);
  useEffect(() => {
    if (firstLayer.current) {
      firstLayer.current = false;
      return;
    }
    const bounds = layerBounds(props);
    if (bounds) camera.current?.fitBounds(bounds, { padding, duration: 600 });
  }, [layer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <View style={styles.center}>
        <ErrorText error={error} />
      </View>
    );
  }
  if (!style) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.inkSoft} />
      </View>
    );
  }

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={style}
      logo={false}
      compass={false}
      touchPitch={false}
      touchRotate={false}
      attributionPosition={{ bottom: bottomInset + 8, right: 8 }}
      onPress={() => (layer === 'friends' ? onSelect(null) : onSelectMemory(null))}
      onRegionDidChange={(e) => setZoom(e.nativeEvent.zoom)}
    >
      <Camera
        ref={camera}
        minZoom={1}
        maxZoom={14}
        initialViewState={start ? { ...start, padding } : { center: [2.35, 30], zoom: 1.5 }}
      />
      <GeoJSONSource id="routes" data={routesGeoJSON(routes)}>
        <Layer id="routes-line" type="line" paint={ROUTE_PAINT} layout={ROUTE_LAYOUT} />
      </GeoJSONSource>
      {markers.map((m) => (
        <Marker key={m.id} id={m.id} lngLat={[m.lng, m.lat]} anchor={m.anchor} onPress={m.onPress}>
          {m.element}
        </Marker>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
