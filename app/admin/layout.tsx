import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentPilotSessionState } from '@/lib/pilot-auth';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentPilotSessionState();
  if (session?.kind === 'RESTRICTED_FIRST_LOGIN') redirect('/first-login/password');
  if (session?.kind !== 'NORMAL') redirect('/login');
  return children;
}
