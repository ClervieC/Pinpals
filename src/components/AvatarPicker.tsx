import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useUserId } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { uploadAvatar } from '@/lib/queries';
import { colors } from '@/lib/theme';

import { Avatar } from './Avatar';
import { ErrorText, T } from './ui';

type Props = {
  name: string;
  url: string | null;
  color: string;
  onChange: (url: string) => void;
};

/** Avatar cliquable : choix dans la galerie, recadrage carré, upload dans le bucket avatars. */
export function AvatarPicker({ name, url, color, onChange }: Props) {
  const uid = useUserId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setUploading(true);
    setError(null);
    try {
      // `base64` est toujours du JPEG, quel que soit le format d'origine.
      onChange(await uploadAvatar(uid, asset.base64, 'image/jpeg'));
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={pick} disabled={uploading} accessibilityLabel={t('profile.changeAvatar')}>
        <Avatar name={name || '?'} url={url} color={color} size={120} ring={6} />
        <View style={styles.badge}>
          {uploading ? <ActivityIndicator size="small" color={colors.ink} /> : <T style={{ fontSize: 16 }}>📷</T>}
        </View>
      </Pressable>
      <ErrorText error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
  },
});
