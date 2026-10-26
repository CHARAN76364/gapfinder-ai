'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/topics', label: 'Topic Map' },
  { href: '/quiz/new', label: 'Quiz' },
  { href: '/report/latest', label: 'Gap Report' },
  { href: '/plan', label: 'Revision Plan' },
  { href: '/assistant', label: 'Assistant' },
];

export default function Navbar({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-indigo-700">
          GapFinder <span className="text-slate-900">AI</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = path === l.href || (l.href !== '/dashboard' && path.startsWith('/' + l.href.split('/')[1]));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{name}</span>
          <button onClick={logout} className="btn-secondary !px-3 !py-1.5">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
