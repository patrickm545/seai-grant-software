import { NextRequest, NextResponse } from 'next/server';
import { isPilotAuthenticationError, requirePilotContext } from '@/lib/pilot-auth';
import { leadOrganisationWhere } from '@/lib/lead-access';
import { prisma } from '@/lib/prisma';
import { buildSubmissionPackage } from '@/lib/submission-package';
import { buildSubmissionPackageDownload } from '@/lib/submission-package-download';
import { SolarGrantJurisdictionError } from '@/lib/solargrant-jurisdiction';
import { QualificationGateError } from '@/lib/lead-qualification';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const organisationContext = await requirePilotContext();
    const lead = await prisma.lead.findFirst({
      where: leadOrganisationWhere(organisationContext, { id }),
      include: {
        installer: true,
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const payload = buildSubmissionPackage(lead, lead.installer);
    return buildSubmissionPackageDownload(payload);
  } catch (error) {
    if (error instanceof SolarGrantJurisdictionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    if (error instanceof QualificationGateError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        missingFacts: error.decision.missingFacts
      }, { status: 422 });
    }
    if (isPilotAuthenticationError(error) && error.code === 'PASSWORD_CHANGE_REQUIRED') {
      return NextResponse.json({ error: 'Password change required', code: error.code }, { status: 403 });
    }
    if (isPilotAuthenticationError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    throw error;
  }
}
