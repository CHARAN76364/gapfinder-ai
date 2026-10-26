import Link from 'next/link';
import PageShell from '@/components/PageShell';
import PlanForm from '@/components/PlanForm';
import RevisionCalendar from '@/components/RevisionCalendar';
import { requireUser } from '@/lib/auth';
import { getPlan } from '@/lib/plan-generator';
import { StatusBadge } from '@/components/GapReport';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const user = await requireUser();
  const plan = getPlan(user.id);
  return (
    <PageShell name={user.name} title="Revision plan" subtitle="Prioritised from your gap report, your exam date and daily study time. It rebuilds automatically after every quiz.">
      <PlanForm examDate={user.examDate} hoursPerDay={user.hoursPerDay} hasPlan={!!plan} />
      {!plan ? (
        <div className="card mt-6">
          <p className="text-slate-600">
            No plan yet. Take a diagnostic quiz first, then create your plan. <Link href="/quiz/new" className="text-indigo-600 underline">Go to quiz</Link>
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevisionCalendar key={plan.id} tasks={plan.tasks} />
          </div>
          <aside className="space-y-4">
            <div className="card">
              <h2 className="font-semibold">Plan summary (v{plan.version})</h2>
              <p className="mt-2 text-sm text-slate-700">{plan.summary}</p>
              {plan.notes.map((n) => (
                <p key={n} className="mt-2 text-xs text-amber-700">{n}</p>
              ))}
            </div>
            <div className="card">
              <h2 className="font-semibold">Time per topic</h2>
              <ul className="mt-3 space-y-2">
                {Object.values(plan.snapshot)
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                      <span>{s.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{s.minutes} min</span>
                        <StatusBadge status={s.status} />
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            {plan.changeLog.length > 0 && (
              <div className="card border-indigo-200 bg-indigo-50">
                <h2 className="font-semibold text-indigo-900">What changed since the last plan</h2>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-indigo-900">
                  {plan.changeLog.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </PageShell>
  );
}
