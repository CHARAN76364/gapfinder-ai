import Navbar from './Navbar';

export default function PageShell({ name, title, subtitle, children }: { name: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar name={name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="muted mt-1 max-w-3xl">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </>
  );
}
