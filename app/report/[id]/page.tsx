import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageShell from '@/components/PageShell';
import GapReport from '@/components/GapReport';
import GenerateQuizButton from '@/components/GenerateQuizButton';
import { requireUser } from '@/lib/auth';
import { getQuiz } from '@/lib/quiz';
import { analyzeGaps } from '@/lib/gap-analyzer';

export const dynamic = 'force-dynamic';

const V: Record<string, string> = { correct: 'bg-emerald-100 text-emerald-700', partial: 'bg-amber-100 text-amber-700', incorrect: 'bg-red-100 text-red-700' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const quiz = getQuiz(user.id, id);
  if (!quiz) redirect('/quiz/new');
  if (quiz.status !== 'submitted' || !quiz.results) redirect(`/quiz/${quiz.id}`);
  const gaps = analyzeGaps(user.id);
  return (
    <PageShell name={user.name} title="Gap report" subtitle="Topic ratings combine all your quiz attempts (recent ones count more). Each rating explains itself.">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="muted">This attempt</p>
          <p className="text-4xl font-bold text-indigo-700">{quiz.scorePct}%</p>
          {quiz.note && <p className="muted mt-1">{quiz.note}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/plan" className="btn">
            Build / update revision plan
          </Link>
          <GenerateQuizButton label="Take another quiz" secondary />
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Topic ratings</h2>
      <GapReport gaps={gaps} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Answer review</h2>
      <div className="space-y-3">
        {quiz.results.map((r, i) => (
          <div key={r.questionId} className="card !p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">
                Q{i + 1} · {r.topicName}
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${V[r.verdict]}`}>{r.verdict}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{r.prompt}</p>
            <p className="mt-2 text-sm">
              <span className="text-slate-500">Your answer: </span>
              {r.userAnswer}
            </p>
            {r.verdict !== 'correct' && (
              <p className="mt-1 text-sm">
                <span className="text-slate-500">Expected: </span>
                {r.correctAnswer}
              </p>
            )}
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{r.explanation}</p>
            <p className="mt-2 text-xs text-indigo-700">Source: {r.citation.loc}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
