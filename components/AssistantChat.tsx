'use client';

import { useState } from 'react';

interface Cit {
  n: number;
  docName: string;
  loc: string;
  excerpt: string;
}
interface Msg {
  q: string;
  answer: string;
  grounded: boolean;
  citations: Cit[];
  mode: string;
}

export default function AssistantChat({ topics, initialTopic }: { topics: { id: string; name: string }[]; initialTopic?: string }) {
  const [topicId, setTopicId] = useState(initialTopic ?? '');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const topicName = topics.find((t) => t.id === topicId)?.name;

  async function ask(question: string) {
    if (question.trim().length < 3) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, topicId: topicId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not answer.');
      setMsgs((m) => [{ q: question, ...data }, ...m]);
      setQ('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not answer.');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="card">
        <label className="label">Focus on a topic (optional)</label>
        <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">All my material</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input className="input" placeholder="Ask anything about your uploaded material…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" disabled={busy}>
            {busy ? 'Searching…' : 'Ask'}
          </button>
        </form>
        {topicName && (
          <button className="btn-secondary mt-3" disabled={busy} onClick={() => ask(`Explain ${topicName}`)}>
            Explain “{topicName}”
          </button>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-5 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className="card">
            <p className="text-sm font-semibold text-slate-900">{m.q}</p>
            <p className={`mt-2 text-sm leading-relaxed ${m.grounded ? 'text-slate-800' : 'text-amber-800'}`}>{m.answer}</p>
            {m.citations.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {m.citations.map((c) => (
                  <div key={c.n} className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-indigo-700">
                      [{c.n}] {c.loc}
                    </p>
                    <p className="mt-1 text-slate-600">{c.excerpt}…</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-400">{m.grounded ? `Answered only from retrieved passages (${m.mode === 'llm' ? 'LLM rewrite' : 'extractive'})` : 'Not found in your material — no answer generated'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
