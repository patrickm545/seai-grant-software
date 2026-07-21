import { NextRequest, NextResponse } from 'next/server';
import { formatLeadFormValidationFailure, leadFormSchema } from '@/lib/validation';
import { generateEligibilityAnalysis } from '@/lib/ai';
import type { LeadFormInput } from '@/lib/types';
import {
  requireSupportedSolarGrantJurisdiction,
  SolarGrantJurisdictionError
} from '@/lib/solargrant-jurisdiction';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      error: 'We could not read the eligibility request.',
      formErrors: ['The request body was empty or malformed.'],
      requestId
    }, { status: 400 });
  }

  const validation = leadFormSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatLeadFormValidationFailure(validation.error, requestId), { status: 400 });
  }

  const parsed = validation.data as LeadFormInput;
  try {
    requireSupportedSolarGrantJurisdiction(parsed);
  } catch (error) {
    if (!(error instanceof SolarGrantJurisdictionError)) throw error;
    const firstErrorField = error.code === 'AMBIGUOUS_PROPERTY_JURISDICTION' ? 'eircode' : 'county';
    console.warn('[eligibility] Property jurisdiction rejected', {
      requestId,
      installerId: parsed.installerId,
      jurisdiction: error.classification.jurisdiction,
      reason: error.classification.reason
    });
    return NextResponse.json({
      error: error.message,
      code: error.code,
      firstErrorField,
      firstErrorStepId: 'property',
      firstErrorStepIndex: 0,
      requestId
    }, { status: error.code === 'PROPERTY_JURISDICTION_REVIEW_REQUIRED' ? 400 : 422 });
  }

  const analysis = await generateEligibilityAnalysis(parsed);
  return NextResponse.json(analysis);
}
