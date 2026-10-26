import { db, save } from './db';
import { embed } from './embeddings';
import { chunkPages } from './chunking';
import { rebuildTopicMap } from './topics';
import { uid } from './text';
import type { Chunk, ChunkRole, Doc, DocKind } from '@/types/document';

export function locOf(doc: { name: string; paged: boolean }, page: number, heading: string): string {
  return `${doc.name}, ${doc.paged ? 'p.' : 'section '}${page}${heading ? ' — ' + heading : ''}`;
}

export function ingestDocument(
  userId: string,
  p: { name: string; kind: DocKind; pages: string[]; paged: boolean },
): Doc {
  const d = db();
  const doc: Doc = {
    id: uid('doc'),
    userId,
    name: p.name,
    kind: p.kind,
    paged: p.paged,
    pageCount: p.pages.length,
    chunkCount: 0,
    createdAt: new Date().toISOString(),
    rawText: p.kind === 'syllabus' ? p.pages.join('\n').slice(0, 200000) : undefined,
  };
  const raw = chunkPages(p.pages);
  if (!raw.length && p.kind !== 'syllabus') throw new Error(`No readable study text found in "${p.name}".`);
  const role: ChunkRole = p.kind === 'syllabus' ? 'syllabus' : p.kind === 'past_paper' ? 'paper' : 'content';
  for (const r of raw) {
    const c: Chunk = {
      id: uid('c'),
      userId,
      docId: doc.id,
      docName: doc.name,
      docKind: p.kind,
      role,
      page: r.page,
      heading: r.heading,
      loc: locOf(doc, r.page, r.heading),
      text: r.text,
      vector: embed(`${r.heading} ${r.text}`),
      topicId: null,
    };
    d.chunks.push(c);
  }
  doc.chunkCount = raw.length;
  d.documents.push(doc);
  rebuildTopicMap(userId);
  save();
  return doc;
}

export function removeDocument(userId: string, docId: string): boolean {
  const d = db();
  const doc = d.documents.find((x) => x.id === docId && x.userId === userId);
  if (!doc) return false;
  d.documents = d.documents.filter((x) => x.id !== docId);
  d.chunks = d.chunks.filter((c) => c.docId !== docId);
  rebuildTopicMap(userId);
  save();
  return true;
}

export function reprocessDocument(userId: string, docId: string): boolean {
  const d = db();
  const doc = d.documents.find((x) => x.id === docId && x.userId === userId);
  if (!doc) return false;
  const mine = d.chunks.filter((c) => c.docId === docId);
  for (const c of mine) c.vector = embed(`${c.heading} ${c.text}`);
  rebuildTopicMap(userId);
  save();
  return true;
}
