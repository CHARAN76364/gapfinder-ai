import fs from 'fs';
import path from 'path';
import { db, save } from './db';
import { hashPassword } from './password';
import { parseText } from './document-parser';
import { ingestDocument } from './documents';
import { generateQuiz } from './question-generator';
import { submitQuiz } from './quiz';
import { buildPlan } from './plan-generator';
import { addDays, uid, ymd } from './text';
import type { DocKind } from '@/types/document';

export const DEMO = { email: 'demo@gapfinder.ai', password: 'Demo@1234', name: 'Demo Student' };

async function doSeed(): Promise<void> {
  const d = db();
  if (d.users.some((u) => u.email === DEMO.email)) return;
  const { salt, hash } = hashPassword(DEMO.password);
  const user = {
    id: uid('user'),
    email: DEMO.email,
    name: DEMO.name,
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    examDate: ymd(addDays(new Date(), 14)),
    hoursPerDay: 2,
  };
  d.users.push(user);
  save();
  try {
    const dir = path.join(process.cwd(), 'samples');
    const files: [string, DocKind, string][] = [
      ['computer-networks-syllabus.txt', 'syllabus', 'Computer Networks Syllabus.txt'],
      ['computer-networks-notes.txt', 'notes', 'Computer Networks Notes.txt'],
      ['computer-networks-past-paper.txt', 'past_paper', 'Computer Networks Past Paper.txt'],
    ];
    for (const [file, kind, name] of files) {
      const p = path.join(dir, file);
      if (!fs.existsSync(p)) continue;
      const parsed = parseText(fs.readFileSync(p, 'utf8'));
      ingestDocument(user.id, { name, kind, pages: parsed.pages, paged: parsed.paged });
    }
    // Sample baseline attempt so the dashboard, gap report and plan are populated for judges.
    const quiz = await generateQuiz(user.id, { count: 12, note: 'Sample baseline attempt (simulated answers)' });
    const topicOrder = d.topics.filter((t) => t.userId === user.id).map((t) => t.id);
    const counters: Record<string, number> = {};
    const answers: Record<string, string> = {};
    for (const q of quiz.questions) {
      const mode = topicOrder.indexOf(q.topicId) % 3;
      const k = (counters[q.topicId] = (counters[q.topicId] ?? 0) + 1);
      const right = mode === 2 || (mode === 1 && k === 1);
      if (q.type === 'mcq') answers[q.id] = String(right ? q.answerIndex : ((q.answerIndex ?? 0) + 1) % 4);
      else answers[q.id] = right ? q.referenceAnswer : 'I am not sure about this.';
    }
    await submitQuiz(user.id, quiz.id, answers);
    buildPlan(user.id, { basedOnQuizId: quiz.id });
  } catch (e) {
    console.error('[seed] demo data partially created:', e);
  }
}

export function ensureDemo(): Promise<void> {
  const g = globalThis as unknown as { __gfseed?: Promise<void> };
  if (!g.__gfseed) g.__gfseed = doSeed().catch((e) => console.error('[seed] failed', e));
  return g.__gfseed;
}
