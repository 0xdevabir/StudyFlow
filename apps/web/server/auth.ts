/**
 * Server-side helpers for accessing the Better Auth session from RSC.
 */
import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@studyflow/auth';

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}
