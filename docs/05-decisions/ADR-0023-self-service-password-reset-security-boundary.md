# ADR-0023: Self-Service Password Reset Security Boundary

| Field | Value |
| --- | --- |
| Document ID | ADR-0023 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | Before implementation and when identity, email, rate limiting, or session architecture changes |
| Last reviewed | 2026-07-24 |

## Context

ADR-0018 establishes Argon2id credentials, HMAC-digested database sessions, a single installer membership, and server-derived tenant context. ADR-0019 establishes forced first-login replacement. ADR-0022 establishes a guarded administrator credential-reissue workflow for exceptional Production recovery. None defines normal self-service password reset.

Self-service reset introduces durable decisions about bearer-token persistence, account-enumeration behaviour, email-link origin, session revocation, rate limiting, audit, and delivery failure. A focused ADR is therefore required.

## CTO Review Amendment — Approved 2026-07-24

The CTO approved the overall self-service password-reset architecture and the following durable decisions:

- token lifetime is 30 minutes;
- only the newest reset request remains valid;
- reset state uses dedicated `PasswordResetRequest` persistence;
- the email bearer is 32 bytes from a cryptographically secure random source;
- only HMAC-SHA-256 digests are stored, using separate environment-specific reset key material;
- the email token is delivered in a URL fragment, exchanged by first-party POST, and rotated into a separate cookie-bound handle;
- successful reset revokes every existing user session;
- reset completion does not automatically authenticate the browser;
- eligible and ineligible public requests return the same neutral `202`;
- links use only an exact environment-owned canonical origin;
- the current password cannot be reused;
- successful reset clears `mustChangePassword`;
- terminal reset records are retained for 30 days and then removed through bounded cleanup;
- ADR-0022 remains the exceptional operator recovery path; and
- a general notification outbox is not required for first pilot, while TD-014 remains open.

The architecture approval does not approve a provider or runtime configuration. Implementation remains blocked until all five prerequisites below are approved, unless a later implementation PR is explicitly authorised to introduce provider-neutral adapters with fail-closed configuration:

1. transactional email provider;
2. Clada-controlled sender and reply-to identities;
3. managed cross-instance atomic TTL rate-limit store;
4. Preview recipient allowlist or provider sandbox policy;
5. stable Preview canonical origin.

Documentation PR #40 must remain Draft until this amendment is committed. The amendment adds no authority for runtime code, migrations, secrets, provider configuration, deployment, or database changes in PR #40.

## Decision

### Eligibility and identity boundary

Reset is identity-level but limited to the current pilot model: one active user with a password hash, exactly one active membership, one active verified installer organisation, and its Installer record. The server resolves these relationships; a request never supplies organisation context. `INVITED`/`PROVISIONING` onboarding identities remain under ADR-0019 recovery.

An active legacy owner with `mustChangePassword=true` may use self-service reset when all ordinary active-account checks pass. Completion clears `mustChangePassword` and `temporaryCredentialExpiresAt`, superseding the temporary credential without modifying the ADR-0022 operation history.

### Token construction and persistence

Generate 32 cryptographically secure random bytes and base64url-encode them as an opaque bearer token. Return the raw value only to the request service long enough to construct the outbound link.

Persist a dedicated `PasswordResetRequest`, not a `ProvisioningOperation`. Store only an HMAC-SHA-256 digest made with a password-reset-specific pepper. Random 256-bit entropy already prevents practical guessing; the keyed digest also prevents token verification from a database copy alone and isolates reset-token compromise from `AUTH_SESSION_PEPPER`.

The record contains user ID, token digest, optional rotated exchange-handle digest, created/expiry timestamps, dispatched/exchanged timestamps, consumed timestamp, revoked/superseded timestamp and reason, safe provider receipt reference, and non-secret correlation metadata. It contains no raw bearer, submitted email, password, IP address, request headers, or provider payload.

### Lifecycle and concurrency

- Lifetime is 30 minutes.
- Only the newest token remains active. Issuance supersedes all earlier active requests for that user in the same transaction.
- A token is usable only when delivery acceptance has been durably recorded.
- Validation and completion are server-side.
- Completion revalidates user, membership, organisation, Installer, token digest, dispatch, expiry, and unused/unrevoked state.
- One serializable transaction conditionally consumes the token, replaces the password hash, clears temporary-credential state, deletes every `AuthSession` for the user, and writes completion/revocation audit.
- A conditional update count or row lock makes exactly one concurrent completion succeed. Any session deletion or audit failure rolls back the password and token changes.
- Consumed, expired, failed, superseded, and revoked records are retained for 30 days, then deleted by bounded scheduled cleanup.

### Link and browser boundary

Each environment has one explicit `PASSWORD_RESET_APP_ORIGIN`, validated against `APP_ENV` and an environment-specific allowlist:

- Production: `https://seai-grant-software.vercel.app`;
- Preview: an approved stable Preview alias that is not the Production hostname;
- Development/test: an approved loopback/test origin only.

No request `Host`, `Forwarded`, `X-Forwarded-Host`, `VERCEL_URL`, or user input participates in link construction.

The email link places the token in a URL fragment. A minimal reset page sends the fragment in a bounded first-party POST to an exchange endpoint and immediately clears it from browser history. After server validation, the endpoint generates a separate 32-byte exchange handle, persists only its reset-pepper HMAC digest, and places the raw handle in a 30-minute maximum, `HttpOnly`, `SameSite=Strict`, path-scoped reset cookie. The original email token never enters a cookie. Re-exchange may rotate the handle while the email token remains valid; completion consumes the request and invalidates both. The password form is displayed only at the clean URL. Reset surfaces use `no-referrer`, `no-store`, restrictive CSP, and no third-party analytics, fonts, scripts, images, or error-reporting payloads.

### Enumeration and abuse controls

Every syntactically acceptable request returns the same neutral `202` response and content. Unknown, inactive, ambiguous, limited, and provider-failed cases are not client-visible. The implementation performs a dummy bounded path and targets materially similar timing where practical, without deliberately delaying requests enough to create denial-of-service leverage.

Issuance requires atomic cross-instance rate limiting in a managed shared store. Initial limits are:

- 5 requests per 15 minutes and 20 per day per trusted client IP;
- 3 requests per hour per keyed normalised-email digest;
- 3 delivery attempts per hour and 5 per day per resolved account.

Limits may be tightened through reviewed non-secret configuration but never disabled in Production. Only the platform-trusted Vercel client-IP signal is accepted; arbitrary forwarded chains are ignored. Store keys are purpose-specific HMAC digests with short TTLs. Rate-store unavailability fails closed for token creation/delivery but still returns the neutral public response.

### Password, sessions, and result

Use the existing Argon2id helper and approved 12-to-128-character policy. Require confirmation; reject blank, weak, common, context-derived, malformed, and current-password reuse. Password fields are excluded from telemetry and logs.

Successful reset revokes all sessions, including any current normal or restricted session. The reset browser is not authenticated automatically and returns to login. This keeps possession of an email link separate from a complete authenticated session and matches the requested conservative recovery posture.

### Email, audit, and failure

Use a dedicated delivery adapter with bounded timeouts and safe receipts. The existing Gmail lead notification helper is not an approved authentication-email boundary. Production requires a transactional provider and Clada-controlled verified sender; Preview uses sandbox/suppression and an internal recipient allowlist; Development/test uses a fake/capture adapter.

Audit only resolved-account events:

- `PASSWORD_RESET_REQUESTED`;
- `PASSWORD_RESET_EMAIL_DISPATCH_ATTEMPTED`;
- `PASSWORD_RESET_EMAIL_DISPATCHED` or `PASSWORD_RESET_EMAIL_FAILED`;
- `PASSWORD_RESET_TOKEN_REJECTED` only when safely attributable and rate-bounded;
- `PASSWORD_RESET_COMPLETED`;
- `PASSWORD_RESET_SESSIONS_REVOKED`.

Audit uses user/organisation/resource IDs, correlation ID, safe state/reason, counts, timestamps, provider name, and opaque receipt ID. It excludes token/digest, password/hash, submitted email, raw IP, headers, cookies, and provider payload.

Delivery failure leaves the request unusable. An accepted email followed by failure to mark dispatch may produce a harmless unusable link; the user can request a new one. A durable notification outbox is not required for first pilot because authentication safety fails closed and reset can be retried. TD-014 continues to govern general notification durability.

## Rationale

A dedicated model gives reset-specific lifecycle constraints without overloading approval-bound provisioning operations. HMAC storage follows the established session pattern while using separate key material. Newest-only, short-lived tokens reduce exposure and bound storage. Atomic password/session/token mutation prevents a password change from committing while old sessions survive. Clean-URL exchange and canonical origins reduce common token-leakage and Host-header risks. Requiring normal login after completion avoids turning mailbox possession directly into an application session.

## Consequences

- Implementation requires one additive migration, a separate pepper, an approved transactional-email provider, and a shared atomic rate-limit service.
- Email delivery and database state cannot be one distributed transaction; fail-closed dispatch state prioritises security over availability.
- A URL-fragment exchange requires a small first-party client boundary, but keeps the bearer out of initial HTTP access logs and referrers.
- All existing sessions end after reset, which is intentionally visible to the user and support.
- Current single-membership tenant isolation is preserved. Multi-organisation identity needs a future reviewed extension.
- Historical reset records contain security metadata and require a 30-day cleanup mechanism.

## Alternatives Considered

- **Reuse `ProvisioningOperation`:** rejected because password reset is user-initiated, high-frequency, short-lived, and not approval/idempotency-plan based.
- **Store an unkeyed SHA-256 digest:** cryptographically adequate for a 256-bit random token, but rejected in favour of database-copy resistance and consistency with keyed session storage.
- **Store raw tokens:** rejected because a database read would become immediate account takeover.
- **Allow multiple active tokens:** rejected because it expands the replay window and complicates support.
- **Put the token in a query/path and render the form directly:** rejected because hosting/access logs and referrer handling create avoidable leakage.
- **Automatically authenticate after reset:** rejected because normal login gives a clearer security boundary.
- **Revoke every session except the reset browser:** rejected because the reset browser has no authenticated session and all-session revocation is safer.
- **Use in-memory rate limits:** rejected because Vercel serverless instances do not share reliable process memory.
- **Require the general notification outbox now:** rejected for first pilot if fail-closed dispatch state, bounded delivery, and safe retry are implemented; revisit with TD-014.
- **Replace ADR-0022:** rejected. Self-service reset is normal recovery; guarded reissue remains exceptional recovery.

## Required Implementation Prerequisites

| Decision | Recommendation | Approval |
| --- | --- | --- |
| Transactional provider | Select a provider with API timeouts, sandbox/suppression, delivery receipts, domain authentication, and separate environment credentials. Do not use the Gmail lead helper. | CTO |
| Sender identity | Use a Clada-controlled security/support mailbox on an authenticated domain; final local part and customer-facing reply handling require approval. | CEO/product and privacy owner |
| Shared rate-limit store | Use a managed Redis-compatible atomic TTL store supported in the Vercel deployment and separately scoped per environment. | CTO |
| Preview recipient policy | Sandbox plus explicit Clada internal inbox allowlist; no Production customer delivery. | CTO and privacy owner |
| Preview canonical origin | Configure one stable approved Preview alias that is not the Production hostname and validate it against `APP_ENV`. | CTO |

No implementation may begin until all five prerequisites are approved, unless the implementation PR is explicitly authorised to introduce provider-neutral adapters with fail-closed configuration. Such authorisation does not permit live provider credentials, unsafe fallbacks, Production delivery, or bypass of the remaining release gates.

## Follow-Up

1. Record approval of the five implementation prerequisites or explicitly authorise a provider-neutral, fail-closed adapter PR.
2. Implement the [small-PR plan](../03-engineering/SELF_SERVICE_PASSWORD_RESET_IMPLEMENTATION_PLAN.md) only after that gate is satisfied.
3. Execute the [test plan](../03-engineering/SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md).
4. Update the pilot-authentication and onboarding runbooks with implemented evidence.
5. Keep ADR-0022 historically unchanged and operational.
