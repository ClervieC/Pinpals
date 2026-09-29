import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/lib/i18n';
import { useSaveProfile } from '@/lib/queries';
import { pastels } from '@/lib/theme';
import type { Favorites, Profile, SocialKey, Socials } from '@/lib/types';

import { AvatarPicker } from './AvatarPicker';
import { DateField, type DateParts, parseDate } from './DateField';
import { FavoritesFields } from './FriendCard';
import { SOCIALS } from './MemberSheet';
import { Button, ColorPicker, ErrorText, Field, T } from './ui';

type Props = {
  profile: Profile | null | undefined;
  submitLabel: string;
  /** Onboarding : nom, avatar, couleur et fiche (anniversaire, goûts). Profil complet : job, bio, réseaux en plus. */
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
  const [birthday, setBirthday] = useState<DateParts>({
    day: profile?.birthday_day ? String(profile.birthday_day) : '',
    month: profile?.birthday_month ? String(profile.birthday_month) : '',
    year: profile?.birth_year ? String(profile.birth_year) : '',
  });
  const [favorites, setFavorites] = useState<Favorites>(profile?.favorites ?? {});
  const [wishlist, setWishlist] = useState(profile?.wishlist ?? '');
  const save = useSaveProfile();

  const clean = (s: string) => s.trim() || null;
  const parsedBirthday = parseDate(birthday, { yearOptional: true });

  function submit() {
    save.mutate(
      {
        display_name: name.trim(),
        avatar_url: avatar,
        pin_color: color,
        pin_emoji: clean(emoji),
        birthday_day: parsedBirthday && parsedBirthday !== 'invalid' ? parsedBirthday.day : null,
        birthday_month: parsedBirthday && parsedBirthday !== 'invalid' ? parsedBirthday.month : null,
        birth_year: parsedBirthday && parsedBirthday !== 'invalid' ? parsedBirthday.year : null,
        favorites: Object.fromEntries(Object.entries(favorites).filter(([, v]) => v?.trim())),
        wishlist: clean(wishlist),
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

      <Field label={t('profile.name')} value={name} onChangeText={setName} placeholder={t('profile.namePlaceholder')} maxLength={50} />

      <View style={{ gap: 8 }}>
        <T variant="label">{t('profile.pinColor')}</T>
        <ColorPicker options={pastels} value={color} onChange={setColor} />
      </View>

      <Field
        label={t('profile.emoji')}
        value={emoji}
        onChangeText={(v) => setEmoji([...v].slice(-2).join(''))}
        placeholder="🌸"
        style={{ width: 90, textAlign: 'center', fontSize: 22 }}
      />

      <DateField label={t('profile.birthday')} value={birthday} onChange={setBirthday} yearOptional />

      <FavoritesFields value={favorites} onChange={setFavorites} />

      <Field
        label={t('profile.wishlist')}
        value={wishlist}
        onChangeText={setWishlist}
        placeholder={t('profile.wishlistPlaceholder')}
        multiline
        maxLength={500}
        style={{ minHeight: 70, paddingTop: 12, textAlignVertical: 'top' }}
      />

      {full ? (
        <>
          <Field label={t('profile.job')} value={jobTitle} onChangeText={setJobTitle} placeholder={t('profile.jobPlaceholder')} />
          <Field label={t('profile.company')} value={company} onChangeText={setCompany} placeholder={t('profile.companyPlaceholder')} />
          <Field
            label={t('profile.bio')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('profile.bioPlaceholder')}
            multiline
            maxLength={280}
            style={{ minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }}
          />
          <View style={{ gap: 10 }}>
            <T variant="label">{t('profile.socials')}</T>
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
      <Button label={submitLabel} color={color} onPress={submit} loading={save.isPending} disabled={!name.trim() || parsedBirthday === 'invalid'} />
    </View>
  );
}
