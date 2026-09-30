import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/lib/i18n';
import {
  useAddressShares,
  useDeleteAddress,
  useFriends,
  useMyAddress,
  useSaveAddress,
  useToggleAddressShare,
} from '@/lib/queries';
import type { Address, AddressInput } from '@/lib/types';

import { FriendPicker } from './FriendPicker';
import { Chip } from './Tiles';
import { Button, ErrorText, Field, SectionCard, T } from './ui';

/** Mon adresse postale : jamais sur la carte, visible seulement par les ami·es que je coche. */
export function AddressSection() {
  const address = useMyAddress();
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const shares = useAddressShares();
  const toggle = useToggleAddressShare();
  const friends = useFriends();

  // Diff entre la sélection voulue et les partages existants : un appel par ami·e ajouté·e ou retiré·e.
  function setShared(next: string[]) {
    const current = shares.data ?? [];
    for (const id of next.filter((n) => !current.includes(n))) toggle.mutate({ viewerId: id, shared: true });
    for (const id of current.filter((c) => !next.includes(c))) toggle.mutate({ viewerId: id, shared: false });
  }

  return (
    <SectionCard icon="mail" title={t('address.title')} right={<Chip icon="lock" label={t('address.private')} />}>
      <T variant="caption">{t('address.hint')}</T>
      {address.isPending ? null : (
        // Remonté après chaque enregistrement : les champs repartent de la version sauvegardée.
        <AddressForm
          key={address.data?.updated_at ?? 'new'}
          address={address.data ?? null}
          saving={save.isPending}
          onSave={(input) => save.mutate(input)}
        />
      )}
      <ErrorText error={address.error ?? save.error ?? remove.error} />

      {address.data ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <T variant="label">{t('address.sharedWith')}</T>
          {friends.data?.length ? (
            <FriendPicker friends={friends.data} selected={shares.data ?? []} onChange={setShared} />
          ) : (
            <T variant="caption">{t('memory.noFriends')}</T>
          )}
          <ErrorText error={shares.error ?? toggle.error} />
          <Button label={t('address.delete')} kind="ghost" loading={remove.isPending} onPress={() => remove.mutate()} />
        </View>
      ) : null}
    </SectionCard>
  );
}

function AddressForm({
  address,
  saving,
  onSave,
}: {
  address: Address | null;
  saving: boolean;
  onSave: (input: AddressInput) => void;
}) {
  const [line1, setLine1] = useState(address?.line1 ?? '');
  const [line2, setLine2] = useState(address?.line2 ?? '');
  const [postalCode, setPostalCode] = useState(address?.postal_code ?? '');
  const [city, setCity] = useState(address?.city ?? '');
  const [country, setCountry] = useState(address?.country ?? '');

  const dirty =
    line1 !== (address?.line1 ?? '') ||
    line2 !== (address?.line2 ?? '') ||
    postalCode !== (address?.postal_code ?? '') ||
    city !== (address?.city ?? '') ||
    country !== (address?.country ?? '');

  return (
    <View style={{ gap: 12 }}>
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
      <Button
        label={t('common.save')}
        kind="secondary"
        loading={saving}
        disabled={!dirty || !line1.trim() || !city.trim()}
        onPress={() =>
          onSave({
            line1: line1.trim(),
            line2: line2.trim() || null,
            postal_code: postalCode.trim() || null,
            city: city.trim(),
            country: country.trim() || null,
          })
        }
      />
    </View>
  );
}
