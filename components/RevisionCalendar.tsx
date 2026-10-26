'use client';

import { useState } from 'react';
import type { PlanTask } from '@/types/performance';

const ICON: Record<string, string> = { learn: '📖', practice: '✍️', review: '🔁', mock: '🎯' };

function pretty(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function RevisionCalendar({ tasks: initial }: { tasks: PlanTask[] }) {
  const [tasks, setTasks] = useState(initial);
  const days = [...new Set(tasks.map((t) => t.date))].sort();
  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  async function toggle(t: PlanTask) {
    setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await fetch('/api/plans', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: t.id, done: !t.done }) });
  }

  if (!tasks.length) return <p className="muted">No tasks yet.</p>;
  const done = tasks.filter((t) => t.done).length;
  return (
    <div>
      <p className="muted mb-3">
        {done} of {tasks.length} tasks completed
      </p>
      <div className="space-y-4">
        {days.map((day) => {
          const list = tasks.filter((t) => t.date === day);
          return (
            <div key={day} className={`card !p-4 ${day === today ? 'ring-2 ring-indigo-300' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {pretty(day)} {day === today && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">Today</span>}
                </h3>
                <span className="muted">{list.reduce((s, t) => s + t.minutes, 0)} min</span>
              </div>
              <ul className="mt-2 space-y-2">
                {list.map((t) => (
                  <li key={t.id} className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1.5" checked={t.done} onChange={() => toggle(t)} />
                    <div className={t.done ? 'opacity-50 line-through' : ''}>
                      <p className="text-sm font-medium">
                        {ICON[t.type]} {t.topicName} <span className="font-normal text-slate-500">· {t.minutes} min · {t.type}</span>
                      </p>
                      <p className="text-xs text-slate-600">{t.reason}</p>
                      {t.sources.length > 0 && <p className="text-xs text-indigo-700">Read: {t.sources.join(' | ')}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
