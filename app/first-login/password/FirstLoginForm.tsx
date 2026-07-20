'use client';

import { useState } from 'react';
import { replaceTemporaryCredential } from './actions';

export function FirstLoginForm({ errorMessage }: { errorMessage?: string }) {
  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  return (
    <form className="pilot-login-form" action={replaceTemporaryCredential}>
      <div className="pilot-login-field">
        <label htmlFor="current-credential">Temporary credential</label>
        <div className="pilot-password-input">
          <input
            id="current-credential"
            name="currentCredential"
            type={currentVisible ? 'text' : 'password'}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="pilot-password-toggle"
            onClick={() => setCurrentVisible((visible) => !visible)}
            aria-label={currentVisible ? 'Hide temporary credential' : 'Show temporary credential'}
            aria-controls="current-credential"
            aria-pressed={currentVisible}
          >
            {currentVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="pilot-login-field">
        <label htmlFor="new-password">New password</label>
        <div className="pilot-password-input">
          <input
            id="new-password"
            name="newPassword"
            type={newVisible ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            aria-describedby="password-requirements"
            required
          />
          <button
            type="button"
            className="pilot-password-toggle"
            onClick={() => setNewVisible((visible) => !visible)}
            aria-label={newVisible ? 'Hide new password' : 'Show new password'}
            aria-controls="new-password"
            aria-pressed={newVisible}
          >
            {newVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="pilot-login-field">
        <label htmlFor="confirm-password">Confirm new password</label>
        <div className="pilot-password-input">
          <input
            id="confirm-password"
            name="confirmation"
            type={confirmationVisible ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <button
            type="button"
            className="pilot-password-toggle"
            onClick={() => setConfirmationVisible((visible) => !visible)}
            aria-label={confirmationVisible ? 'Hide password confirmation' : 'Show password confirmation'}
            aria-controls="confirm-password"
            aria-pressed={confirmationVisible}
          >
            {confirmationVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {errorMessage ? (
        <p className="pilot-login-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit">Activate account</button>
    </form>
  );
}
