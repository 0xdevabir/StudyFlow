'use client';
import * as React from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

interface TopbarProps {
  user: { name: string; email: string; image?: string | null };
}

export function Topbar({ user }: TopbarProps) {
  function openCommandPalette() {
    window.dispatchEvent(new CustomEvent('studyflow:open-command-palette'));
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 px-4 backdrop-blur md:px-6">
      <button
        onClick={openCommandPalette}
        className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/40 px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="hidden rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 text-xs sm:inline-block">
          ⌘K
        </kbd>
      </button>
      <Button size="sm" className="hidden sm:inline-flex" variant="default">
        <Plus className="h-4 w-4" /> New
      </Button>
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}