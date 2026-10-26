'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ demoEmail, demoPassword }: { demoEmail: string; demoPassword: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="h1">{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
      <p className="muted mt-1">Your documents, quizzes and plans are private to your account.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === 'register' && (
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required minLength={mode === 'register' ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <button
        type="button"
        className="mt-3 w-full text-center text-sm text-indigo-600 hover:underline"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
      >
        {mode === 'login' ? "New here? Create an account" : 'Already have an account? Log in'}
      </button>
      <div className="mt-5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-4 text-sm">
        <p className="font-semibold text-indigo-900">Demo credentials (for judging)</p>
        <p className="mt-1 text-indigo-900">
          Email: <code className="rounded bg-white px-1">{demoEmail}</code>
          <br />
          Password: <code className="rounded bg-white px-1">{demoPassword}</code>
        </p>
        <button
          type="button"
          className="btn-secondary mt-3 !py-1.5"
          onClick={() => {
            setMode('login');
            setEmail(demoEmail);
            setPassword(demoPassword);
          }}
        >
          Fill demo credentials
        </button>
      </div>
    </div>
  );
}
