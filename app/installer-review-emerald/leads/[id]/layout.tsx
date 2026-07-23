import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { LeadWorkspaceShell } from '@/components/LeadWorkspaceShell';
import { getLeadWorkspaceViewModel } from '@/lib/lead-workspace';
import { requirePilotContext } from '@/lib/pilot-auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function LeadWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requirePilotContext();
  const lead = await getLeadWorkspaceViewModel({ db: prisma, context, leadId: id });
  if (!lead) notFound();

  return <LeadWorkspaceShell lead={lead} canCreateLead={hasPermission(context, 'lead.create')}>{children}</LeadWorkspaceShell>;
}
