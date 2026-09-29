import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/lib/i18n';
import {
  useAddressShares,
  useDeleteAddress,
  useFriends,
  useMyAddress,
  useSaveAddress,
  useToggleAddressShare,
} from '@/lib/queries';
import { colors, radius } from '@/lib/theme';

import { FriendPicker } from './FriendPicker';
import { Button, ErrorText, Field, T } from './ui';

/** Mon adresse postale : jamais sur la carte, visible seulement par les ami·es que je coche. */
export function AddressSection() {
  const address = useMyAddress();
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const shares = useAddressShares();
  const toggle = useToggleAddressShare();
  const friends = useFriends();

  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setLine1(address.data?.line1 ?? '');
    setLine2(address.data?.line2 ?? '');
    setPostalCode(address.data?.postal_code ?? '');
    setCity(address.data?.city ?? '');
    setCountry(address.data?.country ?? '');
  }, [address.data]);

  const saved = address.data;
  const dirty =
    line1 !== (saved?.line1 ?? '') ||
    line2 !== (saved?.line2 ?? '') ||
    postalCode !== (saved?.postal_code ?? '') ||
    city !== (saved?.city ?? '') ||
    country !== (saved?.country ?? '');

  // Diff entre la sélection voulue et les partages existants : un appel par ami·e ajouté·e ou retiré·e.
  function setShared(next: string[]) {
    const current = shares.data ?? [];
    for (const id of next.filter((n) => !current.includes(n))) toggle.mutate({ viewerId: id, shared: true });
    for (const id of current.filter((c) => !next.includes(c))) toggle.mutate({ viewerId: id, shared: false });
  }

  return (
    <View style={styles.box}>
      <T variant="heading">{t('address.title')} 🔒</T>
      <T variant="caption">{t('address.hint')}</T>
      <Field label={t('address.line1')} value={line1} onChangeText={setLine1} maxLength={200} autoComplete="address-line1" />
      <Field label={t('address.line2')} value={line2} onChangeText={setLine2} maxLength={200} autoComplete="address-line2" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 120 }}>
          <Field
            label={t('address.postalCode')}
            value={postalCode}
            onChangeText={setPostalCode}
            maxLength={20}
            autoComplete="postal-code"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('address.city')} value={city} onChangeText={setCity} maxLength={100} />
        </View>
      </View>
      <Field label={t('address.country')} value={country} onChangeText={setCountry} maxLength={100} autoComplete="country" />
      <ErrorText error={address.error ?? save.error ?? remove.error} />
      <Button
        label={t('common.save')}
        kind="ghost"
        loading={save.isPending}
        disabled={!dirty || !line1.trim() || !city.trim()}
        onPress={() =>
          save.mutate({
            line1: line1.trim(),
            line2: line2.trim() || null,
            postal_code: postalCode.trim() || null,
            city: city.trim(),
            country: country.trim() || null,
          })
        }
      />

      {saved ? (
        <>
          <T variant="label">{t('address.sharedWith')}</T>
          {friends.data?.length ? (
            <FriendPicker friends={friends.data} selected={shares.data ?? []} onChange={setShared} />
          ) : (
            <T variant="caption">{t('memory.noFriends')}</T>
          )}
          <ErrorText error={shares.error ?? toggle.error} />
          <Button label={t('address.delete')} kind="danger" loading={remove.isPending} onPress={() => remove.mutate()} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, gap: 10, borderRadius: radius.lg, backgroundColor: colors.paper },
});
