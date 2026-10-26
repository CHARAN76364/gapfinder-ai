import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { submitQuiz } from '@/lib/quiz';

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return authed(async (user) => {
    const body = await req.json().catch(() => ({}));
    const raw = (body.answers ?? {}) as Record<string, unknown>;
    const answers: Record<string, string> = {};
    for (const k of Object.keys(raw)) answers[k] = String(raw[k] ?? '');
    const quiz = await submitQuiz(user.id, id, answers);
    return NextResponse.json({ id: quiz.id, scorePct: quiz.scorePct });
  });
}
