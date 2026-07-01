import { redirect } from 'next/navigation';
import { getServerSession } from '~/server/auth';
import { Sidebar } from '~/components/layout/sidebar';
import { Topbar } from '~/components/layout/topbar';

// Every (app) page needs the session, which means we cannot prerender.
// Setting this once on the layout applies to every nested route.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) redirect('/login');

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