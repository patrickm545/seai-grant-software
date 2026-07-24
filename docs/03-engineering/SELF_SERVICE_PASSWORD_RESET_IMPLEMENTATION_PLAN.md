# Self-Service Password Reset Implementation Plan

| Field | Value |
| --- | --- |
| Document ID | ENG-AUTH-RESET-PLAN-001 |
| Status | Approved |
| Owner | Clada Systems Engineering |
| Review cycle | Before each implementation PR and before pilot release |
| Last reviewed | 2026-07-24 |

## Objective And Boundary

Implement the required pre-pilot capability defined by [FEAT-PRE-PILOT-AUTH-001](../04-features/FEAT-PRE-PILOT-SELF-SERVICE-PASSWORD-RESET.md) and [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md) without weakening ADR-0018 authentication, tenant isolation, database deployment gates, or ADR-0022 exceptional recovery.

This plan is documentation only. It does not authorise schema, runtime, provider, environment, database, or deployment changes.

## CTO Review Amendment And Start Gate

On 2026-07-24 the CTO approved the architecture decisions listed in ADR-0023. PR #40 remains Draft until this amendment is committed.

No implementation may begin until all five prerequisites are approved:

1. transactional email provider;
2. Clada-controlled sender and reply-to identities;
3. managed cross-instance atomic TTL rate-limit store;
4. Preview recipient allowlist or provider sandbox policy;
5. stable Preview canonical origin.

The only alternative is explicit authorisation on an implementation PR to introduce provider-neutral adapters with fail-closed configuration. That exception permits interface and safe configuration-boundary work only; it does not approve live secrets, provider configuration, email delivery, migration/deployment work beyond the explicitly authorised PR, or any unsafe fallback.

## Repository Findings

### Relevant existing components

| Area | Evidence | Use |
| --- | --- | --- |
| Login | `/login`, `LoginForm`, `/api/auth/login`, `handlePilotLogin` | Add a recovery entry point without changing neutral login errors. |
| Passwords | `hashPilotPassword`, Argon2id verification, `validateFirstLoginPassword` | Extract/reuse the approved policy and hashing boundary. |
| Sessions | `AuthSession`, 32-byte opaque tokens, HMAC-SHA-256 digest, 12-hour normal/30-minute restricted sessions | Reuse token principles and transactional `deleteMany` revocation; use separate reset key material. |
| Identity | `User`, unique `OrganisationMembership.userId`, active/verified installer checks, `requirePilotContext` | Resolve reset eligibility server-side and preserve current one-organisation model. |
| First login | `mustChangePassword`, temporary expiry, restricted flow, atomic activation/session rotation | Reuse policy concepts; keep invited/provisioning recovery separate. |
| Recovery | `ProvisioningOperation`, `tenant-recover`, ADR-0022 command/runbook | Preserve exceptional operator path and audit history; do not overload its model. |
| Audit | `writeAuditEvent`, typed actor/outcome/resource fields, recursive sensitive-key sanitiser | Add reset actions with a stricter allowlisted metadata builder. |
| Email | Gmail-specific `sendLeadNotificationEmails`, bounded three-second timeouts, `CredentialDeliveryAdapter` fake/failing tests | Reuse adapter/testing style and bounded delivery, not the Gmail implementation or credential payload. |
| Environment safety | `APP_ENV`, database fingerprints, Vercel environment matching, guarded migrations | Apply the same fail-closed environment classification to origin/provider/rate configuration. |
| Deployment | guarded migration commands and Vercel build preflight | Use additive Prisma migration and existing status/deploy gates. |

### Missing capabilities

- No forgot/reset routes, UI, token service, model, email template, provider-approved authentication delivery, shared rate limiter, cleanup job, or reset tests.
- No security headers are configured for reset pages.
- `APP_URL`/`NEXT_PUBLIC_APP_URL` and `VERCEL_URL` usage elsewhere is not strict enough for authentication-link construction.
- Current email helper is Gmail-specific, swallows errors, and has no reset-safe delivery state.
- Current `CredentialDeliveryAdapter` carries plaintext temporary credentials and is not appropriate for reset links.
- No durable notification outbox/retry worker (TD-014).

### Constraints and risks

- Vercel serverless process memory cannot provide a reliable global rate limit.
- Email send and PostgreSQL state are not one atomic transaction.
- Current unique membership is a security invariant; multi-organisation support is not implicit.
- Public audit/log behaviour must not reveal account eligibility.
- Reset URLs must not be constructed from request or proxy host headers.
- The unrelated incident-document working-tree change must remain untouched.

### Recommended implementation boundary

Create a small Clada OS authentication-recovery service with a dedicated Prisma model, reset-token HMAC service, eligibility resolver, canonical-origin service, rate-limit adapter, reset-email adapter/template, audit metadata builder, request/exchange/completion handlers, and thin SolarGRANT Pro UI routes. Keep lead notifications, provisioning operations, and ADR-0022 recovery separate.

## Decisions Resolved By Repository Evidence

| Question | Decision |
| --- | --- |
| Token lifetime | 30 minutes. |
| Multiple tokens | Only newest remains valid. |
| Persistence | Dedicated `PasswordResetRequest`; not `ProvisioningOperation`. |
| Sessions | Revoke all user sessions atomically. |
| Automatic authentication | No; return to login. |
| Origins | Exact environment-owned `PASSWORD_RESET_APP_ORIGIN`, never request/proxy host. |
| Preview delivery | Provider sandbox/suppression plus explicit internal recipient allowlist and separate credentials. |
| Cross-instance limiting | Managed shared atomic TTL store; no in-memory Production fallback. |
| Email failure after record | Request remains unusable and is failed/revoked; requester receives neutral response and may retry. |
| Session revocation failure | Roll back password update and token consumption in the same transaction. |
| Concurrent completion | Conditional single-use state in a serializable transaction; exactly one succeeds. |
| `mustChangePassword` | Successful eligible active-account reset clears it and temporary expiry. Invited onboarding remains ineligible. |
| ADR-0022 interaction | Self-service is normal recovery; reissue remains exceptional. A later self-service completion supersedes the reissued credential without rewriting its history. |
| Retention | Delete terminal reset records after 30 days. |
| Notification outbox | Not required for first pilot if dispatch is fail-closed and retry starts a new request; TD-014 remains. |

## Outstanding Implementation Prerequisites

Implementation is blocked until these choices are recorded, subject only to the explicit provider-neutral, fail-closed adapter exception above:

1. **CTO:** transactional-email provider with sandbox/suppression, safe receipt, domain authentication, timeouts, and separate environment credentials.
2. **CEO/product and privacy owner:** final sender address, reply handling, customer-facing email copy, and privacy/support contact.
3. **CTO:** managed Redis-compatible rate-limit store supported by the Vercel deployment and its environment isolation/configuration.
4. **CTO and privacy owner:** Preview internal-recipient allowlist and evidence-retention owner.
5. **CTO:** stable Preview canonical alias, distinct from the Production hostname and validated against `APP_ENV`.

Recommended sender shape is a Clada-controlled security/support mailbox on an authenticated domain. The current Gmail lead helper is not recommended. Vendor names must be selected through the approval process rather than embedded speculatively.

## Data Model And Migration

Add an enum or constrained string status only if it materially simplifies safe state transitions. The model should include:

- `id`, `userId`, unique `tokenDigest`, optional unique rotated `exchangeDigest`;
- `createdAt`, `expiresAt`, `dispatchedAt`, `exchangedAt`, `consumedAt`;
- `revokedAt`, `revocationReason` for failed/superseded/administrative terminal state;
- provider name and opaque provider receipt ID only after delivery acceptance;
- safe request correlation ID where justified;
- relation to `User` with deletion behaviour reviewed against identity retention.

Indexes must support digest lookup, active requests by user, expiry/retention cleanup, and operational state review. Enforce one effective active request per user through transaction/constraint design; do not rely only on application order. Use a named additive Prisma migration. Apply all migrations from a fresh disposable PostgreSQL database and through existing guarded environment commands. No `db push`, SQL hotfix, reset, or reseed.

## Recommended Reviewable Sequence

This sequence may start only after the five-prerequisite gate is satisfied. If a specific implementation PR is instead authorised only for provider-neutral adapters with fail-closed configuration, that PR may perform the adapter/interface subset of PR 2 and no schema, route, UI, live-provider, secret, delivery, migration, or deployment work.

### PR 1 — Data and security primitives

- Confirm ADR-0023 is Accepted and all five implementation prerequisites are approved.
- Add model, migration, token generation/HMAC, state predicates, canonical-origin validation, and audit metadata allowlist.
- Extract the existing password policy into a reusable service without changing first-login behaviour.
- Add unit/migration tests and fresh-database verification.

Dependency: all five implementation prerequisites approved.

Rollback: revert application use; retain additive table until a later approved migration.

### PR 2 — Shared rate limiting and delivery adapter

- Implement cross-instance rate-limit interface and approved managed-store adapter.
- Define trusted Vercel client-IP extraction and purpose-specific keyed rate keys.
- Add `PasswordResetDeliveryAdapter`, fake/capture, failing, Preview-safe, and Production provider adapters.
- Add text/HTML email template, safe receipts, explicit timeouts, environment recipient/origin validation, and configuration checks.
- Test rate-store/provider timeouts, Preview suppression/allowlist, and cross-environment refusal.

Dependencies: CTO provider/store choice, sender and Preview recipient approvals.

Rollback: configuration fails closed; no issuance without both dependencies.

### PR 3 — Request issuance API

- Add `requestPasswordReset` service with normalized bounded email input, cheap rate limit, eligible-account resolution, dummy neutral path, newest-only supersession, pending request, bounded dispatch, and activated/failed state.
- Add reset audit actions and safe operational logging.
- Add `POST /api/auth/password-reset/request` with constant neutral `202`.
- Add integration, enumeration comparison, abuse, provider-failure, and database-growth tests.

Dependencies: PRs 1–2.

Rollback: disable issuance via a fail-closed reviewed feature/configuration gate; existing login unaffected.

### PR 4 — Link exchange and atomic completion

- Add fragment exchange endpoint and scoped reset cookie.
- Add server-side validation and clean-URL reset state.
- Add completion service: policy, current-password reuse check, Argon2id hash, conditional atomic consumption, clear temporary state, revoke all sessions, audit, no auto-session.
- Add invalid/expired/replay/concurrency/session-failure/tenant/recovery integration tests.

Dependencies: PR 3 and reviewed cookie/header/CSP design.

Rollback: revoke active reset requests and disable exchange/completion; do not restore old hashes.

### PR 5 — Accessible UI and end-to-end acceptance

- Add login link, `/forgot-password`, neutral confirmation, `/reset-password`, invalid-link, password form, success, and login-return UI.
- Apply reset-only `no-store`, `no-referrer`, CSP, and third-party-resource exclusions.
- Add responsive/accessibility tests, browser flows, console/hydration checks, token leakage scans, and prior-session invalidation tests.
- Update user/support wording and all active docs with implemented evidence.

Dependencies: PR 4 and approved product/email copy.

Rollback: remove entry point and disable issuance after revoking active requests.

### PR 6 — Preview acceptance and Production rollout

- Apply the additive migration through the guarded Preview gate.
- Configure separate Preview origin, provider sandbox/suppression, internal recipient allowlist, rate store, and secrets.
- Run the complete Preview test/security matrix and obtain CTO/privacy acceptance.
- Apply guarded Production migration; configure exact Production origin, provider/sender, store, and secrets.
- Deploy without changing credentials; run controlled smoke; verify normal login and ADR-0022 runbook.
- Record release evidence and close the pilot-readiness planned gap only after all gates pass.

Dependency: PRs 1–5 merged and no blocking authentication finding.

Rollback: disable/reset entry, revoke active requests, preserve table/audit evidence, keep login and ADR-0022 available.

## Service And Route Inventory

Recommended modules, with exact names finalised in implementation review:

- password policy shared by first login and reset;
- reset token/HMAC and lifecycle service;
- reset eligibility resolver;
- canonical application-origin validator;
- shared rate-limit interface and Vercel-supported adapter;
- reset email adapter, template, and environment recipient policy;
- reset request, exchange, completion, cleanup, audit, and observability services;
- `POST /api/auth/password-reset/request`;
- `POST /api/auth/password-reset/exchange`;
- `POST /api/auth/password-reset/complete`;
- `/forgot-password` and `/reset-password` UI surfaces.

Middleware may protect header policy but must not require a pilot session for public recovery routes.

## Environment Configuration

Names are proposed and must be documented in `.env.example` during implementation:

- `PASSWORD_RESET_TOKEN_PEPPER` — separate high-entropy secret per environment;
- `PASSWORD_RESET_RATE_LIMIT_PEPPER` — separate purpose key or reviewed derivation;
- `PASSWORD_RESET_APP_ORIGIN` — exact canonical origin;
- provider API key/configuration and approved sender identity;
- Preview-only recipient allowlist/sandbox configuration;
- rate-limit store endpoint/credentials;
- optional fail-closed rollout flag if release governance approves one.

No secret may use `NEXT_PUBLIC_*`. Configuration validation must bind `APP_ENV`, Vercel environment, origin, provider mode, recipient policy, and store scope. Production hostname/provider credentials must fail outside Production; Preview and Development must never emit Production links.

## Cleanup, Observability, And Support

Implement daily scheduled cleanup or an equally reliable bounded mechanism for terminal records older than 30 days. Cleanup is idempotent, indexed, batch-bounded, secret-free, and environment-scoped.

Metrics should count requests, neutral acceptances, resolved issuance, dispatch success/failure, exchange rejection category internally, completion, rate-limit decision, cleanup, and transaction failure without email/token/password/raw IP. Alerts cover provider failure, rate-store failure, completion failure, abnormal request volume, and cleanup lag. Client-visible responses remain neutral.

Support guidance must distinguish resend/new request from ADR-0022 escalation, list safe evidence, and forbid token/password collection, direct SQL, manual token activation, and previous-hash restoration.

## Validation And Definition Of Done

- Every item in [SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md](SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md) passes.
- Existing login, first-login, session, tenant-isolation, recovery, audit, notification, database-safety, migration-gate, and build suites remain green.
- Documentation metadata/links are reviewed; no runtime code entered the documentation PR.
- Preview and Production environment configuration is independently verified.
- Production migration status is clean and smoke evidence is secret-free.
- No Production data or credentials are changed except the explicitly approved controlled reset account during final acceptance.
- First external pilot onboarding remains blocked until the feature and readiness gate are complete.

## Rollback Principles

Do not drop the reset table, restore password hashes, copy identities between environments, use manual SQL, or weaken authentication. Stop new issuance, revoke active requests, remove the entry point, retain terminal evidence under policy, and preserve normal login plus ADR-0022. Any password already reset remains the valid password; the user can use normal login or separately approved recovery.
