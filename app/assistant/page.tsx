import PageShell from '@/components/PageShell';
import AssistantChat from '@/components/AssistantChat';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const topics = db()
    .topics.filter((t) => t.userId === user.id)
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ id: t.id, name: t.name }));
  return (
    <PageShell name={user.name} title="Explain-this-topic assistant" subtitle="Answers use only your uploaded material and always show the passages they came from. If your material doesn't cover it, the assistant says so.">
      <AssistantChat topics={topics} initialTopic={sp.topic} />
    </PageShell>
  );
}
