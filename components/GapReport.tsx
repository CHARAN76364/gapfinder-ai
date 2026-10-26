import type { TopicPerf, TopicStatus } from '@/types/performance';

const STYLE: Record<TopicStatus, string> = {
  weak: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  strong: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  untested: 'bg-slate-100 text-slate-600 border-slate-200',
};
const BAR: Record<TopicStatus, string> = { weak: 'bg-red-500', medium: 'bg-amber-500', strong: 'bg-emerald-500', untested: 'bg-slate-300' };

export function StatusBadge({ status }: { status: TopicStatus }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLE[status]}`}>{status}</span>;
}

export default function GapReport({ gaps }: { gaps: TopicPerf[] }) {
  const rated = gaps.filter((g) => g.hasMaterial);
  const count = (s: TopicStatus) => rated.filter((g) => g.status === s).length;
  const order: TopicStatus[] = ['weak', 'medium', 'strong', 'untested'];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {order.map((s) => (
          <div key={s} className={`rounded-xl border p-4 ${STYLE[s]}`}>
            <p className="text-3xl font-bold">{count(s)}</p>
            <p className="text-sm font-medium capitalize">{s} topics</p>
          </div>
        ))}
      </div>
      <p className="muted mt-3">Rating rules: below 50% = weak, 50–79% = medium, 80%+ = strong. A topic needs at least 2 answered questions to be rated; recent quizzes count more.</p>
      <div className="mt-4 space-y-3">
        {order.flatMap((s) =>
          rated
            .filter((g) => g.status === s)
            .map((g) => (
              <div key={g.topicId} className="card !p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{g.topicName}</p>
                    <p className="text-xs text-slate-500">{g.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.trend !== null && g.trend !== 0 && <span className={`text-xs font-semibold ${g.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{g.trend > 0 ? '▲' : '▼'} {Math.abs(g.trend)} pts</span>}
                    <StatusBadge status={g.status} />
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${BAR[g.status]}`} style={{ width: `${g.score ?? 0}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-medium">Why: </span>
                  {g.reason}
                </p>
              </div>
            )),
        )}
      </div>
    </div>
  );
}
