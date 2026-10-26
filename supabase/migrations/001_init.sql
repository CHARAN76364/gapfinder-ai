-- Production schema (PostgreSQL + pgvector on Supabase).
-- The local demo uses a JSON file store (lib/db.ts) with the same entities, so no database is needed to run it.
create extension if not exists vector;

create table profiles (id uuid primary key references auth.users on delete cascade, name text, exam_date date, hours_per_day numeric default 2);
create table documents (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, name text not null, kind text check (kind in ('syllabus','notes','past_paper')), page_count int, created_at timestamptz default now());
create table document_chunks (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, document_id uuid references documents(id) on delete cascade, topic_id uuid, page int, heading text, content text not null, embedding vector(1536));
create index on document_chunks using hnsw (embedding vector_cosine_ops);
create table topics (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, unit text, name text not null, sort_order int);
create table questions (id uuid primary key default gen_random_uuid(), user_id uuid not null, topic_id uuid references topics(id), chunk_id uuid references document_chunks(id), type text, prompt text, options jsonb, answer text, reference_answer text);
create table quiz_attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null, answers jsonb, results jsonb, score_pct int, submitted_at timestamptz default now());
create table revision_plans (id uuid primary key default gen_random_uuid(), user_id uuid not null, version int, tasks jsonb, change_log jsonb, created_at timestamptz default now());

-- Row-level security: every row is private to its owner.
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table topics enable row level security;
alter table questions enable row level security;
alter table quiz_attempts enable row level security;
alter table revision_plans enable row level security;
create policy "own rows" on documents for all using (user_id = auth.uid());
create policy "own rows" on document_chunks for all using (user_id = auth.uid());
create policy "own rows" on topics for all using (user_id = auth.uid());
create policy "own rows" on questions for all using (user_id = auth.uid());
create policy "own rows" on quiz_attempts for all using (user_id = auth.uid());
create policy "own rows" on revision_plans for all using (user_id = auth.uid());
