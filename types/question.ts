export interface Citation {
  chunkId: string;
  docName: string;
  loc: string;
  heading: string;
  excerpt: string;
}

export interface Question {
  id: string;
  topicId: string;
  topicName: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
  answerIndex?: number;
  referenceAnswer: string;
  keyTerms: string[];
  citation: Citation;
  generator: 'llm' | 'rules';
}

export interface QuestionResult {
  questionId: string;
  topicId: string;
  topicName: string;
  type: 'mcq' | 'short';
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  explanation: string;
  missedConcepts: string[];
  citation: Citation;
}

export interface Quiz {
  id: string;
  userId: string;
  createdAt: string;
  status: 'open' | 'submitted';
  note?: string;
  questions: Question[];
  answers?: Record<string, string>;
  results?: QuestionResult[];
  scorePct?: number;
  submittedAt?: string;
}

export interface PublicQuestion {
  id: string;
  topicName: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
  loc: string;
}
