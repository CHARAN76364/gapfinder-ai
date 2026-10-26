import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { generateQuiz } from '@/lib/question-generator';

export const maxDuration = 60;

export async function POST(req: Request) {
  return authed(async (user) => {
    const body = await req.json().catch(() => ({}));
    const quiz = await generateQuiz(user.id, {
      count: typeof body.count === 'number' ? body.count : undefined,
      topicIds: Array.isArray(body.topicIds) ? body.topicIds.map(String) : undefined,
    });
    return NextResponse.json({ id: quiz.id, questions: quiz.questions.length });
  });
}
