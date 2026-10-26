import PageShell from '@/components/PageShell';
import FileUploader from '@/components/FileUploader';
import DocumentList from '@/components/DocumentList';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const user = await requireUser();
  const docs = db()
    .documents.filter((d) => d.userId === user.id)
    .map(({ rawText, ...rest }) => {
      void rawText;
      return rest;
    });
  return (
    <PageShell name={user.name} title="Study material" subtitle="Upload your syllabus, notes and past papers. Everything the AI generates is grounded in these files.">
      <div className="grid gap-6 lg:grid-cols-2">
        <FileUploader />
        <div className="card">
          <h2 className="text-lg font-semibold">Your documents</h2>
          <div className="mt-2">
            <DocumentList docs={docs} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
