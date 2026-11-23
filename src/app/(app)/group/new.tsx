import { router } from 'expo-router';

import { GroupForm } from '@/components/GroupForm';
import { Card, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useCreateGroup } from '@/lib/queries';

export default function NewGroup() {
  const create = useCreateGroup();

  return (
    <Screen scroll edges={['bottom']}>
      <T variant="caption" style={{ fontSize: 14 }}>{t('group.new.body')}</T>
      <Card>
        <GroupForm
          submitLabel={t('group.new.submit')}
          loading={create.isPending}
          error={create.error}
          onSubmit={(values) =>
            create.mutate(values, {
              onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
            })
          }
        />
      </Card>
    </Screen>
  );
}
