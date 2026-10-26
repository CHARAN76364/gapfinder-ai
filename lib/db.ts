import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Chunk, Doc, User } from '@/types/document';
import type { Topic } from '@/types/topic';
import type { Quiz } from '@/types/question';
import type { Plan } from '@/types/performance';

export interface DB {
  secret: string;
  users: User[];
  documents: Doc[];
  chunks: Chunk[];
  topics: Topic[];
  quizzes: Quiz[];
  plans: Plan[];
}

/**
 * Persistent store: a JSON file (data/db.json) with an in-memory cache.
 * Zero setup, works offline. supabase/migrations/001_init.sql contains the equivalent
 * PostgreSQL + pgvector schema for a hosted deployment.
 */
const FILE = process.env.GAPFINDER_DB || path.join(process.cwd(), 'data', 'db.json');
const g = globalThis as unknown as { __gfdb?: DB };

export function db(): DB {
  if (!g.__gfdb) {
    let loaded: Partial<DB> = {};
    try {
      loaded = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
      /* first run */
    }
    g.__gfdb = {
      secret: loaded.secret || crypto.randomBytes(32).toString('hex'),
      users: loaded.users ?? [],
      documents: loaded.documents ?? [],
      chunks: loaded.chunks ?? [],
      topics: loaded.topics ?? [],
      quizzes: loaded.quizzes ?? [],
      plans: loaded.plans ?? [],
    };
    if (!loaded.secret) save();
  }
  return g.__gfdb;
}

export function save(): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(g.__gfdb));
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.error('[db] could not persist data (read-only filesystem?)', e);
  }
}
