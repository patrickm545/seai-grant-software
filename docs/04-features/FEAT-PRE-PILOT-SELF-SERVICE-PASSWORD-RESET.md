# Self-Service Password Reset / Forgot Password

| Field | Value |
| --- | --- |
| Document ID | FEAT-PRE-PILOT-AUTH-001 |
| Status | Approved |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Before implementation and after any authentication incident |
| Last reviewed | 2026-07-24 |
| Related ADR | [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md) |

## Summary

SolarGRANT Pro must let an eligible installer recover a forgotten password without operator intervention. This is a required pre-pilot capability for the first 5–10 installer users, not optional technical debt.

The normal recovery path is a neutral forgot-password request followed by a short-lived, one-time email link and a new-password form. The guarded Production credential-reissue workflow in [ADR-0022](../05-decisions/ADR-0022-production-legacy-credential-reissue.md) remains an exceptional, separately approved operational recovery mechanism.

## Approval State

The CTO approved this feature architecture on 2026-07-24. Implementation remains blocked by the five prerequisites recorded in [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md), unless an implementation PR is explicitly authorised to introduce only provider-neutral adapters with fail-closed configuration. Approval of this specification does not authorise runtime code, migrations, secrets, provider configuration, deployment, or database changes in documentation PR #40.

## Problem And Pilot Rationale

The current login and database-backed session flow is healthy, but there is no self-service recovery route. A pilot user who forgets a normal password would require a Clada operator to perform exceptional credential reissue. That is unsuitable as the normal customer experience, increases support handling of authentication events, and makes pilot access depend on operator availability.

First external pilot onboarding is blocked until this capability is implemented, security-accepted in Preview, verified in Production, and the existing login and exceptional recovery paths remain healthy.

## Personas And User Stories

| Persona | Need |
| --- | --- |
| Active installer user | Request recovery without learning whether another email address has an account. |
| Reset-link holder | Set a compliant new password before the one-time link expires. |
| Clada support operator | Diagnose delivery and completion using secret-free evidence without seeing a password or token. |
| Security/privacy reviewer | Verify enumeration resistance, tenant isolation, retention, redaction, and environment-safe delivery. |

- As an active installer user, I can select **Forgot password?** from login and submit my email.
- As any requester, I receive the same confirmation regardless of account eligibility.
- As an eligible user, I receive one safe link and can set a new password once.
- As an account holder, all prior sessions stop working after reset.
- As an operator, I can distinguish safe internal delivery states without exposing eligibility publicly.

## Product Scope

### In scope

- A **Forgot password?** link on `/login`.
- An email request form and neutral confirmation.
- Eligibility limited to one `ACTIVE` user with a password hash, exactly one active installer membership, one active verified installer organisation, and its Installer record.
- A 30-minute, cryptographically random, one-time reset token.
- A reset-link exchange that removes the bearer value from the browser URL before the password form is displayed.
- Existing 12-to-128-character password policy, confirmation, context-derived/common-password checks, and Argon2id hashing.
- Rejection of the current password.
- Atomic token consumption, password update, clearing of temporary-credential state, and revocation of every user session.
- Secret-free audit and operational evidence.
- Responsive, accessible request, confirmation, invalid-link, password-entry, and success states.

### Out of scope

- Public registration, user invitation, account discovery, email-address change, account unlock, MFA, SSO, organisation switching, or user-management UI.
- Recovery of `INVITED` users in a `PROVISIONING` organisation; the approved onboarding/reissue lifecycle remains responsible.
- Multiple organisation memberships, which the current database constraint prohibits.
- Automatic sign-in after reset.
- Changing ADR-0022 or removing guarded administrator recovery.
- A general notification platform or marketing email capability.

## Eligibility And State Behaviour

Public output is always the same accepted neutral response for syntactically valid requests: **“If an eligible account exists, we’ll send password reset instructions. Check your inbox and spam folder.”** Eligibility never changes the status code, copy, redirect, or visible timing class.

| State | Internal behaviour | Public behaviour |
| --- | --- | --- |
| Unknown or malformed-but-bounded email | Perform the bounded neutral path; create no reset row and send no email. | Same neutral confirmation. |
| Inactive user | No token or email. | Same neutral confirmation. |
| Missing/inactive membership or missing Installer | No token or email. | Same neutral confirmation. |
| Inactive, unverified, non-installer, or ambiguous organisation | No token or email. | Same neutral confirmation. |
| Eligible active user | Supersede active tokens, create one pending request, dispatch, then activate only on accepted delivery. | Same neutral confirmation. |
| `mustChangePassword=true` on an active legacy-recovery user | Allow self-service reset if all ordinary active-account eligibility checks pass. A completed reset supersedes the temporary credential and clears its flags. | Same neutral confirmation. |
| `INVITED`/`PROVISIONING` first-login user | Ineligible; use approved onboarding recovery. | Same neutral confirmation. |
| Invalid, malformed, expired, consumed, revoked, superseded, or non-dispatched token | Set no reset cookie; show one generic invalid-or-expired state with a new-request action. | No distinction between reasons. |
| Repeated request | Apply shared rate limits; at most one active request per user. | Same neutral confirmation, including when limited. |
| Provider failure or timeout | Leave the token unusable and mark/revoke it where possible; retain safe failure evidence. | Same neutral confirmation. |
| Password-policy failure | Preserve token validity until expiry and show the specific safe policy error. | Password guidance only; no account data. |
| Concurrent completion | Exactly one transaction consumes the token; other attempts receive the generic invalid-or-expired result. | No race detail. |
| Session-revocation failure | Roll back token consumption and password update in the same transaction. | Generic temporary-unavailability result; retry remains possible. |

The current schema enforces one membership per user. If multi-organisation membership is introduced later, a separate reviewed decision must define eligibility and organisation-context presentation. Password reset remains user-identity-level and must revoke sessions across all organisations.

## User Journey And UI States

1. User opens `/login` and selects **Forgot password?**.
2. `/forgot-password` shows a labelled email input, submit button, login return link, and privacy-conscious help.
3. Submission moves to a neutral confirmation without echoing the email in the URL.
4. An eligible user receives a reset email.
5. The email link opens `/reset-password#token=...`. The fragment is not sent in the initial HTTP request.
6. A minimal first-party exchange removes the fragment with `history.replaceState`, posts it to the server, and rotates it into a separate random exchange handle. Only that handle is placed in a short-lived `HttpOnly`, `Secure` in Production, `SameSite=Strict`, path-scoped reset cookie; only its keyed digest is persisted.
7. The clean `/reset-password` page shows new password, confirmation, requirements, visibility controls, and link-expiry guidance.
8. On success, the server atomically consumes the request, updates the password, clears `mustChangePassword` and `temporaryCredentialExpiresAt`, and deletes all sessions.
9. The reset cookie is cleared. A success page links to `/login`; no authenticated session is created.

Required UI states are idle, submitting, neutral confirmed, exchanging link, invalid/expired link, password-entry, policy error, temporary failure, success, and rate-limited-neutral. Passwords and tokens must never enter analytics, error reporting payloads, persisted client state, URL query strings, or form-state telemetry.

## Accessibility Requirements

- Meet WCAG 2.2 AA patterns used by the existing login experience.
- Use explicit labels, appropriate `email` and `new-password` autocomplete values, and accessible password visibility controls.
- Announce submission, validation, link failure, and success through meaningful status/alert regions without moving focus unpredictably.
- Put focus on the page heading or first invalid field after navigation or error.
- Maintain keyboard-only operation, visible focus, sufficient contrast, 44-by-44 CSS-pixel touch targets where practical, reduced-motion support, and no horizontal scrolling at 320 CSS pixels.
- Do not use colour, timing, or iconography as the only explanation.

## Security And Privacy Requirements

- Follow [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md) and the [threat model](../03-engineering/SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md).
- Generate 32 random bytes with the Node cryptographic RNG and encode as base64url.
- Persist only separate-pepper HMAC-SHA-256 digests for the email token and rotated exchange handle; never persist either raw bearer.
- Keep only the newest request active and consume it atomically.
- Validate eligibility again at completion; never trust client-side validation.
- Use the exact configured canonical origin for the current environment, never request `Host`, `Forwarded`, `X-Forwarded-Host`, or a generic Vercel URL.
- Use `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, a restrictive Content Security Policy, and no third-party resources on reset surfaces.
- Rate limit using atomic counters in a shared cross-instance store by trusted client IP, keyed normalised-email digest, and resolved account ID.
- Minimise personal data: audit resolved user/organisation identifiers and safe reason/status codes, not submitted email, raw IP, token, password, provider payload, or cookie.
- Retain consumed, expired, superseded, revoked, and failed reset records for 30 days for security investigation, then delete them. Never retain the raw bearer value.

## Email Delivery Behaviour

Password-reset mail uses a dedicated `PasswordResetDeliveryAdapter`, not the current Gmail-specific lead-notification helper and not the temporary-credential adapter. The adapter accepts recipient, display name, expiry, canonical link, and safe correlation ID, and returns a bounded, non-secret provider receipt.

Production requires an approved transactional provider, a verified Clada-controlled sending domain, SPF/DKIM/DMARC, and an approved sender identity. Preview must use provider sandbox/suppression where available and an explicit internal-recipient allowlist; it must reject or safely redirect any real Production recipient. Development defaults to a non-network fake/capture adapter. Production, Preview, and Development use separate credentials and canonical origins.

The email states who requested the reset, the 30-minute expiry, the single-use rule, how to ignore an unrequested email, and the canonical SolarGRANT Pro sign-in destination. It contains no password and no account/tenant details beyond the minimum recipient-facing context.

Provider failure does not change the public response. A reset request is valid only after delivery acceptance is durably recorded. If dispatch fails, times out, or returns an unsafe/ambiguous result, the request is revoked or remains non-dispatched and unusable. The user may safely request a new link. A durable notification outbox is not required for the first pilot if this fail-closed delivery state and bounded adapter are implemented; TD-014 remains for general notification retry and scale.

## Acceptance Criteria

- Login exposes an accessible forgot-password link.
- Eligible and ineligible requests return the same status, body, redirect behaviour, and materially similar timing.
- Only eligible active installer identities can receive a usable link.
- The newest request supersedes every earlier unconsumed request.
- Tokens expire after 30 minutes, are random, stored only as keyed digests, and work once.
- The bearer value is removed from the URL before the password form and is absent from logs, audit, analytics, errors, database fields, and successful navigation.
- Reset rejects blank, malformed, weak, context-derived, overlong, mismatched, and current passwords.
- Successful reset uses the existing Argon2id service, clears forced-change state, consumes the token, and revokes all sessions in one database transaction.
- The user is returned to login and must authenticate normally with the new password.
- Old password, superseded/used token, and every prior session fail afterward.
- Tenant selection never comes from the request; the current single active membership and installer organisation are revalidated.
- Audit events and provider receipts contain only approved metadata.
- Cross-environment links and recipients fail closed.
- The [test plan](../03-engineering/SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md) and pilot-readiness gate pass.

## Non-Functional Requirements

- Request and completion endpoints accept bounded bodies and complete within the repository’s reviewed authentication latency budget.
- Email calls have explicit connection and total timeouts; provider failure cannot hold a serverless invocation indefinitely.
- Reset issuance is bounded to one active row per account and cleanup prevents unbounded record growth.
- Shared rate limiting works across Vercel instances and fails closed for token issuance while still returning the neutral response.
- Database operations use explicit transactions and deterministic status transitions.
- Reset pages are not cached and do not cause hydration, console, runtime, or `5xx` errors under expected invalid input.

## Operational Support

Support may inspect safe request ID, reset-record ID, user ID, organisation ID, delivery state, provider receipt ID, timestamps, rate-limit category, and audit outcome. Support must not request or receive the token or password, reveal whether an address exists, manually mark a token valid, restore a previous hash, or use direct SQL.

If self-service recovery is unavailable, ADR-0022 remains the exceptional owner-only path subject to its own approval and runbook. An incident or provider outage does not silently broaden ADR-0022 eligibility.

## Rollout And Rollback

Roll out schema and configuration before UI exposure. Verify the complete flow with synthetic Preview identities and allowlisted internal inboxes, then deploy disabled/fail-closed until Production origin, provider, sender, rate store, and secrets are verified. Production acceptance must cover a synthetic or explicitly approved non-customer account without changing pilot credentials unexpectedly.

Rollback disables request issuance and removes the forgot-password entry point while leaving the new table and historical records in place. Already issued tokens must be revoked or made unusable before rollback. Do not roll back by dropping the table, restoring password hashes, or weakening login/session validation. ADR-0022 remains operational.

## Pilot-Readiness Gate

First external pilot onboarding must not begin until:

- self-service reset is implemented and all migrations are clean;
- reset-email delivery is verified with the approved Production sender;
- Preview functional, accessibility, privacy, and security acceptance passes;
- Production deployment and a controlled reset smoke pass;
- normal login, logout, session validation, and tenant isolation remain healthy;
- the ADR-0022 recovery runbook remains operational;
- no unresolved Critical or pilot-blocking High authentication issue remains.

## Related Documents

- [ADR-0018](../05-decisions/ADR-0018-pilot-installer-authentication.md)
- [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md)
- [ADR-0022](../05-decisions/ADR-0022-production-legacy-credential-reissue.md)
- [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md)
- [Threat model](../03-engineering/SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md)
- [Test plan](../03-engineering/SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md)
- [Implementation plan](../03-engineering/SELF_SERVICE_PASSWORD_RESET_IMPLEMENTATION_PLAN.md)
