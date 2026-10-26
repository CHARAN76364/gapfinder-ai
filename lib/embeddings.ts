import { tokens } from './text';

/**
 * Local, dependency-free embeddings: hashed unigram + bigram features with
 * sublinear term frequency, L2-normalised. Deterministic, offline and fast.
 * In production the same interface can be backed by a neural embedding model + pgvector
 * (see supabase/migrations/001_init.sql).
 */
export type SparseVec = Record<string, number>;
const DIM = 4096;

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return (x >>> 0) % DIM;
}

export function embed(text: string): SparseVec {
  const t = tokens(text);
  const tf: Record<number, number> = {};
  t.forEach((w, i) => {
    const k = h(w);
    tf[k] = (tf[k] ?? 0) + 1;
    if (i > 0) {
      const b = h(t[i - 1] + '_' + w);
      tf[b] = (tf[b] ?? 0) + 0.5;
    }
  });
  const v: SparseVec = {};
  let norm = 0;
  for (const k of Object.keys(tf)) {
    const w = 1 + Math.log(Math.max(tf[Number(k)], 0.5));
    v[k] = w;
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const k of Object.keys(v)) v[k] = Math.round((v[k] / norm) * 10000) / 10000;
  return v;
}

export function cosine(a: SparseVec, b: SparseVec): number {
  let dot = 0;
  for (const k in a) if (b[k]) dot += a[k] * b[k];
  return dot;
}
