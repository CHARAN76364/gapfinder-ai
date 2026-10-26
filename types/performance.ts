export type TopicStatus = 'weak' | 'medium' | 'strong' | 'untested';

export interface TopicPerf {
  topicId: string;
  topicName: string;
  unit: string;
  status: TopicStatus;
  score: number | null;
  questionsAnswered: number;
  trend: number | null;
  reason: string;
  missedConcepts: string[];
  sources: string[];
  importance: number;
  hasMaterial: boolean;
}

export interface PlanTask {
  id: string;
  date: string;
  topicId: string;
  topicName: string;
  minutes: number;
  type: 'learn' | 'practice' | 'review' | 'mock';
  reason: string;
  sources: string[];
  done: boolean;
}

export interface Plan {
  id: string;
  userId: string;
  createdAt: string;
  examDate?: string;
  hoursPerDay: number;
  days: number;
  version: number;
  basedOnQuizId?: string;
  summary: string;
  notes: string[];
  changeLog: string[];
  snapshot: Record<string, { name: string; status: TopicStatus; minutes: number }>;
  tasks: PlanTask[];
}

export interface ProgressPoint {
  quizId: string;
  number: number;
  date: string;
  scorePct: number;
  byTopic: Record<string, number>;
  note?: string;
}
