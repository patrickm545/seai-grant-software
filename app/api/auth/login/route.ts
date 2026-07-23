import { NextRequest } from 'next/server';
import { handlePilotLogin } from '@/lib/pilot-login-handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handlePilotLogin(request);
}
