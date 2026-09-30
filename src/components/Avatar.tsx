import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, shade, tint } from '@/lib/theme';

type Props = {
  name: string;
  url: string | null | undefined;
  color: string;
  size?: number;
  /** Épaisseur de l'anneau coloré. */
  ring?: number;
};

/** Avatar rond avec l'anneau de la couleur du pin. Initiale en fallback. */
export function Avatar({ name, url, color, size = 48, ring = 2 }: Props) {
  const inner = size - ring * 2;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, padding: ring }]}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.fallback, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: tint(color, 0.6) }]}>
          <Text style={{ fontFamily: fonts.black, fontSize: inner * 0.42, color: shade(color, 0.55) }}>
            {name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
