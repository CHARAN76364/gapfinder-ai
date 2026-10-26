import { db, save } from './db';
import { retrieve } from './retrieval';
import { llmAvailable, llmJson } from './llm';
import { analyzeGaps } from './gap-analyzer';
import { STOP, clamp, sentences, shuffle, stem, tokens, uid } from './text';
import type { Chunk } from '@/types/document';
import type { Topic } from '@/types/topic';
import type { Citation, Question, Quiz } from '@/types/question';

/**
 * QUESTION GENERATION.
 * Step 1 (retrieval): fetch the student's own passages for each topic.
 * Step 2 (generation): create questions ONLY from those passages (LLM if configured, rules otherwise).
 * Step 3 (verification): every question must cite a retrieved chunk and its answer must be supported by it.
 */

function bestExcerpt(chunk: Chunk, probe: string): string {
  const ss = sentences(chunk.text);
  if (!ss.length) return chunk.text.slice(0, 300);
  const pt = new Set(tokens(probe));
  let best = ss[0];
  let bs = -1;
  for (const s of ss) {
    const sc = tokens(s).filter((t) => pt.has(t)).length;
    if (sc > bs) {
      bs = sc;
      best = s;
    }
  }
  return best.slice(0, 320);
}

function citationFor(chunk: Chunk, probe: string): Citation {
  return { chunkId: chunk.id, docName: chunk.docName, loc: chunk.loc, heading: chunk.heading, excerpt: bestExcerpt(chunk, probe) };
}

function supported(answer: string, chunk: Chunk): boolean {
  const at = tokens(answer);
  if (!at.length) return false;
  const ct = new Set(tokens(chunk.text));
  return at.filter((t) => ct.has(t)).length / at.length >= 0.5;
}

const isAcr = (w: string) => /^[A-Z][A-Z0-9/]{1,7}$/.test(w);
const isCap = (w: string) => /^[A-Z]/.test(w);

function candidatesIn(sentence: string, avoid: Set<string>): { term: string; score: number }[] {
  const out = new Map<string, number>();
  const words = [...sentence.matchAll(/[A-Za-z][A-Za-z0-9/-]*/g)];
  words.forEach((m, i) => {
    const w = m[0];
    const lw = w.toLowerCase();
    if (STOP.has(lw)) return;
    if (!(w.length >= 4 || isAcr(w))) return;
    let s = 0;
    if (isAcr(w)) s += 3;
    else if (isCap(w) && i > 0) s += 2;
    if (w.length >= 7) s += 1;
    if (avoid.has(stem(lw))) s -= 5;
    out.set(w, Math.max(out.get(w) ?? -9, s));
  });
  return [...out.entries()].map(([term, score]) => ({ term, score })).sort((a, b) => b.score - a.score);
}

function termPool(chunks: Chunk[]): string[] {
  const set = new Set<string>();
  for (const c of chunks) {
    for (const m of c.text.matchAll(/[A-Za-z][A-Za-z0-9/-]{3,}|[A-Z]{2,7}/g)) {
      const w = m[0];
      if (!STOP.has(w.toLowerCase())) set.add(w);
    }
  }
  return [...set];
}

function makeCloze(
  topic: Topic,
  chunk: Chunk,
  used: Set<string>,
  topicTerms: string[],
  allTerms: string[],
): Question | null {
  const avoid = new Set([...topic.keywords, ...tokens(chunk.heading)]);
  const ss = sentences(chunk.text).filter((s) => {
    const n = s.split(/\s+/).length;
    return n >= 8 && n <= 40 && !used.has(s);
  });
  let pick: { s: string; term: string; score: number } | null = null;
  for (const s of ss) {
    const c = candidatesIn(s, avoid)[0];
    if (!c) continue;
    const def = /\b(is|are|uses|provides|translates|ensures|allows|maps|defines|means)\b/i.test(s) ? 1 : 0;
    const total = c.score + def;
    if (!pick || total > pick.score) pick = { s, term: c.term, score: total };
  }
  if (!pick || pick.score < 1) return null;
  const { s, term } = pick;
  const re = new RegExp(`(^|[^A-Za-z0-9])${term.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![A-Za-z0-9])`);
  if (!re.test(s)) return null;
  const blanked = s.replace(re, (_m, p1) => `${p1}_____`);
  const sl = s.toLowerCase();
  const ok = (w: string) => w.toLowerCase() !== term.toLowerCase() && !sl.includes(w.toLowerCase()) && isAcr(w) === isAcr(term) && isCap(w) === isCap(term);
  const distract = [...new Set([...shuffle(topicTerms.filter(ok)), ...shuffle(allTerms.filter(ok))])].slice(0, 3);
  if (distract.length < 3) return null;
  used.add(s);
  const options = shuffle([term, ...distract]);
  return {
    id: uid('q'),
    topicId: topic.id,
    topicName: topic.name,
    type: 'mcq',
    prompt: `Complete the statement from your material: "${blanked}"`,
    options,
    answerIndex: options.indexOf(term),
    referenceAnswer: term,
    keyTerms: [term],
    citation: { chunkId: chunk.id, docName: chunk.docName, loc: chunk.loc, heading: chunk.heading, excerpt: s },
    generator: 'rules',
  };
}

function makeShort(topic: Topic, chunk: Chunk): Question {
  const ss = sentences(chunk.text);
  let ref = '';
  for (const s of ss) {
    if ((ref + ' ' + s).length > 460) break;
    ref += (ref ? ' ' : '') + s;
    if (ref.split(/\s+/).length >= 45) break;
  }
  if (!ref) ref = chunk.text.slice(0, 400);
  const freq = new Map<string, number>();
  for (const w of chunk.text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []) if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const refWords = new Set(ref.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []);
  const keyTerms = [...refWords].filter((w) => !STOP.has(w)).sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || b.length - a.length).slice(0, 7);
  const sub = chunk.heading && chunk.heading.toLowerCase() !== topic.name.toLowerCase() ? ` (focus: ${chunk.heading})` : '';
  return {
    id: uid('q'),
    topicId: topic.id,
    topicName: topic.name,
    type: 'short',
    prompt: `In your own words, explain "${topic.name}"${sub} as described in your study material.`,
    referenceAnswer: ref,
    keyTerms,
    citation: { chunkId: chunk.id, docName: chunk.docName, loc: chunk.loc, heading: chunk.heading, excerpt: ref.slice(0, 320) },
    generator: 'rules',
  };
}

interface LlmQ {
  topicId: string;
  chunkId: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
  answerIndex?: number;
  referenceAnswer: string;
  keyTerms?: string[];
}

async function llmQuestions(
  plan: { topic: Topic; chunks: Chunk[]; mcq: number; short: number }[],
): Promise<Question[]> {
  const out = await llmJson<{ questions?: LlmQ[] }>(
    'You write exam questions STRICTLY from the supplied passages. Never use outside knowledge. Each question must be answerable from the passage whose id you cite in chunkId. MCQs have exactly 4 plausible options and one correct answer. Short-answer questions need a referenceAnswer copied or tightly paraphrased from the passage and 3-7 keyTerms. Return JSON only.',
    JSON.stringify({
      schema:
        '{"questions":[{"topicId":"...","chunkId":"...","type":"mcq|short","prompt":"...","options":["a","b","c","d"],"answerIndex":0,"referenceAnswer":"...","keyTerms":["..."]}]}',
      items: plan.map((p) => ({
        topicId: p.topic.id,
        topic: p.topic.name,
        wantMcq: p.mcq,
        wantShort: p.short,
        passages: p.chunks.map((c) => ({ chunkId: c.id, location: c.loc, text: c.text })),
      })),
    }),
    4000,
  );
  const res: Question[] = [];
  for (const q of out?.questions ?? []) {
    const p = plan.find((x) => x.topic.id === q.topicId);
    const chunk = p?.chunks.find((c) => c.id === q.chunkId);
    if (!p || !chunk || !q.prompt || !q.referenceAnswer) continue;
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.answerIndex === undefined || !q.options[q.answerIndex]) continue;
      if (new Set(q.options.map((o) => o.toLowerCase())).size !== 4) continue;
    }
    const correct = q.type === 'mcq' ? (q.options as string[])[q.answerIndex as number] : q.referenceAnswer;
    if (!supported(correct + ' ' + (q.type === 'mcq' ? q.prompt : ''), chunk)) continue;
    res.push({
      id: uid('q'),
      topicId: p.topic.id,
      topicName: p.topic.name,
      type: q.type === 'mcq' ? 'mcq' : 'short',
      prompt: q.prompt,
      options: q.type === 'mcq' ? q.options : undefined,
      answerIndex: q.type === 'mcq' ? q.answerIndex : undefined,
      referenceAnswer: correct,
      keyTerms: (q.keyTerms ?? []).slice(0, 7),
      citation: citationFor(chunk, q.referenceAnswer),
      generator: 'llm',
    });
  }
  return res;
}

export async function generateQuiz(
  userId: string,
  opts: { count?: number; topicIds?: string[]; note?: string } = {},
): Promise<Quiz> {
  const d = db();
  const count = clamp(Math.round(opts.count ?? 12), 4, 20);
  const topics = d.topics.filter((t) => t.userId === userId);
  const withMaterial = topics.filter((t) => d.chunks.some((c) => c.userId === userId && c.topicId === t.id && c.role === 'content'));
  if (!withMaterial.length)
    throw new Error('No study material is mapped to topics yet. Upload your notes/textbook (and a syllabus) first.');

  const perf = analyzeGaps(userId);
  const rank: Record<string, number> = { weak: 0, untested: 1, medium: 2, strong: 3 };
  let pool = opts.topicIds?.length ? withMaterial.filter((t) => opts.topicIds?.includes(t.id)) : withMaterial;
  if (!pool.length) pool = withMaterial;
  pool = [...pool].sort((a, b) => {
    const ra = rank[perf.find((p) => p.topicId === a.id)?.status ?? 'untested'];
    const rb = rank[perf.find((p) => p.topicId === b.id)?.status ?? 'untested'];
    return ra - rb || a.order - b.order;
  });
  const n = Math.min(pool.length, Math.max(1, Math.ceil(count / 2)));
  const chosen = pool.slice(0, n);
  const target = Math.min(count, n * 4);

  const allContent = d.chunks.filter((c) => c.userId === userId && c.role === 'content');
  const allTerms = termPool(allContent);

  const per = chosen.map((_, i) => Math.floor(target / n) + (i < target % n ? 1 : 0));
  const questions: Question[] = [];
  const plan = chosen.map((topic, i) => {
    // RETRIEVAL: best passages for this topic from the student's own material
    let chunks = retrieve(userId, `${topic.name} ${topic.unit}`, { k: 4, topicId: topic.id }).map((h) => h.chunk);
    if (!chunks.length) chunks = allContent.filter((c) => c.topicId === topic.id).slice(0, 4);
    const total = per[i];
    const short = total >= 2 ? Math.max(1, Math.round(total / 3)) : 0;
    return { topic, chunks: shuffle(chunks), mcq: total - short, short };
  });

  // GENERATION (LLM when configured) — only from retrieved passages
  let fromLlm: Question[] = [];
  if (llmAvailable()) fromLlm = await llmQuestions(plan);

  for (const p of plan) {
    const have = fromLlm.filter((q) => q.topicId === p.topic.id);
    const mcqHave = have.filter((q) => q.type === 'mcq').slice(0, p.mcq);
    const shortHave = have.filter((q) => q.type === 'short').slice(0, p.short);
    questions.push(...mcqHave, ...shortHave);
    const used = new Set<string>();
    const topicTerms = termPool(p.chunks);
    let guard = 0;
    for (let i = mcqHave.length; i < p.mcq && guard < 12; guard++) {
      const chunk = p.chunks[guard % p.chunks.length];
      const q = makeCloze(p.topic, chunk, used, topicTerms, allTerms);
      if (q) {
        questions.push(q);
        i++;
      } else if (guard >= p.chunks.length * 3) {
        questions.push(makeShort(p.topic, chunk));
        i++;
      }
    }
    for (let i = shortHave.length; i < p.short; i++) questions.push(makeShort(p.topic, p.chunks[i % p.chunks.length]));
  }

  // Safety net: never ship an ungrounded question.
  const valid = questions.filter((q) => q.citation?.chunkId && allContent.some((c) => c.id === q.citation.chunkId));
  if (!valid.length) throw new Error('Could not generate questions from your material. Try uploading more detailed notes.');

  const quiz: Quiz = {
    id: uid('quiz'),
    userId,
    createdAt: new Date().toISOString(),
    status: 'open',
    note: opts.note,
    questions: shuffle(valid),
  };
  d.quizzes.push(quiz);
  save();
  return quiz;
}
