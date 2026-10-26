import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { db } from '@/lib/db';
import { analyzeGaps } from '@/lib/gap-analyzer';

export async function GET() {
  return authed(async (user) => {
    const perf = analyzeGaps(user.id);
    const topics = db()
      .topics.filter((t) => t.userId === user.id)
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ ...t, status: perf.find((p) => p.topicId === t.id)?.status ?? 'untested' }));
    return NextResponse.json({ topics });
  });
}
