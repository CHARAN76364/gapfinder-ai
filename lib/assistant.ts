import { db } from './db';
import { retrieve } from './retrieval';
import { llmAvailable, llmJson } from './llm';
import { sentences, tokens } from './text';

export interface AssistantCitation {
  n: number;
  docName: string;
  loc: string;
  excerpt: string;
}
export interface AssistantAnswer {
  answer: string;
  grounded: boolean;
  citations: AssistantCitation[];
  mode: 'llm' | 'extractive';
}

const NOT_FOUND =
  "I couldn't find this in your uploaded material, so I won't guess. Try rephrasing, or upload notes that cover it.";

/**
 * EXPLAIN-THIS-TOPIC ASSISTANT.
 * Retrieval decides WHAT evidence exists; generation only rewrites that evidence.
 * If retrieval finds nothing relevant, the assistant refuses instead of answering from model memory.
 */
export async function answerQuestion(userId: string, question: string, topicId?: string): Promise<AssistantAnswer> {
  const topic = topicId ? db().topics.find((t) => t.id === topicId && t.userId === userId) : undefined;
  const q = question.trim();
  const query = topic && tokens(q).length < 2 ? `${topic.name} ${q}` : q;
  let hits = retrieve(userId, query, { k: 5, topicId: topic?.id });
  if (!hits.length && topic) hits = retrieve(userId, query, { k: 5 });
  const qt = new Set(tokens(q));
  const good = hits.filter((h) => h.score >= 0.08 && (qt.size === 0 || h.overlap >= 1)).slice(0, 4);
  if (!good.length) return { answer: NOT_FOUND, grounded: false, citations: [], mode: 'extractive' };

  const passages = good.map((h, i) => ({ n: i + 1, chunk: h.chunk }));
  const mkCit = (ns: number[]): AssistantCitation[] =>
    passages
      .filter((p) => ns.includes(p.n))
      .map((p) => ({ n: p.n, docName: p.chunk.docName, loc: p.chunk.loc, excerpt: p.chunk.text.slice(0, 360) }));

  if (llmAvailable()) {
    const out = await llmJson<{ answer?: string; used?: number[] }>(
      'You are a study assistant. Answer the question using ONLY the numbered passages. Cite sources inline like [1] or [2]. If the passages do not contain the answer, set answer to exactly NOT_IN_MATERIAL. Never use outside knowledge. Return JSON {"answer": string, "used": number[]}.',
      JSON.stringify({ question: q, passages: passages.map((p) => ({ n: p.n, location: p.chunk.loc, text: p.chunk.text })) }),
      1200,
    );
    if (out?.answer) {
      if (out.answer.trim() === 'NOT_IN_MATERIAL') return { answer: NOT_FOUND, grounded: false, citations: [], mode: 'llm' };
      const cited = [...out.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= passages.length);
      if (cited.length) return { answer: out.answer, grounded: true, citations: mkCit([...new Set(cited)]), mode: 'llm' };
    }
  }

  // Extractive fallback: pick the best-matching sentences from the retrieved passages.
  const scored: { s: string; n: number; sc: number; pos: number }[] = [];
  passages.forEach((p) => {
    sentences(p.chunk.text).forEach((s, pos) => {
      const st = new Set(tokens(s));
      let m = 0;
      qt.forEach((t) => st.has(t) && m++);
      const topicBonus = topic ? topic.keywords.filter((k) => st.has(k)).length * 0.3 : 0;
      const sc = m + topicBonus + (5 - p.n) * 0.05;
      if (sc > 0) scored.push({ s, n: p.n, sc, pos });
    });
  });
  scored.sort((a, b) => b.sc - a.sc);
  const top = scored.slice(0, 3);
  if (!top.length) {
    const p = passages[0];
    return { answer: `${p.chunk.text.slice(0, 400)} [1]`, grounded: true, citations: mkCit([1]), mode: 'extractive' };
  }
  const used = [...new Set(top.map((t) => t.n))];
  return {
    answer: top.map((t) => `${t.s} [${t.n}]`).join(' '),
    grounded: true,
    citations: mkCit(used),
    mode: 'extractive',
  };
}
