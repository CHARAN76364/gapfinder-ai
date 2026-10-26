import { db, save } from './db';
import { analyzeGaps } from './gap-analyzer';
import { addDays, clamp, parseYmd, uid, ymd } from './text';
import type { Plan, PlanTask, TopicPerf } from '@/types/performance';

/**
 * PLAN GENERATION: converts the gap report + exam date + daily hours into a prioritised schedule.
 * priority = (1 - mastery) x topic importance (past-paper frequency). Re-run after every quiz so
 * the plan adapts; completed tasks are kept and reduce what a topic still needs.
 */
export function buildPlan(
  userId: string,
  input: { examDate?: string; hoursPerDay?: number; basedOnQuizId?: string } = {},
): Plan {
  const d = db();
  const user = d.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');
  if (input.examDate !== undefined) user.examDate = input.examDate || undefined;
  if (input.hoursPerDay) user.hoursPerDay = clamp(Number(input.hoursPerDay) || 2, 0.5, 12);
  const hours = user.hoursPerDay ?? 2;
  const minPerDay = Math.round(hours * 60);

  const notes: string[] = [];
  const todayDate = parseYmd(ymd(new Date()));
  let days = 14;
  if (user.examDate) {
    const diff = Math.round((parseYmd(user.examDate).getTime() - todayDate.getTime()) / 86400000);
    if (diff >= 1) days = Math.min(diff, 60);
    else {
      days = 7;
      notes.push('The exam date is today or already past, so a 7-day sprint was planned.');
    }
    if (diff > 60) notes.push('Plan covers the next 60 days; it will extend as the exam gets closer.');
  } else notes.push('No exam date set — a default 14-day plan was created.');

  const perf = analyzeGaps(userId).filter((p) => p.hasMaterial);
  if (!perf.length) throw new Error('Upload study material and take a quiz before creating a plan.');

  const prev = d.plans.find((p) => p.userId === userId);
  const doneTasks = (prev?.tasks ?? []).filter((t) => t.done);
  const doneMin: Record<string, number> = {};
  doneTasks.forEach((t) => (doneMin[t.topicId] = (doneMin[t.topicId] ?? 0) + t.minutes));

  const reserveMock = days >= 3 ? Math.min(30, minPerDay) : 0;
  const budget = days * minPerDay - reserveMock;
  const weight = (p: TopicPerf) => Math.max(0.1, 1 - (p.score == null ? 0.4 : p.score / 100)) * p.importance;
  const wsum = perf.reduce((s, p) => s + weight(p), 0);

  const alloc = perf
    .map((p) => {
      let m = (budget * weight(p)) / wsum - (doneMin[p.topicId] ?? 0) * 0.5;
      m = Math.round(m / 5) * 5;
      if (p.status === 'weak') m = Math.max(m, 30);
      return { p, minutes: m > 0 && m < 15 ? 15 : Math.max(0, m), w: weight(p) };
    })
    .filter((a) => a.minutes > 0)
    .sort((a, b) => b.w - a.w);

  const sessions = alloc.map((a) => {
    const size = a.p.status === 'weak' ? 40 : a.p.status === 'medium' ? 30 : 25;
    const seq: PlanTask['type'][] = a.p.status === 'weak' ? ['learn', 'practice'] : a.p.status === 'medium' ? ['practice', 'learn'] : a.p.status === 'untested' ? ['learn', 'practice'] : ['review'];
    const list: { minutes: number; type: PlanTask['type'] }[] = [];
    let left = a.minutes;
    let i = 0;
    while (left >= 15) {
      const m = left - size < 15 ? left : size;
      list.push({ minutes: m, type: i === 0 ? seq[0] : seq[Math.min(i, seq.length - 1)] === 'learn' && i > 1 ? 'practice' : seq[Math.min(i, seq.length - 1)] });
      left -= m;
      i++;
    }
    return { a, list };
  });

  const queue: { a: (typeof alloc)[number]; minutes: number; type: PlanTask['type'] }[] = [];
  const maxRounds = Math.max(0, ...sessions.map((s) => s.list.length));
  for (let r = 0; r < maxRounds; r++) for (const s of sessions) if (s.list[r]) queue.push({ a: s.a, ...s.list[r] });

  const tasks: PlanTask[] = [...doneTasks];
  const remaining = Array.from({ length: days }, () => minPerDay);
  if (reserveMock) remaining[days - 1] -= reserveMock;
  let day = 0;
  for (const s of queue) {
    while (day < days && remaining[day] < 15) day++;
    if (day >= days) break;
    const use = Math.min(s.minutes, remaining[day]);
    remaining[day] -= use;
    const p = s.a.p;
    const verb = s.type === 'learn' ? 'Read' : s.type === 'practice' ? 'Practise questions on' : 'Quick review of';
    tasks.push({
      id: uid('task'),
      date: ymd(addDays(todayDate, day)),
      topicId: p.topicId,
      topicName: p.topicName,
      minutes: use,
      type: s.type,
      reason: `${verb} ${p.topicName} — ${p.status === 'untested' ? 'not yet tested' : p.status === 'weak' ? `weak (${p.score}%)` : p.status === 'medium' ? `medium (${p.score}%)` : `strong (${p.score}%)`}${p.missedConcepts.length ? `; focus on ${p.missedConcepts.slice(0, 3).join(', ')}` : ''}.`,
      sources: p.sources,
      done: false,
    });
  }
  if (reserveMock) {
    tasks.push({
      id: uid('task'),
      date: ymd(addDays(todayDate, days - 1)),
      topicId: '*',
      topicName: 'Full mock quiz',
      minutes: reserveMock,
      type: 'mock',
      reason: 'Take a fresh diagnostic quiz to measure improvement before the exam.',
      sources: [],
      done: false,
    });
  }
  tasks.sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done));

  const snapshot: Plan['snapshot'] = {};
  perf.forEach((p) => {
    snapshot[p.topicId] = {
      name: p.topicName,
      status: p.status,
      minutes: tasks.filter((t) => t.topicId === p.topicId && !t.done).reduce((s, t) => s + t.minutes, 0),
    };
  });
  const changeLog: string[] = [];
  if (prev) {
    for (const id of Object.keys(snapshot)) {
      const a = prev.snapshot?.[id];
      const b = snapshot[id];
      if (!a) continue;
      if (a.status !== b.status) changeLog.push(`${b.name}: ${a.status} → ${b.status}; planned study time ${a.minutes} → ${b.minutes} min.`);
      else if (Math.abs(a.minutes - b.minutes) >= 20) changeLog.push(`${b.name}: planned study time ${a.minutes} → ${b.minutes} min.`);
    }
  }

  const top = alloc.slice(0, 3).map((a) => a.p.topicName);
  const plan: Plan = {
    id: uid('plan'),
    userId,
    createdAt: new Date().toISOString(),
    examDate: user.examDate,
    hoursPerDay: hours,
    days,
    version: (prev?.version ?? 0) + 1,
    basedOnQuizId: input.basedOnQuizId,
    summary: `${days} day${days === 1 ? '' : 's'} × ${hours}h/day. Top priorities: ${top.join(', ') || 'none'}.`,
    notes,
    changeLog,
    snapshot,
    tasks,
  };
  d.plans = d.plans.filter((p) => p.userId !== userId).concat(plan);
  save();
  return plan;
}

export function getPlan(userId: string): Plan | null {
  return db().plans.find((p) => p.userId === userId) ?? null;
}

export function setTaskDone(userId: string, taskId: string, done: boolean): boolean {
  const plan = getPlan(userId);
  const t = plan?.tasks.find((x) => x.id === taskId);
  if (!t) return false;
  t.done = done;
  save();
  return true;
}
