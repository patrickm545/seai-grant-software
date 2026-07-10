import { NextRequest, NextResponse } from 'next/server';
import { isOrganisationContextError, requireDefaultInstallerOrganisationContext } from '@/lib/identity';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organisationContext = await requireDefaultInstallerOrganisationContext();
    const lead = await prisma.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id }),
      include: { installer: true, documents: true }
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(lead);
  } catch (error) {
    if (isOrganisationContextError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }
}
