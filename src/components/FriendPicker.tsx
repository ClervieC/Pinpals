import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius, tint } from '@/lib/theme';
import type { Friend } from '@/lib/types';

import { Avatar } from './Avatar';
import { T } from './ui';

type Props = {
  friends: Pick<Friend, 'id' | 'display_name' | 'avatar_url' | 'pin_color'>[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

/** Sélection multiple d'ami·es, en pastilles avatar + prénom. */
export function FriendPicker({ friends, selected, onChange }: Props) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <View style={styles.row}>
      {friends.map((f) => {
        const on = selected.includes(f.id);
        return (
          <Pressable
            key={f.id}
            onPress={() => toggle(f.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.chip, on && { backgroundColor: tint(f.pin_color, 0.35), borderColor: f.pin_color }]}
          >
            <Avatar name={f.display_name} url={f.avatar_url} color={f.pin_color} size={28} ring={2} />
            <T style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 15 }}>
              {f.display_name}
              {on ? ' ✓' : ''}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
});
