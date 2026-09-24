import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { colors, fonts } from '@/lib/theme';
import type { MapMember } from '@/lib/types';

export const PIN_SIZE = 52;
const POINTER = 8;

/** Hauteur totale du pin, pour l'ancrer par la pointe. */
export const PIN_HEIGHT = PIN_SIZE + POINTER + 4;

/** Pin d'un membre : avatar rond, anneau à sa couleur, petite pointe, chute avec rebond. */
export function MemberPin({ member, selected, delay = 0 }: { member: MapMember; selected: boolean; delay?: number }) {
  const drop = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    drop.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 140, mass: 0.7 }));
  }, [delay, drop]);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.2 : 1, { damping: 12, stiffness: 220 });
  }, [selected, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 4),
    transform: [
      { translateY: (1 - drop.value) * -40 },
      // Mise à l'échelle depuis la pointe : on compense la translation du centre.
      { translateY: (PIN_HEIGHT / 2) * (1 - scale.value) },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.pin, animated]}>
      <View style={[styles.shadow, selected && styles.shadowSelected]}>
        <Avatar name={member.display_name} url={member.avatar_url} color={member.pin_color} size={PIN_SIZE} ring={4} />
      </View>
      <View style={[styles.pointer, { borderTopColor: member.pin_color }]} />
      {member.pin_emoji ? (
        <View style={styles.emoji}>
          <Text style={{ fontSize: 13 }}>{member.pin_emoji}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Cluster : pile d'avatars qui se chevauchent + badge "+N". */
export function ClusterPin({ preview, count, delay = 0 }: { preview: MapMember[]; count: number; delay?: number }) {
  const drop = useSharedValue(0);
  useEffect(() => {
    drop.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 140 }));
  }, [delay, drop]);

  const animated = useAnimatedStyle(() => ({
    opacity: drop.value,
    transform: [{ scale: 0.6 + drop.value * 0.4 }],
  }));

  const shown = preview.slice(0, 3);
  const extra = count - shown.length;
  const size = 42;
  const overlap = 16;

  return (
    <Animated.View style={[styles.cluster, animated]}>
      <View style={[styles.stack, { width: size + (shown.length - 1) * (size - overlap) }]}>
        {shown.map((m, i) => (
          <View key={m.id} style={[styles.shadow, { position: 'absolute', left: i * (size - overlap), zIndex: 10 - i }]}>
            <Avatar name={m.display_name} url={m.avatar_url} color={m.pin_color} size={size} ring={3} />
          </View>
        ))}
      </View>
      {extra > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{extra}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pin: { width: PIN_SIZE + 8, height: PIN_HEIGHT, alignItems: 'center' },
  shadow: {
    borderRadius: 999,
    shadowColor: '#5E5169',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  shadowSelected: { shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: POINTER,
    borderRightWidth: POINTER,
    borderTopWidth: POINTER + 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  emoji: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cluster: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  stack: { height: 42 },
  badge: {
    position: 'absolute',
    right: -4,
    top: -2,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.paper,
  },
  badgeText: { color: colors.paper, fontFamily: fonts.black, fontSize: 12 },
});
