# GapFinder AI

AI-personalized learning platform built with **Next.js 15 + React 19 + TypeScript + Tailwind CSS**.
It finds a student's knowledge gaps *before* they ask, then builds a revision plan.

`Upload → Retrieve → Test → Evaluate → Diagnose → Plan → Improve`

## Run it (2 minutes)

Requires **Node.js 18.18+** (20 or 22 recommended).

```bash
npm install
npm run dev
# open http://localhost:3000
```

**Demo credentials (for judging):**

| Email | Password |
|---|---|
| `demo@gapfinder.ai` | `Demo@1234` |

The demo account is created automatically on first run with a Computer Networks syllabus, notes and past paper
(from `samples/`) plus one sample baseline quiz attempt, so the dashboard, gap report and plan are already populated.
You can also sign up with your own email and upload your own PDFs / text files.

**No API key is required.** Everything works offline. To upgrade generation/grading/assistant answers to an LLM,
put `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in `.env.local` and restart.

Production build: `npm run build && npm start`. Type check: `npm run typecheck`.

## The 8 required features → where they live

| Feature | Page | Logic |
|---|---|---|
| 1. Material upload (PDF/text) | `/upload` | `lib/document-parser.ts`, `lib/chunking.ts`, `lib/documents.ts` |
| 2. Topic map | `/topics` | `lib/topic-extractor.ts`, `lib/topics.ts` |
| 3. Diagnostic quiz with citations | `/quiz/new` | `lib/question-generator.ts`, `lib/retrieval.ts` |
| 4. Gap report with reasons | `/report/latest` | `lib/gap-analyzer.ts` |
| 5. Personalized revision plan | `/plan` | `lib/plan-generator.ts` |
| 6. Explain-this-topic assistant | `/assistant` | `lib/assistant.ts`, `lib/retrieval.ts` |
| 7. Progress dashboard (plan adapts) | `/dashboard` | `lib/progress.ts`, `lib/quiz.ts` → `buildPlan` |
| 8. Secure authentication | `/login` | `lib/auth.ts`, `lib/password.ts`, `middleware.ts` |

## How the AI is used (retrieval vs generation)

| Stage | Retrieval (finds evidence) | Generation / reasoning (uses evidence) |
|---|---|---|
| **RAG** | `retrieve()` ranks the student's own chunks: IDF-weighted cosine over hashed uni+bigram embeddings + heading boost | Never runs without retrieved passages |
| **Question generation** | Retrieves the best passages per topic | LLM (if key set) or rule-based cloze/short-answer generator writes questions **only** from those passages |
| **Grounding check** | — | Each question must cite a retrieved chunk id, and its answer must be ≥50% supported by that chunk's text; otherwise it is dropped |
| **Answer evaluation** | Uses the cited passage as evidence | MCQ: answer key. Short answer: key-concept coverage + semantic similarity (or LLM grade) with partial credit; explanation quotes the source |
| **Gap analysis** | — | Deterministic: recency-weighted mastery per topic, ≥2 questions needed, <50 weak / 50–79 medium / ≥80 strong, reason string generated from the evidence |
| **Plan generation** | — | Deterministic: priority = (1 − mastery) × importance (past-paper frequency), scheduled across days until the exam; completed tasks are kept; change log explains what moved |
| **Assistant** | Retrieves passages; refuses if relevance is too low | Answers from those passages only with `[n]` citations (LLM rewrite or extractive) |

**Keeping the two separate:** retrieval is plain search code that cannot invent text; generation functions receive
only the retrieved passages and their output is validated against them. If retrieval finds nothing relevant, the assistant says
*"I couldn't find this in your uploaded material"* instead of answering from model memory.

**Checkable quality:** every question and assistant answer shows its source section (`document, page/section — heading`),
every gap rating shows a plain-language reason, and the thresholds are constants in `lib/gap-analyzer.ts`.

## Project structure

```
app/            pages + API route handlers (app/api/*)
components/     Navbar, FileUploader, TopicTree, QuizCard, GapReport, RevisionCalendar, ProgressChart, ...
lib/            db, auth, document-parser, chunking, embeddings, retrieval, question-generator,
                answer-evaluator, gap-analyzer, plan-generator, assistant, seed, llm
types/          TypeScript data definitions
samples/        demo syllabus, notes, past paper (also usable for manual upload tests)
supabase/       PostgreSQL + pgvector schema for a hosted deployment
```

## Notes / honest limits

- Data is stored in `data/db.json` (created automatically; delete it to reset). This is ideal for local use and judging.
  Serverless hosts like Vercel have a read-only filesystem, so for hosted deployment swap `lib/db.ts` for Supabase using `supabase/migrations/001_init.sql`.
- Built-in embeddings are lexical (hashed n-grams), not neural. They are fast and fully offline; the interface is
  the same one a neural embedding model + pgvector would use.
- Without an API key, questions are rule-based (mostly fill-in-the-blank + "explain in your own words") — grounded and
  cited, but simpler than LLM-written questions.
- Scanned (image-only) PDFs have no extractable text; the app will tell you so.
