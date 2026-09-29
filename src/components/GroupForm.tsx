import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/lib/i18n';
import { groupEmojis, pastels } from '@/lib/theme';

import { Button, ColorPicker, EmojiPicker, ErrorText, Field, T } from './ui';

export type GroupFormValues = { name: string; emoji: string; color: string };

type Props = {
  initial?: GroupFormValues;
  submitLabel: string;
  loading: boolean;
  error: unknown;
  onSubmit: (values: GroupFormValues) => void;
};

export function GroupForm({ initial, submitLabel, loading, error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? groupEmojis[0]);
  const [color, setColor] = useState(initial?.color ?? pastels[5]);

  return (
    <View style={{ gap: 20 }}>
      <Field label={t('group.name')} value={name} onChangeText={setName} placeholder={t('group.namePlaceholder')} maxLength={60} />
      <View style={{ gap: 8 }}>
        <T variant="label">{t('group.emoji')}</T>
        <EmojiPicker options={groupEmojis} value={emoji} onChange={setEmoji} />
      </View>
      <View style={{ gap: 8 }}>
        <T variant="label">{t('group.color')}</T>
        <ColorPicker options={pastels} value={color} onChange={setColor} />
      </View>
      <ErrorText error={error} />
      <Button
        label={submitLabel}
        color={color}
        loading={loading}
        disabled={!name.trim()}
        onPress={() => onSubmit({ name: name.trim(), emoji, color })}
      />
    </View>
  );
}

/** Bouton destructif en deux temps (Alert n'est pas fiable sur le web). */
export function ConfirmButton({ label, confirmLabel, onConfirm, loading }: { label: string; confirmLabel: string; onConfirm: () => void; loading?: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      label={armed ? confirmLabel : label}
      kind="danger"
      loading={loading}
      onPress={() => (armed ? onConfirm() : setArmed(true))}
    />
  );
}
