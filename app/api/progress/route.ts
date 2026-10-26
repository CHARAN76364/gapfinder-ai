import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { getProgress } from '@/lib/progress';

export async function GET() {
  return authed(async (user) => NextResponse.json(getProgress(user.id)));
}
