import { db, save } from './db';
import { evaluateAnswers } from './answer-evaluator';
import { buildPlan, getPlan } from './plan-generator';
import type { PublicQuestion, Quiz } from '@/types/question';

export function toPublic(quiz: Quiz): PublicQuestion[] {
  return quiz.questions.map((q) => ({
    id: q.id,
    topicName: q.topicName,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    loc: q.citation.loc,
  }));
}

export function getQuiz(userId: string, id: string): Quiz | null {
  const d = db();
  if (id === 'latest') {
    const subs = d.quizzes.filter((q) => q.userId === userId && q.status === 'submitted').sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
    return subs[0] ?? null;
  }
  return d.quizzes.find((q) => q.id === id && q.userId === userId) ?? null;
}

export async function submitQuiz(userId: string, id: string, answers: Record<string, string>): Promise<Quiz> {
  const quiz = getQuiz(userId, id);
  if (!quiz) throw new Error('Quiz not found');
  if (quiz.status === 'submitted') return quiz;
  const results = await evaluateAnswers(quiz.questions, answers);
  quiz.answers = answers;
  quiz.results = results;
  quiz.scorePct = Math.round((results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length)) * 100);
  quiz.status = 'submitted';
  quiz.submittedAt = new Date().toISOString();
  save();
  // The plan adapts automatically as soon as new evidence arrives.
  if (getPlan(userId)) {
    try {
      buildPlan(userId, { basedOnQuizId: quiz.id });
    } catch {
      /* plan refresh is best-effort */
    }
  }
  return quiz;
}
