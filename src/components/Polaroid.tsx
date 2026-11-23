import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, fonts, themed, tint } from '@/lib/theme';

import { Icon, type IconName, T } from './ui';

type Props = {
  /** Photo ; sans photo (ou en chargement), un aplat de la couleur avec une icône. */
  uri?: string;
  color: string;
  width: number;
  /** Inclinaison en degrés : un scrapbook n'est jamais parfaitement droit. */
  rotate?: number;
  /** Bout de scotch coloré en haut. */
  tape?: boolean;
  icon?: IconName;
  /** Petit texte écrit dans la marge du bas (date ou légende), comme sur un vrai polaroïd. */
  caption?: string | null;
  style?: ViewStyle;
};

/** Photo façon polaroïd : cadre blanc, marge du bas plus large, scotch, légère inclinaison. */
export function Polaroid({ uri, color, width, rotate = 0, tape = true, icon = 'camera', caption, style }: Props) {
  const pad = Math.max(4, Math.round(width * 0.06));
  return (
    <View style={[styles.frame, { width, padding: pad, paddingBottom: pad * 3.2, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.photo, styles.empty, { backgroundColor: tint(color, 0.6) }]}>
          <Icon name={icon} size={width * 0.22} color={tint(color, 0.15)} />
        </View>
      )}
      {caption ? (
        <T numberOfLines={1} style={[styles.caption, { bottom: pad * 0.7, left: pad, right: pad, fontSize: Math.max(10, width * 0.09) }]}>
          {caption}
        </T>
      ) : null}
      {tape ? (
        <View
          style={[
            styles.tape,
            { width: width * 0.42, height: Math.max(12, width * 0.13), left: width * 0.29, backgroundColor: tint(color, 0.35) + 'CC' },
          ]}
        />
      ) : null}
    </View>
  );
}

/** Pastille « +N » collée de travers sur une pile de polaroïds. */
export function MoreSticker({ count, color, style }: { count: number; color: string; style?: ViewStyle }) {
  return (
    <View style={[styles.sticker, { backgroundColor: color }, style]}>
      <T style={styles.stickerText}>+{count}</T>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    frame: {
      backgroundColor: colors.paper,
      borderRadius: 4,
      shadowColor: colors.ink,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    photo: { width: '100%', aspectRatio: 1, borderRadius: 2 },
    empty: { alignItems: 'center', justifyContent: 'center' },
    caption: { position: 'absolute', textAlign: 'center', fontFamily: fonts.medium, color: colors.inkSoft },
    tape: { position: 'absolute', top: -7, borderRadius: 2, transform: [{ rotate: '-3deg' }] },
    sticker: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.paper,
      transform: [{ rotate: '8deg' }],
    },
    stickerText: { color: colors.onAccent, fontSize: 12, fontFamily: fonts.bold },
  }),
);
