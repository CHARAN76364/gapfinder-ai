'use client';

import type { PublicQuestion } from '@/types/question';

export default function QuizCard({
  q,
  index,
  value,
  onChange,
}: {
  q: PublicQuestion;
  index: number;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
          Q{index + 1} · {q.topicName}
        </span>
        <span className="text-slate-500">Source: {q.loc}</span>
      </div>
      <p className="mt-3 font-medium text-slate-900">{q.prompt}</p>
      {q.type === 'mcq' ? (
        <div className="mt-3 space-y-2">
          {q.options?.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${value === String(i) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name={q.id} checked={value === String(i)} onChange={() => onChange(String(i))} />
              {o}
            </label>
          ))}
        </div>
      ) : (
        <textarea className="input mt-3 h-28" placeholder="Write your answer in your own words…" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
