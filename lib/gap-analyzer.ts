import { db } from './db';
import type { TopicPerf, TopicStatus } from '@/types/performance';

export const WEAK_BELOW = 50;
export const STRONG_FROM = 80;
const MIN_EVIDENCE = 2;

/**
 * GAP ANALYSIS: turns quiz results into topic-level diagnoses.
 * - recency-weighted mastery (latest quiz counts most)
 * - needs >= 2 answered questions before a topic is classified (otherwise "untested")
 * - thresholds: <50 weak, 50-79 medium, >=80 strong
 */
export function analyzeGaps(userId: string): TopicPerf[] {
  const d = db();
  const topics = d.topics.filter((t) => t.userId === userId).sort((a, b) => a.order - b.order);
  const quizzes = d.quizzes
    .filter((q) => q.userId === userId && q.status === 'submitted' && q.results)
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));

  return topics.map((t) => {
    const chunks = d.chunks.filter((c) => c.userId === userId && c.topicId === t.id && c.role === 'content');
    const hasMaterial = chunks.length > 0;
    const importance = 1 + Math.min(t.paperHits, 4) * 0.25;

    const perQuiz: { score: number; n: number }[] = [];
    const missed: string[] = [];
    const missedLocs: string[] = [];
    let total = 0;
    for (const q of quizzes) {
      const rs = (q.results ?? []).filter((r) => r.topicId === t.id);
      if (!rs.length) continue;
      total += rs.length;
      perQuiz.push({ score: rs.reduce((s, r) => s + r.score, 0) / rs.length, n: rs.length });
    }
    const latest = quizzes.length ? quizzes[quizzes.length - 1] : null;
    for (const q of [...quizzes].reverse()) {
      for (const r of (q.results ?? []).filter((x) => x.topicId === t.id && x.verdict !== 'correct')) {
        r.missedConcepts.forEach((m) => !missed.includes(m) && missed.push(m));
        if (!missedLocs.includes(r.citation.loc)) missedLocs.push(r.citation.loc);
      }
      if (missed.length >= 4) break;
    }
    void latest;

    const fallbackSources = chunks.slice(0, 2).map((c) => c.loc);
    const sources = (missedLocs.length ? missedLocs : fallbackSources).slice(0, 3);

    if (total < MIN_EVIDENCE) {
      return {
        topicId: t.id,
        topicName: t.name,
        unit: t.unit,
        status: 'untested' as TopicStatus,
        score: null,
        questionsAnswered: total,
        trend: null,
        reason: !hasMaterial
          ? 'No uploaded study material is mapped to this topic yet — upload notes that cover it.'
          : total === 0
            ? 'Not tested yet. Take a diagnostic quiz to rate this topic.'
            : `Only ${total} question answered — at least ${MIN_EVIDENCE} are needed before the topic can be rated reliably.`,
        missedConcepts: [],
        sources,
        importance,
        hasMaterial,
      };
    }

    let wsum = 0;
    let acc = 0;
    perQuiz.forEach((p, i) => {
      const w = Math.pow(1.6, i);
      wsum += w;
      acc += w * p.score;
    });
    const score = Math.round((acc / wsum) * 100);
    const status: TopicStatus = score < WEAK_BELOW ? 'weak' : score < STRONG_FROM ? 'medium' : 'strong';
    const trend =
      perQuiz.length >= 2
        ? Math.round((perQuiz[perQuiz.length - 1].score - perQuiz[perQuiz.length - 2].score) * 100)
        : null;

    const parts: string[] = [
      `Scored ${score}% over ${total} question${total === 1 ? '' : 's'} in ${perQuiz.length} quiz${perQuiz.length === 1 ? '' : 'zes'}`,
    ];
    if (trend !== null) parts.push(trend > 0 ? `improving (+${trend} pts since the previous quiz)` : trend < 0 ? `declining (${trend} pts since the previous quiz)` : 'unchanged since the previous quiz');
    let reason = parts.join(', ') + '.';
    if (status !== 'strong' && missed.length) reason += ` Missed concepts: ${missed.slice(0, 4).join(', ')}.`;
    if (status === 'strong') reason += ' Solid grasp — keep it fresh with a short review.';
    else if (sources.length) reason += ` Revisit: ${sources[0]}.`;

    return {
      topicId: t.id,
      topicName: t.name,
      unit: t.unit,
      status,
      score,
      questionsAnswered: total,
      trend,
      reason,
      missedConcepts: missed.slice(0, 4),
      sources,
      importance,
      hasMaterial,
    };
  });
}
