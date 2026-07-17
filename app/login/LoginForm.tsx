'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const GENERIC_LOGIN_ERROR = 'Email or password is incorrect, or this account is not available.';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

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
        <div className="pilot-password-input">
          <input
            id="pilot-password"
            name="password"
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={submitting}
          />
          <button
            type="button"
            className="pilot-password-toggle"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-controls="pilot-password"
            aria-pressed={passwordVisible}
            disabled={submitting}
          >
            {passwordVisible ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.1 9 5.1a15.6 15.6 0 0 1-2.2 2.8M6.6 6.6C4.4 8 3 10.1 3 10.1S6.5 16 12 16c1 0 2-.2 2.9-.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {error ? <p className="pilot-login-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
