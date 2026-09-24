import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button, ErrorText, Field, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { pendingInvite } from '@/lib/invite';
import { useMyGroups, useMyProfile } from '@/lib/queries';
import { colors, fonts, radius, shade, tint } from '@/lib/theme';
import type { MyGroup } from '@/lib/types';

export default function Home() {
  const { data: profile } = useMyProfile();
  const groups = useMyGroups();

  // Invitation ouverte avant d'avoir un compte : on y retourne une fois l'onboarding terminé.
  useEffect(() => {
    pendingInvite.get().then((code) => {
      if (!code) return;
      pendingInvite.clear();
      router.push({ pathname: '/join/[code]', params: { code } });
    });
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T variant="title">Mes groupes</T>
          {profile?.city ? (
            <T variant="caption">
              {countryFlag(profile.country_code)} Tu es à {profile.city}
            </T>
          ) : null}
        </View>
        <Link href="/me" asChild>
          <Pressable accessibilityLabel="Mon profil">
            {profile ? <Avatar name={profile.display_name} url={profile.avatar_url} color={profile.pin_color} size={48} /> : null}
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={groups.data ?? []}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={groups.isRefetching} onRefresh={groups.refetch} />}
        renderItem={({ item }) => <GroupCard group={item} />}
        ListEmptyComponent={groups.isPending ? null : <EmptyGroups />}
        ListHeaderComponent={<ErrorText error={groups.error} />}
        ListFooterComponent={
          (groups.data?.length ?? 0) > 0 ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              <Button label="＋ Créer un groupe" kind="ghost" onPress={() => router.push('/group/new')} />
              <JoinByCode />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function GroupCard({ group }: { group: MyGroup }) {
  return (
    <Link href={{ pathname: '/group/[id]', params: { id: group.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, { backgroundColor: tint(group.color, 0.45), transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <View style={[styles.cardEmoji, { backgroundColor: group.color }]}>
          <T style={{ fontSize: 30 }}>{group.emoji}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" numberOfLines={1}>
            {group.name}
          </T>
          <T style={{ fontFamily: fonts.bold, color: shade(group.color, 0.5) }}>
            {group.member_count} {group.member_count > 1 ? 'membres' : 'membre'}
          </T>
        </View>
        <T style={{ fontSize: 20, color: shade(group.color, 0.4) }}>›</T>
      </Pressable>
    </Link>
  );
}

function EmptyGroups() {
  return (
    <View style={styles.empty}>
      <T style={{ fontSize: 56 }}>🗺️</T>
      <T variant="heading" style={{ textAlign: 'center' }}>
        Ta carte est encore vide
      </T>
      <T style={{ textAlign: 'center', color: colors.inkSoft }}>
        Crée un groupe pour ta promo ou tes amis d&apos;enfance, puis partage le lien d&apos;invitation.
      </T>
      <Button label="Créer mon premier groupe ✨" onPress={() => router.push('/group/new')} style={{ alignSelf: 'stretch' }} />
      <JoinByCode />
    </View>
  );
}

function JoinByCode() {
  const [code, setCode] = useState('');
  const clean = code.trim().toUpperCase();
  return (
    <View style={styles.join}>
      <Field
        value={code}
        onChangeText={setCode}
        placeholder="Code d'invitation"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        style={{ flex: 1 }}
      />
      <Button
        label="Rejoindre"
        kind="ghost"
        disabled={clean.length < 8}
        onPress={() => router.push({ pathname: '/join/[code]', params: { code: clean } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  list: { padding: 20, gap: 12, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg },
  cardEmoji: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 40 },
  join: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'stretch' },
});
