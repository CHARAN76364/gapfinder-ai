import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import type { User } from '@/types/document';

export const COOKIE = 'gf_session';
const WEEK = 7 * 24 * 60 * 60;

function sign(payload: string): string {
  return crypto.createHmac('sha256', db().secret).update(payload).digest('base64url');
}

export function createToken(userId: string): string {
  const p = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + WEEK * 1000 })).toString('base64url');
  return `${p}.${sign(p)}`;
}

export function readToken(token?: string): string | null {
  if (!token) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  const expected = sign(p);
  if (s.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    return e > Date.now() ? (u as string) : null;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: WEEK,
    secure: !!process.env.VERCEL,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const id = readToken(jar.get(COOKIE)?.value);
  if (!id) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}
