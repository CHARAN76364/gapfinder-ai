import { redirect } from 'next/navigation';
import PageShell from '@/components/PageShell';
import QuizRunner from '@/components/QuizRunner';
import GenerateQuizButton from '@/components/GenerateQuizButton';
import { requireUser } from '@/lib/auth';
import { getQuiz, toPublic } from '@/lib/quiz';
import { llmAvailable } from '@/lib/llm';

export const dynamic = 'force-dynamic';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (id === 'new') {
    return (
      <PageShell name={user.name} title="Diagnostic quiz" subtitle="Questions are generated from passages retrieved from your own material. Each one shows the section it came from.">
        <div className="card flex flex-col items-start gap-4">
          <p className="text-sm text-slate-600">
            The quiz focuses on weak and untested topics first, so every attempt teaches the system more about you. Generation mode: <strong>{llmAvailable() ? 'LLM (grounded in retrieved passages)' : 'built-in grounded generator (no API key needed)'}</strong>.
          </p>
          <GenerateQuizButton />
        </div>
      </PageShell>
    );
  }
  const quiz = getQuiz(user.id, id);
  if (!quiz) redirect('/quiz/new');
  if (quiz.status === 'submitted') redirect(`/report/${quiz.id}`);
  return (
    <PageShell name={user.name} title="Diagnostic quiz" subtitle="Answer from your own understanding. Multiple-choice and short-answer questions are both graded and explained.">
      <QuizRunner quizId={quiz.id} questions={toPublic(quiz)} />
    </PageShell>
  );
}
