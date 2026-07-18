'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  completePilotFirstLogin,
  PILOT_SESSION_COOKIE_NAME,
  pilotSessionCookieOptions
} from '@/lib/pilot-auth';

export async function replaceTemporaryCredential(formData: FormData) {
  const cookieStore = await cookies();
  const result = await (async () => {
    try {
      return await completePilotFirstLogin({
        sessionToken: cookieStore.get(PILOT_SESSION_COOKIE_NAME)?.value,
        currentCredential: String(formData.get('currentCredential') ?? ''),
        newPassword: String(formData.get('newPassword') ?? ''),
        confirmation: String(formData.get('confirmation') ?? '')
      });
    } catch {
      return { ok: false as const, code: 'ACTIVATION_UNAVAILABLE' as const };
    }
  })();

  if (!result.ok) redirect(`/first-login/password?error=${encodeURIComponent(result.code)}`);

  cookieStore.set({
    name: PILOT_SESSION_COOKIE_NAME,
    value: result.sessionToken,
    ...pilotSessionCookieOptions(result.expiresAt)
  });
  redirect(result.redirectTo);
}
