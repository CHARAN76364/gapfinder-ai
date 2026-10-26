import { db } from './db';
import { embed } from './embeddings';
import { idfFor, scoreVec } from './retrieval';
import { extractTopics } from './topic-extractor';
import { sentences, tokens, uid } from './text';
import type { Topic } from '@/types/topic';

/**
 * Rebuilds the topic map for a student: syllabus → units → topics,
 * then maps every content chunk (and past-paper question) to its best topic.
 * Topic ids are kept stable across rebuilds (matched by name) so history survives uploads.
 */
export function rebuildTopicMap(userId: string): void {
  const d = db();
  const chunks = d.chunks.filter((c) => c.userId === userId);
  const syllabi = d.documents.filter((x) => x.userId === userId && x.kind === 'syllabus');

  let raws: { unit: string; name: string; docId: string }[] = [];
  for (const s of syllabi) raws.push(...extractTopics(s.rawText || '').map((t) => ({ ...t, docId: s.id })));

  if (!raws.length) {
    const seen = new Set<string>();
    for (const c of chunks) {
      if (c.role !== 'content' || !c.heading) continue;
      const k = c.heading.toLowerCase();
      if (seen.has(k) || seen.size >= 30) continue;
      seen.add(k);
      raws.push({ unit: c.docName, name: c.heading, docId: c.docId });
    }
  }
  const seenNames = new Set<string>();
  raws = raws.filter((r) => (seenNames.has(r.name.toLowerCase()) ? false : (seenNames.add(r.name.toLowerCase()), true)));

  const old = d.topics.filter((t) => t.userId === userId);
  const topics: Topic[] = raws.map((r, i) => {
    const prev = old.find((o) => o.name.toLowerCase() === r.name.toLowerCase());
    return {
      id: prev?.id ?? uid('t'),
      userId,
      docId: r.docId,
      unit: r.unit,
      name: r.name,
      order: i,
      keywords: [...new Set(tokens(r.name))],
      paperHits: 0,
    };
  });
  d.topics = d.topics.filter((t) => t.userId !== userId).concat(topics);

  const idf = idfFor(chunks.filter((c) => c.role !== 'syllabus'));
  const tv = topics.map((t) => ({ t, vec: embed(`${t.name} ${t.name} ${t.unit}`) }));

  const bestTopic = (vec: Record<string, number>, heading: string, text: string) => {
    const hTok = new Set(tokens(heading));
    let best: string | null = null;
    let bs = 0;
    for (const { t, vec: tvec } of tv) {
      let s = scoreVec(tvec, vec, idf);
      if (hTok.size && t.keywords.length) s += 0.6 * (t.keywords.filter((k) => hTok.has(k)).length / t.keywords.length);
      if (text.toLowerCase().includes(t.name.toLowerCase())) s += 0.15;
      if (s > bs) {
        bs = s;
        best = t.id;
      }
    }
    return { best, bs };
  };

  for (const c of chunks) {
    if (c.role === 'syllabus') {
      c.topicId = null;
      continue;
    }
    const { best, bs } = bestTopic(c.vector, c.heading, c.text);
    c.topicId = bs >= 0.08 ? best : null;
    if (c.role === 'paper') {
      for (const s of sentences(c.text)) {
        const r = bestTopic(embed(s), '', s);
        const t = topics.find((x) => x.id === r.best);
        if (t && r.bs >= 0.1) t.paperHits++;
      }
    }
  }
}
