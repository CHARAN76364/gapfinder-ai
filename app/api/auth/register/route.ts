import { NextResponse } from 'next/server';
import { db, save } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { setSession } from '@/lib/auth';
import { uid } from '@/lib/text';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim() || email.split('@')[0];
  const password = String(body.password ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  const d = db();
  if (d.users.some((u) => u.email === email)) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  const { salt, hash } = hashPassword(password);
  const user = { id: uid('user'), email, name, salt, passwordHash: hash, createdAt: new Date().toISOString() };
  d.users.push(user);
  save();
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
