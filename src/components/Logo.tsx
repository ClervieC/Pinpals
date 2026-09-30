import { StyleSheet, View } from 'react-native';

import { colors, fonts, pastels } from '@/lib/theme';

import { Icon, type IconName, T } from './ui';

/** Marque Pinpals : pastille corail + nom. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.32 }]}>
        <Icon name="map-pin" size={size * 0.5} color={colors.onAccent} />
      </View>
      <T style={[styles.name, { fontSize: size * 0.65 }]}>Pinpals</T>
    </View>
  );
}

const BUBBLES: { icon: IconName; color: string }[] = [
  { icon: 'map-pin', color: pastels[0] },
  { icon: 'gift', color: pastels[1] },
  { icon: 'camera', color: pastels[4] },
  { icon: 'navigation', color: pastels[6] },
  { icon: 'heart', color: pastels[7] },
];

/** Petite illustration : pastilles qui se chevauchent, une par fonctionnalité. */
export function FeatureBubbles() {
  return (
    <View style={styles.bubbles}>
      {BUBBLES.map((b, i) => (
        <View
          key={b.icon}
          style={[styles.bubble, { backgroundColor: b.color, marginLeft: i ? -10 : 0, transform: [{ translateY: i % 2 ? 6 : 0 }] }]}
        >
          <Icon name={b.icon} size={18} color={colors.onAccent} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displayHeavy, letterSpacing: -0.8, color: colors.ink },
  bubbles: { flexDirection: 'row', height: 54 },
  bubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.cream,
  },
});
