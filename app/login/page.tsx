import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentPilotSessionState, safePilotRedirect } from '@/lib/pilot-auth';
import { LoginForm } from './LoginForm';

export default async function PilotLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const session = await getCurrentPilotSessionState();
  if (session?.kind === 'NORMAL') redirect(safePilotRedirect(params.next));
  if (session?.kind === 'RESTRICTED_FIRST_LOGIN') redirect('/first-login/password');

  return (
    <main className="pilot-login-page">
      <section className="pilot-login-card" aria-labelledby="pilot-login-title">
        <Image
          src="/brand/emerald-logo-horizontal-refined.svg"
          width={222}
          height={54}
          alt="Clada Systems"
          priority
        />
        <div className="pilot-login-copy">
          <p className="pilot-login-eyebrow">SolarGRANT Pro</p>
          <h1 id="pilot-login-title">Welcome back</h1>
          <p>Sign in to manage your installer leads and grant workflow.</p>
        </div>
        <LoginForm nextPath={params.next} />
        <p className="pilot-login-help">Pilot access is provisioned by Clada Systems.</p>
      </section>
    </main>
  );
}
