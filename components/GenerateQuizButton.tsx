'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateQuizButton({
  topicIds,
  count,
  label = 'Generate diagnostic quiz',
  small,
  secondary,
}: {
  topicIds?: string[];
  count?: number;
  label?: string;
  small?: boolean;
  secondary?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topicIds, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate a quiz.');
      router.push(`/quiz/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate a quiz.');
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={go} disabled={busy} className={`${secondary ? 'btn-secondary' : 'btn'} ${small ? '!py-1.5' : ''}`}>
        {busy ? 'Generating from your material…' : label}
      </button>
      {error && <span className="max-w-xs text-xs text-red-600">{error}</span>}
    </span>
  );
}
