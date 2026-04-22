import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect('/admin/dashboard');
  }

  const params = await searchParams;
  const hasError = params.error === 'invalid-password';
  const hasConfigError = params.error === 'config-error';

  return (
    <main className="container grid admin-login-shell">
      <section className="admin-login-card card">
        <div className="badge">Installer admin</div>
        <h1>Admin login</h1>
        <p className="hero-text">Enter your admin password to review homeowner leads, documents, and submission-ready grant details.</p>
        <form action="/api/admin/login" method="POST" className="grid admin-login-form">
          <div>
            <label>Password</label>
            <input name="password" type="password" placeholder="Enter admin password" required />
          </div>
          <button type="submit">Open dashboard</button>
        </form>
        {hasError ? <div className="result-panel result-panel-error"><h3>Login failed</h3><p className="small">That password was not correct.</p></div> : null}
        {hasConfigError ? <div className="result-panel result-panel-error"><h3>Admin setup incomplete</h3><p className="small">Set a strong <code>ADMIN_SESSION_SECRET</code> environment variable before using admin login in production.</p></div> : null}
        <p className="small">Tip: set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> in your environment before deploying.</p>
      </section>
    </main>
  );
}
