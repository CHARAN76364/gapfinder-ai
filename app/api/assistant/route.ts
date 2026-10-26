import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { answerQuestion } from '@/lib/assistant';

export const maxDuration = 60;

export async function POST(req: Request) {
  return authed(async (user) => {
    const body = await req.json().catch(() => ({}));
    const question = String(body.question ?? '').trim();
    if (question.length < 3) throw new Error('Ask a question about your material.');
    const res = await answerQuestion(user.id, question.slice(0, 500), body.topicId ? String(body.topicId) : undefined);
    return NextResponse.json(res);
  });
}
