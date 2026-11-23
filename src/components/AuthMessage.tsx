import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { themed } from '@/lib/theme';

import { FloatingLogo } from './decor';
import { Card, Screen, T } from './ui';

/** Mise en page des écrans ouverts depuis un email : logo, titre, carte. */
export function AuthMessage({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Screen>
      <View style={styles.body}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <FloatingLogo size={110} />
          <T variant="title" style={{ textAlign: 'center' }}>
            {title}
          </T>
        </View>
        <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
          <Card style={{ gap: 14 }}>{children}</Card>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    body: { flex: 1, justifyContent: 'center', gap: 20, width: '100%', maxWidth: 440, alignSelf: 'center' },
  }),
);
