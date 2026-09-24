import { Camera, type CameraRef, Map, Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/ui';
import { colors } from '@/lib/theme';

import { usePastelStyle } from './pastelStyle';
import { ClusterPin, MemberPin } from './Pins';
import { type GroupMapProps, initialView } from './types';
import { useClusters } from './useClusters';

export function GroupMap({ members, selectedId, onSelect, bottomInset, topInset }: GroupMapProps) {
  const { style, error } = usePastelStyle();
  const camera = useRef<CameraRef>(null);
  // Cadre calculé une seule fois : la carte ne doit pas sauter quand les données se rafraîchissent.
  const [start] = useState(() => initialView(members));
  const [zoom, setZoom] = useState(start && 'zoom' in start ? start.zoom : 2);
  const pins = useClusters(members, zoom);
  const padding = { top: topInset + 40, bottom: bottomInset + 40, left: 50, right: 50 };

  // Le pin sélectionné (tap ou swipe de card) est recentré au-dessus de la bottom sheet.
  useEffect(() => {
    const m = selectedId ? members.find((x) => x.id === selectedId) : null;
    if (!m) return;
    camera.current?.easeTo({
      center: [m.lng, m.lat],
      zoom: Math.max(zoom, 6),
      padding: { top: topInset, bottom: bottomInset, left: 0, right: 0 },
      duration: 450,
    });
    // On ne recentre que lorsque la sélection change, pas à chaque zoom.
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      onPress={() => onSelect(null)}
      onRegionDidChange={(e) => setZoom(e.nativeEvent.zoom)}
    >
      <Camera
        ref={camera}
        minZoom={1}
        maxZoom={14}
        initialViewState={start ? { ...start, padding } : { center: [2.35, 30], zoom: 1.5 }}
      />
      {pins.map((pin, i) =>
        pin.kind === 'member' ? (
          <Marker
            key={pin.id}
            id={pin.id}
            lngLat={[pin.lng, pin.lat]}
            anchor="bottom"
            onPress={() => onSelect(pin.member.id)}
          >
            <MemberPin member={pin.member} selected={pin.member.id === selectedId} delay={i * 70} />
          </Marker>
        ) : (
          <Marker
            key={pin.id}
            id={pin.id}
            lngLat={[pin.lng, pin.lat]}
            onPress={() =>
              camera.current?.easeTo({ center: [pin.lng, pin.lat], zoom: pin.expansionZoom, duration: 500 })
            }
          >
            <ClusterPin preview={pin.preview} count={pin.count} delay={i * 70} />
          </Marker>
        ),
      )}
    </Map>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
