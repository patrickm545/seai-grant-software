# Self-Service Password Reset Test Plan

| Field | Value |
| --- | --- |
| Document ID | ENG-AUTH-RESET-TEST-001 |
| Status | Proposed |
| Owner | Clada Systems Engineering and Security |
| Review cycle | Before implementation, before pilot, and after material authentication changes |
| Last reviewed | 2026-07-24 |

## Purpose

This plan verifies the [feature specification](../04-features/FEAT-PRE-PILOT-SELF-SERVICE-PASSWORD-RESET.md), [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md), and [threat model](SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md). Tests use synthetic identities and isolated Development/test/Preview data. They never use real Production credentials or send Preview mail to Production users.

## Unit Tests

### Token and lifecycle

- CSPRNG generates 32 bytes and base64url output with no predictable input.
- Reset HMAC is deterministic for the same pepper/token, changes across tokens/peppers, and fails closed for missing/short key material.
- Raw token is absent from persistence input, logs, audit, and returned safe result.
- Thirty-minute boundary accepts strictly before expiry and rejects at/after expiry.
- State predicate rejects pending, failed, expired, consumed, revoked, and superseded requests.
- New issuance supersedes older active requests.
- Conditional consumption accepts once and rejects replay.

### Password and response

- Reuse the complete existing policy matrix: blank, under 12, over 128, common, repeated, sequential, context-derived, mismatch, and valid.
- Current-password reuse is rejected using the current Argon2id hash.
- New password hashes through `hashPilotPassword` and verifies through Argon2id.
- Neutral response builder is identical for eligible, unknown, inactive, ambiguous, limited, and provider-failed categories.
- Invalid-token presentation does not reveal invalid/expired/used/superseded reason.

### Origin, delivery, audit, and limiting

- Canonical origin accepts only the approved origin for each `APP_ENV`; Production hostname is rejected in Preview/Development and vice versa.
- `Host`, `Forwarded`, `X-Forwarded-Host`, and `VERCEL_URL` cannot influence a link.
- Link uses the fragment, correct path, and no query token.
- Preview adapter rejects non-allowlisted recipients; Development uses fake/capture; Production rejects missing provider/sender config.
- Delivery adapter enforces timeout and returns only a safe receipt.
- Audit metadata allowlist and existing sanitiser remove token, digest, email, password/hash, IP, cookie, authorization, headers, and provider payload.
- Rate-limit decisions cover IP, keyed email, account, daily/hourly windows, shared-store error, and neutral limited response.
- Proxy-IP parser trusts only the reviewed Vercel signal and ignores attacker-controlled chains.

## PostgreSQL Integration Tests

### Request issuance

- Eligible active user with one active membership, active verified installer organisation, and Installer creates one pending reset request.
- Unknown email, inactive user, inactive membership, inactive/unverified/non-installer organisation, missing Installer, and invited/provisioning user create no reset row and dispatch no mail.
- All cases return the same public status/body.
- An active legacy-recovery user with `mustChangePassword=true` is eligible; an invited first-login user is not.
- Repeated eligible request supersedes the old record and only the newest link can exchange/complete.
- Account and email-digest limits prevent delivery and additional rows without disclosing the reason.
- Provider success marks dispatch and records safe receipt/audit.
- Provider failure/timeout makes the record unusable and records safe failure.
- Injected database failure after provider acceptance leaves the delivered token unusable; a new request works.

### Exchange and completion

- Valid dispatched token rotates into a separate scoped reset-cookie handle without consuming the request; only the handle digest is persisted and the original email token is absent from cookies.
- Malformed, unknown, expired, pending, failed, consumed, revoked, and superseded tokens get the same rejection.
- Valid reset changes the hash, rejects the old password, accepts the new password, clears `mustChangePassword` and temporary expiry, consumes the token, and deletes all user sessions.
- Reset completion does not create a new session and does not change `lastLoginAt`.
- Password-policy failure changes no database rows and leaves a still-valid token usable.
- Reusing the current password changes no rows.
- Eligibility drift after email delivery fails closed without consuming the token where safe.
- Concurrent completions result in exactly one password change and one completed audit chain.
- A request racing completion cannot leave an older token active.
- Injected session-revocation, audit, or user-update failure rolls back password and token changes.
- Cleanup deletes terminal records older than 30 days and preserves newer/active records.

### Tenant and recovery interaction

- Organisation ID supplied by a client is ignored/rejected; identity is resolved from the token’s user.
- Two-tenant fixtures prove no cross-tenant read/write/audit attribution.
- Every session for the reset user is revoked; other users and organisations are unchanged.
- Administrator credential reissue followed by self-service reset clears temporary state and invalidates the reissued credential while preserving the recovery operation/audit history.
- Self-service reset does not create or modify membership, organisation, Installer, role, ownership, or provisioning operation.
- The current database unique membership invariant is asserted; any future relaxation fails a documented guard test until multi-organisation behaviour is reviewed.

## Browser / End-To-End Tests

- Login exposes **Forgot password?** with an accessible name and keyboard focus.
- Request form labels, autocomplete, validation, submitting state, neutral confirmation, login return, and retry path work.
- Eligible and unknown requests render identical confirmation.
- Synthetic Preview email contains correct sender, subject, expiry language, ignore-request guidance, and Preview-only canonical link.
- Link exchange removes the fragment before rendering the password form; browser history and subsequent navigation contain no token.
- Invalid/expired link presents the generic state and request-new-link action.
- Password form shows requirements, confirmation, visibility controls, safe validation errors, loading prevention, and success.
- Successful reset clears reset cookie, returns to clean success/login route, rejects old password, accepts new password, and invalidates previously authenticated browser contexts.
- Desktop and mobile layouts work at representative widths including 320 CSS pixels.
- Keyboard-only flow, focus placement, visible focus, alert/status announcements, screen-reader labels, autocomplete, touch targets, contrast, and reduced motion pass.
- Browser console, hydration, runtime exception, failed resource, and unexpected `5xx` checks are clean.
- Back/forward and refresh do not redisplay a valid bearer or password.

## Security Tests

- Compare response code, headers, body length/content, redirect, and timing distributions for eligible, unknown, inactive, and limited requests.
- Exceed every rate-limit dimension from multiple application instances and verify atomic shared limits.
- Inject Host and forwarded-host variants and prove the email link remains canonical.
- Replay exchanged and consumed tokens, including concurrent replay.
- Search application/provider/runtime logs, audit rows, database rows, analytics/network payloads, browser history, HTML, and error reports for seeded token/password markers.
- Verify `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, CSP, and absence of third-party reset-page requests.
- Attempt cross-environment origin construction and Preview delivery to Production-style recipients; both fail closed.
- Attempt cross-tenant identifiers, inactive-state transitions, oversized bodies, malformed encodings, and proxy-IP spoofing.
- Inject rate-store, database, provider, and session-delete failures and verify safe public output and no partial security state.

## Regression And Deployment Validation

Run frozen install, Prisma format/generate/validate, migration SQL tests, typecheck, lint, unit/platform tests, fresh-database migration application, PostgreSQL integration tests, and production build. Re-run existing pilot authentication, first-login, provisioning, recovery, tenant-isolation, database-safety, audit, login-route, deployment-gate, and notification tests.

Preview acceptance uses synthetic accounts and an internal allowlisted inbox. It records link origin, sender authentication, delivery receipt, token lifecycle, session revocation, tenant isolation, headers, log-redaction scan, accessibility, mobile/desktop, and clean runtime evidence.

Production acceptance occurs only after approval and deployment. Use a controlled non-customer or explicitly approved account, verify one email/reset/login cycle, verify normal login and ADR-0022 runbook health, inspect clean runtime logs, and record no unexpected database/configuration change. Never include token, password, hash, cookie, email body, or secret in evidence.

## Exit Criteria

- All required tests pass in authoritative Node 22 and the reviewed database environment.
- All 15 baseline migrations plus the additive reset migration apply from a fresh disposable PostgreSQL database with none pending.
- No Critical or pilot-blocking High security defect remains.
- Provider, sender, Preview-recipient, rate-store, origin, retention, and operational ownership approvals are recorded.
- The first-pilot gate in the feature spec and onboarding runbook is satisfied.
