import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { reprocessDocument } from '@/lib/documents';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return authed(async (user) => {
    const ok = reprocessDocument(user.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  });
}
