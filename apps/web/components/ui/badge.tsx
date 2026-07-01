import * as React from 'react';
import { cn } from '~/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-transparent',
  secondary:
    'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-transparent',
  outline:
    'bg-transparent text-[var(--color-muted-foreground)] border-[var(--color-border)]',
  destructive:
    'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)] border-transparent',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}