import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '~/components/providers';

export const metadata: Metadata = {
  title: 'StudyFlow — your personal learning OS',
  description: 'Track any kind of learning in one place. Courses, tasks, sessions, notes, goals — all in a single beautiful workspace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}