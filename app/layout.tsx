import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GapFinder AI — find your knowledge gaps before the exam does',
  description: 'AI-based personalized learning: upload your material, diagnose weak topics, and get a revision plan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
