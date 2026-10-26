import Link from 'next/link';
import { StatusBadge } from './GapReport';
import GenerateQuizButton from './GenerateQuizButton';
import type { Topic } from '@/types/topic';
import type { TopicStatus } from '@/types/performance';

export interface TopicRow extends Topic {
  chunks: number;
  status: TopicStatus;
  score: number | null;
}

export default function TopicTree({ topics }: { topics: TopicRow[] }) {
  const units = [...new Set(topics.map((t) => t.unit))];
  return (
    <div className="space-y-5">
      {units.map((u) => (
        <section key={u} className="card">
          <h3 className="text-base font-semibold text-indigo-800">{u}</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {topics
              .filter((t) => t.unit === u)
              .map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="muted">
                      {t.chunks ? `${t.chunks} source passage${t.chunks === 1 ? '' : 's'}` : 'No material mapped yet'}
                      {t.paperHits > 0 && ` · appears ${t.paperHits}× in past papers`}
                      {t.score !== null && ` · score ${t.score}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    {t.chunks > 0 && (
                      <>
                        <Link href={`/assistant?topic=${t.id}`} className="btn-secondary !py-1.5">
                          Explain
                        </Link>
                        <GenerateQuizButton topicIds={[t.id]} count={4} label="Quiz" small />
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
