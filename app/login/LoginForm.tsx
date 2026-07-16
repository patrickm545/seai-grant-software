'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const GENERIC_LOGIN_ERROR = 'Email or password is incorrect, or this account is not available.';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          next: nextPath
        })
      });
      const payload = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !payload.redirectTo) {
        setError(payload.error || GENERIC_LOGIN_ERROR);
        return;
      }

      router.replace(payload.redirectTo);
      router.refresh();
    } catch {
      setError('Sign-in is temporarily unavailable.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="pilot-login-form" onSubmit={handleSubmit} noValidate>
      <div className="pilot-login-field">
        <label htmlFor="pilot-email">Email address</label>
        <input
          id="pilot-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          disabled={submitting}
        />
      </div>
      <div className="pilot-login-field">
        <label htmlFor="pilot-password">Password</label>
        <input
          id="pilot-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={submitting}
        />
      </div>
      {error ? <p className="pilot-login-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
