import { NextRequest, NextResponse } from 'next/server';
import { isPilotAuthenticationError, requirePilotContext } from '@/lib/pilot-auth';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { prisma } from '@/lib/prisma';
import { adaptSolarGrantLeadForPresentation } from '@/lib/solargrant-jurisdiction-safe-view';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const organisationContext = await requirePilotContext();
    const lead = await prisma.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id }),
      include: { installer: true, documents: true }
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(adaptSolarGrantLeadForPresentation(lead));
  } catch (error) {
    if (isPilotAuthenticationError(error) && error.code === 'PASSWORD_CHANGE_REQUIRED') {
      return NextResponse.json({ error: 'Password change required', code: error.code }, { status: 403 });
    }
    if (isPilotAuthenticationError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }
}
