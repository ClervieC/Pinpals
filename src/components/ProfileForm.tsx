import { useState } from 'react';
import { View } from 'react-native';

import { useSaveProfile } from '@/lib/queries';
import { pastels } from '@/lib/theme';
import type { Profile, SocialKey, Socials } from '@/lib/types';

import { AvatarPicker } from './AvatarPicker';
import { SOCIALS } from './MemberSheet';
import { Button, ColorPicker, ErrorText, Field, T } from './ui';

type Props = {
  profile: Profile | null | undefined;
  submitLabel: string;
  /** Onboarding : nom, avatar, couleur. Profil complet : job, bio, réseaux en plus. */
  full?: boolean;
  onSaved?: () => void;
};

export function ProfileForm({ profile, submitLabel, full = false, onSaved }: Props) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [color, setColor] = useState(profile?.pin_color ?? pastels[0]);
  const [emoji, setEmoji] = useState(profile?.pin_emoji ?? '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [socials, setSocials] = useState<Socials>(profile?.socials ?? {});
  const save = useSaveProfile();

  const clean = (s: string) => s.trim() || null;

  function submit() {
    save.mutate(
      {
        display_name: name.trim(),
        avatar_url: avatar,
        pin_color: color,
        pin_emoji: clean(emoji),
        ...(full && {
          job_title: clean(jobTitle),
          company: clean(company),
          bio: clean(bio),
          socials: Object.fromEntries(Object.entries(socials).filter(([, v]) => v?.trim())),
        }),
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <View style={{ gap: 20 }}>
      <AvatarPicker name={name} url={avatar} color={color} onChange={setAvatar} />

      <Field label="Ton prénom (ou surnom)" value={name} onChangeText={setName} placeholder="Camille" maxLength={50} />

      <View style={{ gap: 8 }}>
        <T variant="label">La couleur de ton pin</T>
        <ColorPicker options={pastels} value={color} onChange={setColor} />
      </View>

      <Field
        label="Un emoji qui te ressemble (optionnel)"
        value={emoji}
        onChangeText={(v) => setEmoji([...v].slice(-2).join(''))}
        placeholder="🌸"
        style={{ width: 90, textAlign: 'center', fontSize: 22 }}
      />

      {full ? (
        <>
          <Field label="Métier" value={jobTitle} onChangeText={setJobTitle} placeholder="Designer" />
          <Field label="Entreprise" value={company} onChangeText={setCompany} placeholder="Studio Nuage" />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Fan de randonnée et de bons croissants 🥐"
            multiline
            maxLength={280}
            style={{ minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }}
          />
          <View style={{ gap: 10 }}>
            <T variant="label">Réseaux</T>
            {(Object.keys(SOCIALS) as SocialKey[]).map((key) => (
              <Field
                key={key}
                value={socials[key] ?? ''}
                onChangeText={(v) => setSocials((s) => ({ ...s, [key]: v }))}
                placeholder={`${SOCIALS[key].icon} ${SOCIALS[key].label} : ${SOCIALS[key].placeholder}`}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ))}
          </View>
        </>
      ) : null}

      <ErrorText error={save.error} />
      <Button label={submitLabel} color={color} onPress={submit} loading={save.isPending} disabled={!name.trim()} />
    </View>
  );
}
