import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { MIN_PASSWORD } from '@/lib/authErrors';
import { t } from '@/lib/i18n';
import { colors, pastels, themed } from '@/lib/theme';

import { Field, T } from './ui';

const logo = require('../../assets/splash-icon.png');

/** Le logo (les 3 pins sur la carte) qui flotte doucement. */
export function FloatingLogo({ size }: { size: number }) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [float]);

  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  return (
    <Animated.View style={floating}>
      <Image source={logo} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Pinpals" />
    </Animated.View>
  );
}

/** Points de progression de l'onboarding. */
export function Steps({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.steps}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.step, i < current && styles.stepDone, i === current - 1 && { width: 28 }]} />
      ))}
      <T variant="label" style={{ marginLeft: 6 }}>
        {t('onboarding.step', { step: current, total })}
      </T>
    </View>
  );
}

export function PasswordField({
  label,
  value,
  onChangeText,
  isNew,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isNew: boolean;
  onSubmitEditing: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder="••••••••"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete={isNew ? 'new-password' : 'current-password'}
        textContentType={isNew ? 'newPassword' : 'password'}
        onSubmitEditing={onSubmitEditing}
        style={{ paddingRight: 84 }}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityLabel={visible ? t('auth.password.hide') : t('auth.password.show')}
        style={styles.eye}
      >
        <T variant="label">{visible ? t('auth.password.hide') : t('auth.password.show')}</T>
      </Pressable>
    </View>
  );
}

/** Jauge simple : se remplit jusqu'au minimum requis. */
export function PasswordHint({ length }: { length: number }) {
  const ok = length >= MIN_PASSWORD;
  const left = MIN_PASSWORD - length;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.meter}>
        <View
          style={[
            styles.meterFill,
            { width: `${Math.min(1, length / MIN_PASSWORD) * 100}%`, backgroundColor: ok ? pastels[3] : pastels[1] },
          ]}
        />
      </View>
      <T variant="caption">
        {ok ? t('auth.password.ok') : left > 1 ? t('auth.password.left_other', { count: left }) : t('auth.password.left_one')}
      </T>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    steps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    step: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
    stepDone: { backgroundColor: colors.accent },
    eye: { position: 'absolute', right: 14, bottom: 0, height: 48, justifyContent: 'center' },
    meter: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
    meterFill: { height: '100%', borderRadius: 3 },
  }),
);
