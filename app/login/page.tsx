import { redirect } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/LoginForm';
import { getCurrentUser } from '@/lib/auth';
import { DEMO, ensureDemo } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  await ensureDemo();
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-2xl font-bold text-indigo-700">
        GapFinder <span className="text-slate-900">AI</span>
      </Link>
      <LoginForm demoEmail={DEMO.email} demoPassword="GapFinder2026#SecureDemo" />
    </main>
  );
}