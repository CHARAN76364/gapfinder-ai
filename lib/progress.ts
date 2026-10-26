import { db } from './db';
import type { ProgressPoint } from '@/types/performance';

export function getProgress(userId: string): { points: ProgressPoint[]; improvement: number | null } {
  const quizzes = db()
    .quizzes.filter((q) => q.userId === userId && q.status === 'submitted' && q.results)
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
  const points: ProgressPoint[] = quizzes.map((q, i) => {
    const byTopic: Record<string, number> = {};
    const groups: Record<string, number[]> = {};
    for (const r of q.results ?? []) (groups[r.topicId] ??= []).push(r.score);
    for (const k of Object.keys(groups)) byTopic[k] = Math.round((groups[k].reduce((s, x) => s + x, 0) / groups[k].length) * 100);
    return { quizId: q.id, number: i + 1, date: q.submittedAt ?? q.createdAt, scorePct: q.scorePct ?? 0, byTopic, note: q.note };
  });
  const improvement = points.length >= 2 ? points[points.length - 1].scorePct - points[0].scorePct : null;
  return { points, improvement };
}
