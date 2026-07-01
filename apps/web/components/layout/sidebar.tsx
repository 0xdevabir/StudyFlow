'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '~/lib/utils';
import { primaryNav, growthNav, utilityNav } from './nav-config';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)]/30 md:block">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          StudyFlow
        </Link>
      </div>
      <nav className="flex flex-col gap-6 px-3 py-4">
        <NavSection title="Learn" items={primaryNav} pathname={pathname} />
        <NavSection title="Grow" items={growthNav} pathname={pathname} />
        <NavSection items={utilityNav} pathname={pathname} />
      </nav>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[];
  pathname: string;
}) {
  return (
    <div>
      {title && (
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {title}
        </p>
      )}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/60 hover:text-[var(--color-foreground)]',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}