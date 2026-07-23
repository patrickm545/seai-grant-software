import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { ManualLeadForm } from './ManualLeadForm';
import { listAssignableMemberships } from '@/lib/manual-lead';
import { hasPermission } from '@/lib/permissions';
import { requirePilotContext } from '@/lib/pilot-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewLeadPage() {
  const context = await requirePilotContext();
  const canCreate = hasPermission(context, 'lead.create');
  const assignees = canCreate ? await listAssignableMemberships({ db: prisma, context }) : [];

  return (
    <main className="manual-lead-page" id="main-content">
      <Link href="/installer-review-emerald/leads" className="lead-workspace-back">← Back to leads</Link>
      <div className="eyebrow">Clada OS CRM</div>
      <h1>New Lead</h1>
      <p>Record the minimum details from a phone call, referral, walk-in, or event. Qualification can continue safely in the lead workspace.</p>
      {canCreate ? (
        <ManualLeadForm requestId={randomUUID().replaceAll('-', '')} assignees={assignees} />
      ) : (
        <div className="form-alert form-alert-error" role="alert">You do not have permission to create leads.</div>
      )}
    </main>
  );
}
