'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const KINDS = [
  { value: 'syllabus', label: 'Syllabus', hint: 'Builds the topic map (units → topics).' },
  { value: 'notes', label: 'Notes / textbook', hint: 'Source for questions, answers and citations.' },
  { value: 'past_paper', label: 'Past paper', hint: 'Shows which topics matter most.' },
];

export default function FileUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState('notes');
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [drag, setDrag] = useState(false);

  async function upload() {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set('kind', kind);
    files.forEach((f) => fd.append('files', f));
    if (text.trim()) {
      fd.set('text', text);
      fd.set('name', name);
    }
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json();
      const lines: string[] = [];
      (data.created ?? []).forEach((c: { name: string; chunks: number }) => lines.push(`✓ ${c.name} — ${c.chunks} passages indexed`));
      (data.errors ?? []).forEach((e: string) => lines.push(`✗ ${e}`));
      if (data.error) lines.push(`✗ ${data.error}`);
      setMsg({ ok: res.ok, text: lines.join('\n') });
      if (res.ok) {
        setFiles([]);
        setText('');
        setName('');
        if (input.current) input.current.value = '';
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: '✗ Upload failed. Please try again.' });
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Add study material</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-lg border p-3 text-left text-sm ${kind === k.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <span className="font-semibold">{k.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{k.hint}</span>
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          setFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => input.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}
      >
        <p className="font-medium text-slate-700">Drop PDF or text files here, or click to browse</p>
        <p className="muted mt-1">.pdf · .txt · .md — up to 15 MB each</p>
        <input ref={input} type="file" multiple accept=".pdf,.txt,.md,.text" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        {files.length > 0 && <p className="mt-3 text-sm text-indigo-700">{files.map((f) => f.name).join(', ')}</p>}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-indigo-700">Or paste text instead</summary>
        <input className="input mt-2" placeholder="Name (e.g. Chapter 3 notes)" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input mt-2 h-40" placeholder="Paste your notes or syllabus here…" value={text} onChange={(e) => setText(e.target.value)} />
      </details>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn" disabled={busy || (!files.length && !text.trim())} onClick={upload}>
          {busy ? 'Processing…' : 'Upload & process'}
        </button>
        <span className="muted">Text is extracted, split into cited passages, embedded and mapped to topics.</span>
      </div>
      {msg && <pre className={`mt-3 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</pre>}
    </div>
  );
}
