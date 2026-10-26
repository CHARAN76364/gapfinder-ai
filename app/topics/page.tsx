import Link from 'next/link';
import PageShell from '@/components/PageShell';
import TopicTree, { type TopicRow } from '@/components/TopicTree';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeGaps } from '@/lib/gap-analyzer';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const user = await requireUser();
  const d = db();
  const perf = analyzeGaps(user.id);
  const rows: TopicRow[] = d.topics
    .filter((t) => t.userId === user.id)
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      ...t,
      chunks: d.chunks.filter((c) => c.topicId === t.id && c.role === 'content').length,
      status: perf.find((p) => p.topicId === t.id)?.status ?? 'untested',
      score: perf.find((p) => p.topicId === t.id)?.score ?? null,
    }));
  return (
    <PageShell name={user.name} title="Topic map" subtitle="Built from your syllabus (unit → topic). Each topic is linked to the passages of your notes that cover it.">
      {rows.length === 0 ? (
        <div className="card">
          <p className="text-slate-600">No topics yet — upload a syllabus (or notes with clear headings).</p>
          <Link href="/upload" className="btn mt-4">
            Upload material
          </Link>
        </div>
      ) : (
        <TopicTree topics={rows} />
      )}
    </PageShell>
  );
}
