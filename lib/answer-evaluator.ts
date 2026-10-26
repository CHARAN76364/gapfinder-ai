import { embed, cosine } from './embeddings';
import { llmAvailable, llmJson } from './llm';
import { stem, tokens, clamp } from './text';
import type { Question, QuestionResult } from '@/types/question';

function mcqResult(q: Question, answer: string): QuestionResult {
  const idx = Number(answer);
  const chosen = Number.isInteger(idx) && q.options ? q.options[idx] : undefined;
  const correct = idx === q.answerIndex;
  const right = q.options && q.answerIndex !== undefined ? q.options[q.answerIndex] : q.referenceAnswer;
  const src = `Your material says: "${q.citation.excerpt}" (${q.citation.loc}).`;
  return {
    questionId: q.id,
    topicId: q.topicId,
    topicName: q.topicName,
    type: 'mcq',
    prompt: q.prompt,
    userAnswer: chosen ?? '(no answer)',
    correctAnswer: right,
    verdict: correct ? 'correct' : 'incorrect',
    score: correct ? 1 : 0,
    explanation: correct
      ? `Correct — "${right}" is right. ${src}`
      : chosen
        ? `Not quite. You chose "${chosen}", but the correct answer is "${right}". ${src}`
        : `No answer given. The correct answer is "${right}". ${src}`,
    missedConcepts: correct ? [] : [right],
    citation: q.citation,
  };
}

function shortHeuristic(q: Question, answer: string) {
  const ans = new Set(tokens(answer));
  const keys = q.keyTerms.length ? q.keyTerms : [];
  const matched = keys.filter((k) => tokens(k).every((t) => ans.has(t) || ans.has(stem(t))));
  const missed = keys.filter((k) => !matched.includes(k));
  const coverage = keys.length ? matched.length / keys.length : 0;
  const sem = cosine(embed(answer), embed(q.referenceAnswer));
  const raw = tokens(answer).length < 3 ? 0 : 0.65 * coverage + 0.35 * Math.min(1, sem * 1.8);
  const verdict: QuestionResult['verdict'] = raw >= 0.55 ? 'correct' : raw >= 0.3 ? 'partial' : 'incorrect';
  return { verdict, missed, matched };
}

export async function evaluateAnswers(questions: Question[], answers: Record<string, string>): Promise<QuestionResult[]> {
  const results: QuestionResult[] = [];
  const shorts: { q: Question; a: string; h: ReturnType<typeof shortHeuristic> }[] = [];
  for (const q of questions) {
    const a = (answers[q.id] ?? '').toString();
    if (q.type === 'mcq') {
      results.push(mcqResult(q, a));
    } else {
      shorts.push({ q, a, h: shortHeuristic(q, a) });
    }
  }

  // Optional LLM grading (evidence = the cited source passage). Falls back to heuristic.
  let llm: Record<string, { verdict?: string; explanation?: string }> | null = null;
  const gradable = shorts.filter((s) => s.a.trim().length >= 3);
  if (llmAvailable() && gradable.length) {
    const out = await llmJson<{ grades?: { id: string; verdict: string; explanation: string }[] }>(
      'You grade student answers using ONLY the supplied source excerpt and reference answer. Be fair to partially correct answers. Explain briefly (max 2 sentences) why the answer is right, partly right or wrong, citing the source. Return JSON only.',
      JSON.stringify({
        schema: '{"grades":[{"id":"...","verdict":"correct|partial|incorrect","explanation":"..."}]}',
        items: gradable.map((s) => ({
          id: s.q.id,
          question: s.q.prompt,
          reference: s.q.referenceAnswer,
          source: s.q.citation.excerpt,
          studentAnswer: s.a,
        })),
      }),
      2000,
    );
    if (out?.grades) llm = Object.fromEntries(out.grades.map((g) => [g.id, g]));
  }

  for (const { q, a, h } of shorts) {
    let verdict = h.verdict;
    let explanation = '';
    const g = llm?.[q.id];
    if (g && ['correct', 'partial', 'incorrect'].includes(g.verdict ?? '') && a.trim().length >= 3) {
      verdict = g.verdict as QuestionResult['verdict'];
      explanation = g.explanation ?? '';
    }
    const src = `Reference from your material: "${q.referenceAnswer}" (${q.citation.loc}).`;
    if (!explanation) {
      if (a.trim().length < 3) explanation = `No answer given. ${src}`;
      else if (verdict === 'correct') explanation = `Good answer — you covered the key ideas${h.matched.length ? ' (' + h.matched.slice(0, 4).join(', ') + ')' : ''}. ${src}`;
      else if (verdict === 'partial') explanation = `Partly right. You covered ${h.matched.length ? h.matched.slice(0, 3).join(', ') : 'some ideas'} but missed ${h.missed.slice(0, 4).join(', ')}. ${src}`;
      else explanation = `This misses the main ideas${h.missed.length ? ': ' + h.missed.slice(0, 4).join(', ') : ''}. ${src}`;
    } else explanation += ` (${q.citation.loc})`;
    const score = verdict === 'correct' ? 1 : verdict === 'partial' ? 0.5 : 0;
    results.push({
      questionId: q.id,
      topicId: q.topicId,
      topicName: q.topicName,
      type: 'short',
      prompt: q.prompt,
      userAnswer: a || '(no answer)',
      correctAnswer: q.referenceAnswer,
      verdict,
      score: clamp(score, 0, 1),
      explanation,
      missedConcepts: verdict === 'correct' ? [] : h.missed.slice(0, 4),
      citation: q.citation,
    });
  }
  const order = new Map(questions.map((q, i) => [q.id, i]));
  return results.sort((a, b) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0));
}
