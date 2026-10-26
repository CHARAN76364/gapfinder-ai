import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { setSession } from '@/lib/auth';
import { ensureDemo } from '@/lib/seed';

export async function POST(req: Request) {
  await ensureDemo();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const user = db().users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
