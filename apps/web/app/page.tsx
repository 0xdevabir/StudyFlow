import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '~/components/ui/button';

export default function Landing() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-32 pt-24 text-center sm:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/60 px-3 py-1 text-xs text-[var(--color-muted-foreground)] backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          A new way to learn. Across everything.
        </div>
        <h1 className="bg-gradient-to-br from-[var(--color-foreground)] to-[var(--color-muted-foreground)] bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Your <span className="text-[var(--color-primary)]">learning</span>,
          <br />
          all in one place.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-muted-foreground)]">
          StudyFlow is a personal learning operating system. Track university courses, bootcamps, books, YouTube playlists, docs — anything you want to learn, beautifully organised.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg">
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-32 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: GraduationCap,
            title: 'Any learning style',
            text: 'Courses, modules, lessons, books, playlists, docs — model any hierarchy you want.',
          },
          {
            icon: BookOpen,
            title: 'Track everything',
            text: 'Tasks, sessions, notes, bookmarks, habits, goals, revisions — one timeline.',
          },
          {
            icon: Sparkles,
            title: 'Beautiful by default',
            text: 'Polished UI, dark mode, motion, command palette. Designed to be opened every day.',
          },
        ].map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}