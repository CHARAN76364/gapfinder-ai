import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

const STEPS = [
  ['Upload', 'Syllabus, notes and past papers (PDF or text).'],
  ['Retrieve', 'Your material is chunked, embedded and mapped to topics.'],
  ['Test', 'Quiz questions are generated only from retrieved passages — each with a citation.'],
  ['Evaluate', 'Every answer is explained against your own source text.'],
  ['Diagnose', 'Weak / medium / strong topics, with the reason for each rating.'],
  ['Plan', 'A prioritised revision schedule built from the gap report and your time.'],
  ['Improve', 'Retake, watch the score climb, and the plan adapts.'],
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">AI-personalized learning</p>
      <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
        Find your knowledge gaps <span className="text-indigo-600">before the exam does.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-600">
        GapFinder AI is not another “chat with your PDF” app. It tests you on your own material first, diagnoses exactly which topics are weak, and builds a revision plan that adapts as you improve.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={user ? '/dashboard' : '/login'} className="btn !px-6 !py-3 !text-base">
          {user ? 'Open dashboard' : 'Log in / Try the demo'}
        </Link>
      </div>
      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="card">
            <p className="text-xs font-bold text-indigo-600">STEP {i + 1}</p>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="muted mt-1">{d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
