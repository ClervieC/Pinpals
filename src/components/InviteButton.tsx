import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share } from 'react-native';

import { inviteMessage, inviteUrl } from '@/lib/invite';
import type { MyGroup } from '@/lib/types';

import { Button } from './ui';

/** Partage natif (WhatsApp, Messages…) ; sur le web, copie le lien. */
export function InviteButton({ group, label = 'Inviter des amis 💌' }: { group: MyGroup; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const message = inviteMessage(group.name, group.emoji, group.invite_code);
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await navigator.share({ text: message });
          return;
        } catch {
          // Partage annulé ou indisponible : on copie le lien.
        }
      }
      await Clipboard.setStringAsync(inviteUrl(group.invite_code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    await Share.share({ message });
  }

  return <Button label={copied ? 'Lien copié ✅' : label} color={group.color} onPress={invite} />;
}
