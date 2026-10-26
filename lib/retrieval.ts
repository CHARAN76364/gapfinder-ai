import { db } from './db';
import { embed, type SparseVec } from './embeddings';
import { tokens } from './text';
import type { Chunk, ChunkRole } from '@/types/document';

export interface Hit {
  chunk: Chunk;
  score: number;
  overlap: number;
}

export function idfFor(chunks: Chunk[]): (b: string) => number {
  const N = chunks.length || 1;
  const df: Record<string, number> = {};
  for (const c of chunks) for (const k in c.vector) df[k] = (df[k] || 0) + 1;
  return (b: string) => Math.log(1 + (N - (df[b] || 0) + 0.5) / ((df[b] || 0) + 0.5));
}

export function scoreVec(q: SparseVec, c: SparseVec, idf: (b: string) => number): number {
  let dot = 0;
  let qn = 0;
  for (const k in q) {
    const w = q[k] * idf(k);
    qn += w * w;
    if (c[k]) dot += w * c[k];
  }
  return qn ? dot / Math.sqrt(qn) : 0;
}

/**
 * RETRIEVAL step. Pure search over the student's own chunks (no generation).
 * Score = IDF-weighted cosine over hashed embeddings + small heading boost.
 */
export function retrieve(
  userId: string,
  query: string,
  opts: { k?: number; topicId?: string; roles?: ChunkRole[] } = {},
): Hit[] {
  const roles = opts.roles ?? ['content'];
  const all = db().chunks.filter((c) => c.userId === userId && roles.includes(c.role));
  const pool = opts.topicId ? all.filter((c) => c.topicId === opts.topicId) : all;
  if (!pool.length) return [];
  const idf = idfFor(all);
  const q = embed(query);
  const qt = new Set(tokens(query));
  const hits: Hit[] = pool.map((chunk) => {
    let score = scoreVec(q, chunk.vector, idf);
    const ct = new Set(tokens(chunk.text));
    let overlap = 0;
    qt.forEach((t) => {
      if (ct.has(t)) overlap++;
    });
    if (chunk.heading) {
      const ht = tokens(chunk.heading);
      const m = ht.filter((t) => qt.has(t)).length;
      if (ht.length) score += 0.15 * (m / ht.length);
    }
    return { chunk, score, overlap };
  });
  return hits
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.k ?? 4);
}
