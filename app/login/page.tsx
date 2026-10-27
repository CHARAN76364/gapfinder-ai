
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/LoginForm';
import { getCurrentUser } from '@/lib/auth';
import { DEMO, ensureDemo } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  await ensureDemo();

  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <Link
          href="/"
          className="mb-8 flex flex-col items-center text-center"
        >
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-200">
            G
          </span>

          <span className="text-3xl font-extrabold tracking-tight text-indigo-700">
            GapFinder <span className="text-slate-900">AI</span>
          </span>
        </Link>

        {/* Login card */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-7 text-center">
            <div className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              YOUR PERSONAL AI STUDY PLANNER
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find your learning gaps. Build a smarter study plan.
            </p>
          </div>

          <LoginForm
            demoEmail={DEMO.email}
            demoPassword={DEMO.password}
          />

          {/* Feature highlights */}
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-slate-100 pt-6">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <span className="text-xl" aria-hidden="true">
                📚
              </span>
              <p className="mt-2 text-xs font-medium text-slate-700">
                Topic maps
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <span className="text-xl" aria-hidden="true">
                🎯
              </span>
              <p className="mt-2 text-xs font-medium text-slate-700">
                Smart quizzes
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <span className="text-xl" aria-hidden="true">
                📈
              </span>
              <p className="mt-2 text-xs font-medium text-slate-700">
                Track progress
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Your learning materials and study progress should remain private
          to your account.
        </p>

        <p className="mt-3 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} GapFinder AI
        </p>
      </div>
    </main>
  );
}
