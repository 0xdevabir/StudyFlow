import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden bg-auth-glow lg:block">
        <div className="absolute inset-0 bg-[var(--color-background)]/40 backdrop-blur-[2px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            StudyFlow
          </Link>
          <div className="max-w-md">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              &ldquo;A personal learning operating system. The dashboard you actually want to open every day.&rdquo;
            </p>
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            One account. Every learning. Forever.
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}