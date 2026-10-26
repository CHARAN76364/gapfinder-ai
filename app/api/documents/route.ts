import { NextResponse } from 'next/server';
import { authed } from '@/lib/api';
import { db } from '@/lib/db';
import { parseFile, parseText } from '@/lib/document-parser';
import { ingestDocument } from '@/lib/documents';
import type { DocKind } from '@/types/document';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KINDS: DocKind[] = ['syllabus', 'notes', 'past_paper'];
const MAX_BYTES = 15 * 1024 * 1024;

export async function GET() {
  return authed(async (user) => {
    const docs = db()
      .documents.filter((d) => d.userId === user.id)
      .map(({ rawText, ...rest }) => {
        void rawText;
        return rest;
      });
    return NextResponse.json({ documents: docs });
  });
}

export async function POST(req: Request) {
  return authed(async (user) => {
    const form = await req.formData();
    const kindRaw = String(form.get('kind') ?? 'notes') as DocKind;
    const kind: DocKind = KINDS.includes(kindRaw) ? kindRaw : 'notes';
    const created: { id: string; name: string; chunks: number }[] = [];
    const errors: string[] = [];

    const pasted = String(form.get('text') ?? '').trim();
    if (pasted) {
      const name = String(form.get('name') ?? '').trim() || 'Pasted notes';
      try {
        const parsed = parseText(pasted);
        const doc = ingestDocument(user.id, { name, kind, ...parsed });
        created.push({ id: doc.id, name: doc.name, chunks: doc.chunkCount });
      } catch (e) {
        errors.push(`${name}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }
    for (const f of form.getAll('files')) {
      if (typeof f === 'string') continue;
      const file = f as File;
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: file is larger than 15 MB.`);
        continue;
      }
      try {
        const parsed = await parseFile(file.name, Buffer.from(await file.arrayBuffer()));
        const doc = ingestDocument(user.id, { name: file.name, kind, ...parsed });
        created.push({ id: doc.id, name: doc.name, chunks: doc.chunkCount });
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'could not be processed'}`);
      }
    }
    if (!created.length && !errors.length) errors.push('Choose at least one file or paste some text.');
    return NextResponse.json({ created, errors }, { status: created.length ? 200 : 400 });
  });
}
