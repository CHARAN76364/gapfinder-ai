'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizCard from './QuizCard';
import type { PublicQuestion } from '@/types/question';

export default function QuizRunner({ quizId, questions }: { quizId: string; questions: PublicQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answered = questions.filter((q) => (answers[q.id] ?? '').trim()).length;

  async function submit() {
    if (answered < questions.length && !confirm(`You answered ${answered} of ${questions.length} questions. Unanswered ones count as wrong. Submit anyway?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit.');
      router.push(`/report/${quizId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[57px] z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <span className="text-sm text-slate-600">
          {answered} / {questions.length} answered
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-indigo-500" style={{ width: `${(answered / Math.max(1, questions.length)) * 100}%` }} />
        </div>
      </div>
      {questions.map((q, i) => (
        <QuizCard key={q.id} q={q} index={i} value={answers[q.id] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
      ))}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? 'Evaluating your answers…' : 'Submit & see my gap report'}
      </button>
    </div>
  );
}
