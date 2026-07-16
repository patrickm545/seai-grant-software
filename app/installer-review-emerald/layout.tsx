import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentPilotContext } from '@/lib/pilot-auth';

export default async function ProtectedInstallerLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentPilotContext())) redirect('/login');
  return children;
}
