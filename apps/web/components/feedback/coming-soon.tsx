import * as React from 'react';
import { Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  features?: string[];
}

export function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[var(--color-primary)]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      {features && features.length > 0 && (
        <ul className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/60 p-3 text-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-xs text-[var(--color-muted-foreground)]">
        Foundation phase — see the project roadmap for the implementation order.
      </p>
    </div>
  );
}