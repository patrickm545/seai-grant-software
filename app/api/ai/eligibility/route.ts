import { NextRequest, NextResponse } from 'next/server';
import { leadFormSchema } from '@/lib/validation';
import { generateEligibilityAnalysis } from '@/lib/ai';
import type { LeadFormInput } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = leadFormSchema.parse(body);
  const analysis = await generateEligibilityAnalysis(parsed as LeadFormInput);
  return NextResponse.json(analysis);
}
