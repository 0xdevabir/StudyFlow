import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getServerSession } from '~/server/auth';
import { Sidebar } from '~/components/layout/sidebar';
import { Topbar } from '~/components/layout/topbar';

// We MUST run on Node.js because `getServerSession` uses Drizzle/Postgres,
// which can't execute on Edge. Forcing the runtime here cascades to every
// nested (app) page; otherwise Vercel defaults to Edge and we'd silently
// fail to read the DB and redirect every user to /login.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Diagnostic: log every (app) render so we can see in Vercel logs whether
  // the layout is actually being entered, and which runtime answered it.
  const ck = await cookies();
  const hd = await headers();
  // eslint-disable-next-line no-console
  console.log('[app-layout] entering', {
    runtime: process.env.NEXT_RUNTIME ?? 'unknown',
    cookieNames: ck.getAll().map((c) => c.name),
    headerHost: hd.get('host'),
    hasAuthCookie: Boolean(
      ck.get('__Secure-better-auth.session_token')?.value ??
      ck.get('better-auth.session_token')?.value,
    ),
    hasSessionData: Boolean(
      ck.get('__Secure-better-auth.session_data')?.value ??
      ck.get('better-auth.session_data')?.value,
    ),
  });

  const session = await getServerSession();
  if (!session?.user) {
    // eslint-disable-next-line no-console
    console.log('[app-layout] NO SESSION — redirecting to /login');
    redirect('/login');
  }
  // eslint-disable-next-line no-console
  console.log('[app-layout] session ok, rendering for user:', session.user.email);

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}