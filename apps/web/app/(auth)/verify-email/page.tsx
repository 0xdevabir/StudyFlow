import Link from 'next/link';

export default function VerifyEmailPendingPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]">
        <svg className="h-6 w-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
      <p className="mx-auto max-w-sm text-sm text-[var(--color-muted-foreground)]">
        We&apos;ve sent a verification link to your email. Click it to finish setting up your account.
      </p>
      <Link href="/login" className="inline-block text-sm text-[var(--color-primary)] hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}