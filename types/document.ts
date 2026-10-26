import type { SparseVec } from '@/lib/embeddings';

export type DocKind = 'syllabus' | 'notes' | 'past_paper';
export type ChunkRole = 'syllabus' | 'content' | 'paper';

export interface User {
  id: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  examDate?: string;
  hoursPerDay?: number;
}

export interface Doc {
  id: string;
  userId: string;
  name: string;
  kind: DocKind;
  paged: boolean;
  pageCount: number;
  chunkCount: number;
  createdAt: string;
  rawText?: string;
}

export interface Chunk {
  id: string;
  userId: string;
  docId: string;
  docName: string;
  docKind: DocKind;
  role: ChunkRole;
  page: number;
  heading: string;
  loc: string;
  text: string;
  vector: SparseVec;
  topicId: string | null;
}
