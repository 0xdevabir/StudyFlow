'use client';
import * as React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        {children}
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                'bg-[var(--color-card)] text-[var(--color-card-foreground)] border border-[var(--color-border)]',
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}