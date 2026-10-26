'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlanForm({ examDate, hoursPerDay, hasPlan }: { examDate?: string; hoursPerDay?: number; hasPlan: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState(examDate ?? '');
  const [hours, setHours] = useState(String(hoursPerDay ?? 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ examDate: date, hoursPerDay: Number(hours) }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error || 'Could not create the plan.');
    else router.refresh();
  }
  return (
    <form onSubmit={go} className="card flex flex-wrap items-end gap-4">
      <div>
        <label className="label">Exam date</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Study hours per day</label>
        <input type="number" min="0.5" max="12" step="0.5" className="input w-32" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
      <button className="btn" disabled={busy}>
        {busy ? 'Planning…' : hasPlan ? 'Rebuild plan' : 'Create my plan'}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
