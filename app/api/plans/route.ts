import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { buildPlan, getPlan, setTaskDone } from '@/lib/plan-generator';

export async function GET() {
  return authed(async (user) => NextResponse.json({ plan: getPlan(user.id) }));
}

export async function POST(req: Request) {
  return authed(async (user) => {
    const body = await req.json().catch(() => ({}));
    const examDate = typeof body.examDate === 'string' ? body.examDate : undefined;
    if (examDate && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw new Error('Exam date must be a valid date.');
    const plan = buildPlan(user.id, { examDate, hoursPerDay: Number(body.hoursPerDay) || undefined });
    return NextResponse.json({ plan });
  });
}

export async function PATCH(req: Request) {
  return authed(async (user) => {
    const body = await req.json().catch(() => ({}));
    const ok = setTaskDone(user.id, String(body.taskId ?? ''), !!body.done);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  });
}
