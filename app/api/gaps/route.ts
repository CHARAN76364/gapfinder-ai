import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { analyzeGaps } from '@/lib/gap-analyzer';

export async function GET() {
  return authed(async (user) => NextResponse.json({ gaps: analyzeGaps(user.id) }));
}
