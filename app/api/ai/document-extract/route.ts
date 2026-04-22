import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentFields } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.fileName || !body.mimeType || !body.textContent) {
    return NextResponse.json({ error: 'fileName, mimeType and textContent are required' }, { status: 400 });
  }

  const result = await extractDocumentFields(body);
  return NextResponse.json(result);
}
