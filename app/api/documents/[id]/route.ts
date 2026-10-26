import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { removeDocument } from '@/lib/documents';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return authed(async (user) => {
    const ok = removeDocument(user.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  });
}
