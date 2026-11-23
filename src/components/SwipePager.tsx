import { type ReactElement, useEffect, useRef } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { colors, themed } from '@/lib/theme';

import { Icon, type IconName } from './ui';

type Props<T> = {
  items: T[];
  /** Index de l'élément affiché (-1 : aucun). */
  index: number;
  /** Largeur d'une page. */
  width: number;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  /** Appelé quand l'utilisateur passe à un autre élément (swipe, flèches, clavier). */
  onChange: (item: T) => void;
  previousLabel: string;
  nextLabel: string;
};

/**
 * Fiches qu'on fait défiler une par une (ami·es, souvenirs sur la carte).
 * Swipe sur téléphone ; sur ordinateur, une souris ne « glisse » pas une liste, donc flèches
 * à l'écran et au clavier. Les points en dessous indiquent la position.
 */
export function SwipePager<T>({ items, index, width, keyExtractor, renderItem, onChange, previousLabel, nextLabel }: Props<T>) {
  const list = useRef<FlatList<T>>(null);

  // La sélection change ailleurs (tap sur un pin, flèche) : la liste suit.
  useEffect(() => {
    if (index >= 0) list.current?.scrollToIndex({ index, animated: true });
  }, [index]);

  // Fin de swipe détectée par un court délai sans défilement : react-native-web n'émet pas
  // onMomentumScrollEnd, donc on ne peut pas s'appuyer dessus pour suivre la fiche affichée.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(settle.current ?? undefined), []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    clearTimeout(settle.current ?? undefined);
    settle.current = setTimeout(() => {
      const i = Math.round(x / width);
      if (i !== index && items[i]) onChange(items[i]);
    }, 140);
  }

  const canStep = Platform.OS === 'web' && items.length > 1 && index >= 0;
  function step(delta: number) {
    const item = items[index + delta];
    if (item) onChange(item);
  }
  useEffect(() => {
    if (!canStep || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      // Pas pendant la saisie dans un champ.
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(index, 0)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={onScroll}
        scrollEventThrottle={32}
        renderItem={({ item }) => <View style={{ width }}>{renderItem(item)}</View>}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {canStep ? <StepButton icon="chevron-left" label={previousLabel} disabled={index <= 0} onPress={() => step(-1)} /> : null}
          {items.map((item, i) => (
            <View key={keyExtractor(item)} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
          {canStep ? (
            <StepButton icon="chevron-right" label={nextLabel} disabled={index >= items.length - 1} onPress={() => step(1)} />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepButton, { opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 14 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
    dotOn: { backgroundColor: colors.ink, width: 14 },
    stepButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
  }),
);
