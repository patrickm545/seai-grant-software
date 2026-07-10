import { NextRequest, NextResponse } from 'next/server';
import { isOrganisationContextError, requireDefaultInstallerOrganisationContext } from '@/lib/identity';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { prisma } from '@/lib/prisma';
import { buildPortalFillPreview } from '@/lib/submission-package';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const organisationContext = await requireDefaultInstallerOrganisationContext();
    const lead = await prisma.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id }),
      include: { installer: true }
    });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const payload = buildPortalFillPreview(lead, lead.installer);
    return NextResponse.json(payload);
  } catch (error) {
    if (isOrganisationContextError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }
}
