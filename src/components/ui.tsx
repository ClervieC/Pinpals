import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t, translateServerMessage } from '@/lib/i18n';
import { colors, fonts, radius, shade, tint } from '@/lib/theme';

// --- Icônes -----------------------------------------------------------------

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

// --- Texte ------------------------------------------------------------------

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[text[variant], style]} />;
}

const text = StyleSheet.create({
  title: { fontFamily: fonts.displayHeavy, fontSize: 32, color: colors.ink, letterSpacing: -0.8, lineHeight: 36 },
  heading: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
});

// --- Écran ------------------------------------------------------------------

export function Screen({
  children,
  scroll = false,
  background = colors.cream,
  edges = ['top', 'bottom'],
  refreshing,
  onRefresh,
}: PropsWithChildren<{
  scroll?: boolean;
  background?: string;
  /** Onglets : pas de marge basse (la barre d'onglets s'en charge). Pages avec en-tête natif : pas de marge haute. */
  edges?: ('top' | 'bottom')[];
  refreshing?: boolean;
  onRefresh?: () => void;
}>) {
  const content = <View style={styles.screenContent}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

/** Bloc blanc bordé : sections, listes, formulaires. */
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** En-tête de page : petite ligne d'accroche, grand titre, élément à droite (avatar, bouton). */
export function PageHeader({ eyebrow, title, right }: { eyebrow?: string | null; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? <T variant="label">{eyebrow}</T> : null}
        <T variant="title">{title}</T>
      </View>
      {right}
    </View>
  );
}

/** Carte de section : icône corail + titre, puis le contenu. */
export function SectionCard({
  icon,
  title,
  right,
  children,
  style,
}: PropsWithChildren<{ icon: IconName; title: string; right?: ReactNode; style?: StyleProp<ViewStyle> }>) {
  return (
    <Card style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={16} color={colors.accent} />
        <T variant="heading" style={{ fontSize: 16, flex: 1 }}>
          {title}
        </T>
        {right}
      </View>
      {children}
    </Card>
  );
}

/** Titre de section en petites capitales, au-dessus d'une Card. */
export function SectionTitle({ children, right }: PropsWithChildren<{ right?: ReactNode }>) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {right}
    </View>
  );
}

/** Pastille ronde colorée avec une icône : états vides, en-têtes de section. */
export function IconBadge({ name, color = colors.accent, size = 56 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint(color, 0.82),
      }}
    >
      <Icon name={name} size={size * 0.42} color={shade(color, 0.1)} />
    </View>
  );
}

export function EmptyState({
  icon,
  color,
  title,
  body,
  children,
}: PropsWithChildren<{ icon: IconName; color?: string; title: string; body: string }>) {
  return (
    <View style={styles.empty}>
      <IconBadge name={icon} color={color} />
      <T variant="heading" style={{ textAlign: 'center', fontSize: 20 }}>
        {title}
      </T>
      <T variant="caption" style={{ textAlign: 'center', maxWidth: 300, fontSize: 14, lineHeight: 20 }}>
        {body}
      </T>
      {children}
    </View>
  );
}

// --- Bouton -----------------------------------------------------------------

type ButtonProps = PressableProps & {
  label: string;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: IconName;
  style?: ViewStyle;
};

export function Button({ label, kind = 'primary', loading, icon, disabled, style, ...props }: ButtonProps) {
  const fg = kind === 'primary' ? colors.onAccent : kind === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'secondary' && styles.buttonSecondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={fg} /> : null}
          <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton rond à icône (barres d'en-tête, actions flottantes). */
export function IconButton({ name, style, ...props }: PressableProps & { name: IconName; style?: ViewStyle }) {
  return (
    <Pressable {...props} hitSlop={6} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }, style]}>
      <Icon name={name} size={19} />
    </Pressable>
  );
}

// --- Champ ------------------------------------------------------------------

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T variant="label">{label}</T> : null}
      <TextInput placeholderTextColor={colors.inkSoft + 'AA'} {...props} style={[styles.input, style]} />
    </View>
  );
}

// --- Sélecteurs -------------------------------------------------------------

export function ColorPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.row}>
      {options.map((c) => (
        <Pressable
          key={c}
          accessibilityLabel={t('group.color.a11y', { color: c })}
          onPress={() => onChange(c)}
          style={[styles.swatchRing, value === c && { borderColor: c }]}
        >
          <View style={[styles.swatch, { backgroundColor: c }]} />
        </Pressable>
      ))}
    </View>
  );
}

export function EmojiPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (e: string) => void }) {
  return (
    <View style={styles.row}>
      {options.map((e) => (
        <Pressable key={e} onPress={() => onChange(e)} style={[styles.emoji, value === e && styles.emojiActive]}>
          <Text style={{ fontSize: 20 }}>{e}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Choix exclusif en segments (ex. Souvenir / Voyage). */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, value === o.value && styles.segmentOn]}>
          <Text style={[styles.segmentLabel, value === o.value && { color: colors.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = translateServerMessage(error instanceof Error ? error.message : String(error));
  return <T style={{ color: colors.danger, fontFamily: fonts.medium, fontSize: 14 }}>{message}</T>;
}

export function Loading() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }]}>
      <ActivityIndicator color={colors.inkSoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Pages centrées sur 760 px : pas d'étirement sur grand écran (même gabarit que l'accueil).
  screenContent: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  scroll: { flexGrow: 1 },
  card: {
    padding: 16,
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitleText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  buttonSecondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 15 },
  buttonPrimary: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchRing: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emojiActive: { borderColor: colors.accent, borderWidth: 2, backgroundColor: tint(colors.accent, 0.9) },
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.md, backgroundColor: colors.muted },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segmentOn: {
    backgroundColor: colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 36 },
});
