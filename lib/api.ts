import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import type { User } from '@/types/document';

export async function authed<T extends Response>(fn: (user: User) => Promise<T>): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  try {
    return await fn(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
