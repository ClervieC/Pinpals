import { useUserId } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { useAddMemoryComment, useDeleteMemoryComment, useMemoryComments } from '@/lib/queries';

import { CommentComposer, CommentList } from './CommentThread';
import { ErrorText, SectionCard } from './ui';

/** Fil de commentaires d'un souvenir : toute l'audience peut commenter. */
export function MemoryComments({ memoryId, memoryAuthorId }: { memoryId: string; memoryAuthorId: string }) {
  const uid = useUserId();
  const comments = useMemoryComments(memoryId);
  const add = useAddMemoryComment(memoryId);
  const remove = useDeleteMemoryComment(memoryId);
  const list = comments.data ?? [];

  return (
    <SectionCard icon="message-circle" title={t('comments.title', { count: list.length })}>
      <ErrorText error={comments.error ?? remove.error} />
      {comments.isPending ? null : (
        <CommentList
          comments={list}
          // L'auteur du souvenir peut modérer sa page.
          canModerate={memoryAuthorId === uid}
          deletingId={remove.isPending ? (remove.variables ?? null) : null}
          onDelete={(id) => remove.mutate(id)}
          emptyLabel={t('comments.empty')}
        />
      )}
      <CommentComposer sending={add.isPending} error={add.error} onSend={(body, done) => add.mutate(body, { onSuccess: done })} />
    </SectionCard>
  );
}
