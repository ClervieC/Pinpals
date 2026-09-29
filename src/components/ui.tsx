import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t, translateServerMessage } from '@/lib/i18n';
import { colors, fonts, radius, shade } from '@/lib/theme';

// --- Texte ------------------------------------------------------------------

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[text[variant], style]} />;
}

const text = StyleSheet.create({
  title: { fontFamily: fonts.black, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink, lineHeight: 22 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft },
  caption: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
});

// --- Écran ------------------------------------------------------------------

export function Screen({
  children,
  scroll = false,
  background = colors.cream,
}: PropsWithChildren<{ scroll?: boolean; background?: string }>) {
  const content = <View style={styles.screenContent}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

// --- Bouton -----------------------------------------------------------------

type ButtonProps = PressableProps & {
  label: string;
  color?: string;
  kind?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function Button({ label, color = colors.pink, kind = 'primary', loading, icon, disabled, style, ...props }: ButtonProps) {
  const bg = kind === 'primary' ? color : 'transparent';
  const fg = kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.ink : shade(color, 0.65);
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        kind === 'primary' && styles.buttonShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// --- Champ ------------------------------------------------------------------

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T variant="label">{label}</T> : null}
      <TextInput placeholderTextColor={colors.inkSoft + '99'} {...props} style={[styles.input, style]} />
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
          style={[styles.swatch, { backgroundColor: c }, value === c && { borderColor: shade(c, 0.35) }]}
        />
      ))}
    </View>
  );
}

export function EmojiPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (e: string) => void }) {
  return (
    <View style={styles.row}>
      {options.map((e) => (
        <Pressable key={e} onPress={() => onChange(e)} style={[styles.emoji, value === e && styles.emojiActive]}>
          <Text style={{ fontSize: 22 }}>{e}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = translateServerMessage(error instanceof Error ? error.message : String(error));
  return <T style={{ color: colors.danger, fontFamily: fonts.semibold }}>{message}</T>;
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
  screenContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  scroll: { flexGrow: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonLabel: { fontFamily: fonts.black, fontSize: 16 },
  input: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  emoji: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
  },
  emojiActive: { borderColor: colors.ink },
});
