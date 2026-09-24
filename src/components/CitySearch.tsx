import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { countryFlag, searchCities } from '@/lib/geo';
import { colors, radius, tint } from '@/lib/theme';
import type { City } from '@/lib/types';

import { ErrorText, Field, T } from './ui';

/** Champ de recherche de ville avec autocomplétion (Photon, debounce 250 ms). */
export function CitySearch({ onSelect, accent }: { onSelect: (city: City) => void; accent: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const active = query.trim().length >= 2;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await searchCities(query, controller.signal));
      } catch (e) {
        if (!controller.signal.aborted) setError(e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, active]);

  return (
    <View style={{ gap: 12 }}>
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Bucarest, Lyon, Montréal…"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
      />
      {loading && active ? <ActivityIndicator color={colors.inkSoft} /> : null}
      <ErrorText error={error} />
      <View style={{ gap: 8 }}>
        {(active ? results : []).map((city) => (
          <Pressable
            key={city.id}
            onPress={() => onSelect(city)}
            style={({ pressed }) => [styles.result, pressed && { backgroundColor: tint(accent, 0.6) }]}
          >
            <T style={{ fontSize: 26 }}>{countryFlag(city.countryCode)}</T>
            <View style={{ flex: 1 }}>
              <T variant="heading" style={{ fontSize: 17 }}>
                {city.name}
              </T>
              <T variant="caption">{[city.region, city.country].filter(Boolean).join(', ')}</T>
            </View>
          </Pressable>
        ))}
        {!loading && active && results.length === 0 && !error ? (
          <T variant="caption">Aucune ville trouvée 🤔</T>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
});
