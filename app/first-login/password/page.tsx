import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  firstLoginPasswordErrorMessage,
  getCurrentPilotSessionState,
  type FirstLoginPasswordErrorCode
} from '@/lib/pilot-auth';
import { FirstLoginForm } from './FirstLoginForm';

const errorCodes = new Set<FirstLoginPasswordErrorCode>([
  'CURRENT_CREDENTIAL_INVALID',
  'PASSWORD_CONFIRMATION_MISMATCH',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_TOO_WEAK',
  'PASSWORD_CONTEXT_DERIVED',
  'PASSWORD_REUSES_TEMPORARY_CREDENTIAL',
  'RESTRICTED_SESSION_REQUIRED',
  'ACTIVATION_STATE_INVALID',
  'ACTIVATION_UNAVAILABLE'
]);

function supportedErrorCode(value?: string): FirstLoginPasswordErrorCode | null {
  return value && errorCodes.has(value as FirstLoginPasswordErrorCode)
    ? value as FirstLoginPasswordErrorCode
    : null;
}

export default async function FirstLoginPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentPilotSessionState();
  if (!session) redirect('/login');
  if (session.kind === 'NORMAL') redirect('/admin/dashboard');

  const errorCode = supportedErrorCode((await searchParams).error);

  return (
    <main className="pilot-login-page">
      <section className="pilot-login-card pilot-first-login-card" aria-labelledby="first-login-title">
        <Image
          src="/brand/emerald-logo-horizontal-refined.svg"
          width={222}
          height={54}
          alt="Clada Systems"
          priority
        />
        <div className="pilot-login-copy">
          <p className="pilot-login-eyebrow">Secure first login</p>
          <h1 id="first-login-title">Choose your password</h1>
          <p>Replace your temporary credential before entering SolarGRANT Pro.</p>
        </div>

        <div className="pilot-password-guidance" id="password-requirements">
          <strong>Password requirements</strong>
          <ul>
            <li>Use 12 to 128 characters.</li>
            <li>Avoid common or predictable passwords.</li>
            <li>Do not include your name, email, or organisation details.</li>
            <li>Do not reuse the temporary credential.</li>
          </ul>
        </div>

        <FirstLoginForm errorMessage={errorCode ? firstLoginPasswordErrorMessage(errorCode) : undefined} />

        <form action="/logout" method="post" className="pilot-first-login-logout">
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
