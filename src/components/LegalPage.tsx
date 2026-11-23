import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, fonts, themed } from '@/lib/theme';

import { Card, Screen, T } from './ui';

// À compléter avant publication : identité de l'éditeur et adresse de contact.
export const LEGAL = {
  editor: '[Nom de l’éditeur]',
  contact: '[contact@exemple.fr]',
};

export function LegalPage({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.body}>
        <T variant="caption">{t('legal.updated')}</T>
        <T style={{ color: colors.inkSoft }}>{intro}</T>
        {children}
      </View>
    </Screen>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ gap: 8 }}>
      <T variant="heading">{title}</T>
      {children}
    </Card>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <T>{children}</T>;
}

export function Item({ children }: { children: ReactNode }) {
  return (
    <View style={styles.item}>
      <T style={styles.bullet}>•</T>
      <T style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function B({ children }: { children: ReactNode }) {
  return <T style={{ fontFamily: fonts.semibold }}>{children}</T>;
}

const styles = themed(() =>
  StyleSheet.create({
    body: { gap: 16, paddingBottom: 24 },
    item: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
    bullet: { color: colors.inkSoft },
  }),
);
