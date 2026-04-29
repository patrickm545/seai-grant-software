import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSubmissionPackage } from '@/lib/submission-package';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      installer: true,
      documents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const payload = buildSubmissionPackage(lead, lead.installer);
  return NextResponse.json(payload);
}
