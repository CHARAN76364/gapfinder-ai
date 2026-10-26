'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  kind: string;
  pageCount: number;
  chunkCount: number;
  createdAt: string;
}

const LABEL: Record<string, string> = { syllabus: 'Syllabus', notes: 'Notes', past_paper: 'Past paper' };

export default function DocumentList({ docs }: { docs: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  async function remove(id: string) {
    if (!confirm('Delete this document? Its passages will be removed from your topic map.')) return;
    setBusy(id);
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    setBusy('');
    router.refresh();
  }
  if (!docs.length) return <p className="muted">No documents yet. Upload a syllabus and your notes to begin.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{d.name}</p>
            <p className="muted">
              {LABEL[d.kind] ?? d.kind} · {d.pageCount} page{d.pageCount === 1 ? '' : 's'}/sections · {d.chunkCount} passages
            </p>
          </div>
          <button className="btn-secondary !py-1.5 text-red-600" disabled={busy === d.id} onClick={() => remove(d.id)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
