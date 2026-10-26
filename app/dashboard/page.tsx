import Link from 'next/link';
import PageShell from '@/components/PageShell';
import ProgressChart from '@/components/ProgressChart';
import GenerateQuizButton from '@/components/GenerateQuizButton';
import { StatusBadge } from '@/components/GapReport';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeGaps } from '@/lib/gap-analyzer';
import { getPlan } from '@/lib/plan-generator';
import { getProgress } from '@/lib/progress';
import { ymd } from '@/lib/text';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await requireUser();
  const docs = db().documents.filter((d) => d.userId === user.id);
  const gaps = analyzeGaps(user.id).filter((g) => g.hasMaterial);
  const { points, improvement } = getProgress(user.id);
  const plan = getPlan(user.id);
  const today = ymd(new Date());
  const todays = plan?.tasks.filter((t) => t.date === today) ?? [];
  const weakest = gaps.filter((g) => g.status === 'weak' || g.status === 'medium').sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 5);
  const count = (s: string) => gaps.filter((g) => g.status === s).length;
  const last = points[points.length - 1];

  if (!docs.length)
    return (
      <PageShell name={user.name} title={`Welcome, ${user.name}`} subtitle="Start by uploading your syllabus and study notes.">
        <div className="card text-center">
          <p className="text-slate-600">No material yet.</p>
          <Link href="/upload" className="btn mt-4">
            Upload material
          </Link>
        </div>
      </PageShell>
    );

  return (
    <PageShell name={user.name} title={`Welcome back, ${user.name}`} subtitle="Your progress, weakest topics and today's revision tasks.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="muted">Latest quiz score</p>
          <p className="mt-1 text-3xl font-bold">{last ? `${last.scorePct}%` : '—'}</p>
        </div>
        <div className="card">
          <p className="muted">Improvement since first quiz</p>
          <p className={`mt-1 text-3xl font-bold ${improvement && improvement > 0 ? 'text-emerald-600' : ''}`}>{improvement === null ? '—' : `${improvement > 0 ? '+' : ''}${improvement} pts`}</p>
        </div>
        <div className="card">
          <p className="muted">Topics: weak / medium / strong</p>
          <p className="mt-1 text-3xl font-bold">
            <span className="text-red-600">{count('weak')}</span> / <span className="text-amber-600">{count('medium')}</span> / <span className="text-emerald-600">{count('strong')}</span>
          </p>
        </div>
        <div className="card">
          <p className="muted">Documents · quizzes taken</p>
          <p className="mt-1 text-3xl font-bold">
            {docs.length} · {points.length}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="font-semibold">Score history</h2>
          <div className="mt-3">
            <ProgressChart points={points} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <GenerateQuizButton label="Take the next adaptive quiz" />
            <Link href="/report/latest" className="btn-secondary">
              View gap report
            </Link>
          </div>
        </section>
        <section className="card">
          <h2 className="font-semibold">Focus topics</h2>
          {weakest.length === 0 ? (
            <p className="muted mt-3">No weak topics detected yet. Take a quiz to find out.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {weakest.map((g) => (
                <li key={g.topicId} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{g.topicName}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{g.score}%</span>
                    <StatusBadge status={g.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today&apos;s revision tasks</h2>
          <Link href="/plan" className="text-sm text-indigo-600 hover:underline">
            Full plan →
          </Link>
        </div>
        {!plan ? (
          <p className="muted mt-3">
            No plan yet. <Link href="/plan" className="text-indigo-600 underline">Create your revision plan</Link>.
          </p>
        ) : todays.length === 0 ? (
          <p className="muted mt-3">Nothing scheduled for today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todays.map((t) => (
              <li key={t.id} className={`text-sm ${t.done ? 'text-slate-400 line-through' : ''}`}>
                <span className="font-medium">{t.topicName}</span> — {t.minutes} min ({t.type}). <span className="text-slate-500">{t.reason}</span>
              </li>
            ))}
          </ul>
        )}
        {plan && plan.changeLog.length > 0 && (
          <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
            <p className="font-semibold">Plan updated after your latest quiz</p>
            <ul className="mt-1 list-inside list-disc">
              {plan.changeLog.slice(0, 4).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageShell>
  );
}
