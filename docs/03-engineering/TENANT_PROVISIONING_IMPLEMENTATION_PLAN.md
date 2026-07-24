# Tenant Provisioning Implementation Plan

| Field | Value |
| --- | --- |
| Document ID | ENG-TENANT-PROVISIONING-PLAN-001 |
| Status | Proposed |
| Owner | Clada Systems Engineering |
| Review cycle | At every implementation PR |
| Last reviewed | 2026-07-24 |

## Purpose

This plan divides the approved architecture into independently reviewable PRs. It authorises no implementation or Production change. Each PR starts only after [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md) and its dependencies are approved.

## PR 1: Data model and migration

Scope: lifecycle fields, `mustChangePassword`, credential expiry/invitation state, provisioning operation and idempotency, audit correlation, active-owner semantics, a persistent unique lowercase kebab-case Installer slug distinct from internal ID, constraints, and indexes. Preserve existing tenant data and retain the current globally unique membership `userId`; multi-organisation membership is not part of the pilot migration.

Dependencies: approved domain model and migration/backfill plan. Migration risk is high because authentication and membership constraints are live; security risk is accidental activation, owner loss, or weakened uniqueness. Tests cover forward migration on representative data, constraint failures, rollback/recovery rehearsal, owner invariants, email/slug uniqueness, and no lead movement. Production acceptance requires reviewed backup/recovery evidence, guarded migration, row-count/ownership reconciliation, and no behaviour enablement.

## PR 2: Provisioning service and command

Status: implemented in PR #28 for non-Production execution with a fake/test delivery adapter. Real transactional-email delivery and Production execution remain explicitly deferred.

Scope includes:

- canonical validation, safe plans, dry-run default, immutable input digest, idempotency, strict conflicts, one transaction, create/reuse rules, owner membership, secure credential generation, fixed 24-hour expiry, in-transaction audit, and safe exit/output;
- the `CredentialDeliveryAdapter` interface; the intended Production transactional-email implementation remains deferred until provider selection;
- a fake adapter for deterministic tests;
- provider payload and log-redaction tests plus general no-secret output tests;
- audit of safe provider delivery ID/status only;
- delivery-failure reporting, credential revoke/reissue recovery, and organisation retention in `PROVISIONING`;
- an absolute prohibition on plaintext fallback; and
- unit and integration tests proving Codex, console output, logs, audit records, and return values never receive the credential.

Dependencies: PR 1 and selection/configuration of the transactional-email provider/package. Migration risk is low; data-write and secret-exposure risk are high. Tests cover every conflict matrix row, duplicate/rerun behaviour, rollback on each database step, audit failure, environment confirmation, adapter payload redaction, provider failure, fake delivery, no-secret output/log snapshots, delivery-receipt audit, and dry-run zero writes. Production acceptance requires disposable Preview execution, peer-reviewed plan, safe direct delivery proof, failure/reissue rehearsal, and exact database/audit reconciliation.

## PR 3: Forced first-login password change

Status: implemented in PR #29 with a typed 30-minute restricted session, server-only route/API guards, current-credential and target-policy validation, serializable activation and session rotation, secret-safe audit, an accessible password-replacement page, and disposable PostgreSQL integration coverage. Production execution and external onboarding remain blocked by the later readiness gates.

Scope: 30-minute non-refreshable restricted session, server-side route and API guard, password-change UI/endpoint, current-credential verification, target policy, coordinated owner/organisation activation, credential invalidation, all-session revocation, new normal 12-hour session, audit, accessible mobile/error states, and tests.

Dependencies: PRs 1-2. Migration risk is low; authentication bypass/lockout risk is high. Tests cover every protected surface, manually entered URLs, expired/suspended states, browser close/resume, validation failures, session expiry, old credential rejection, concurrency, generic errors, and accessibility. Production acceptance requires an end-to-end disposable user, no route bypass, session rotation evidence, and clean logs.

## PR 4: Operator recovery commands

Status: implemented in PR #30 as the dry-run-first `pnpm tenant:recover` operator boundary. Inspection, credential reissue, user/organisation suspension, and safe reactivation are durable, approval-linked, idempotent, serializable, and secret-free. Owner replacement and second-owner preparation remain inspection/refusal-only because their authority and lifecycle are not fully specified.

Scope delivered:

- `inspect`, `reissue-credential`, `suspend-user`, `suspend-organisation`, and `reactivate` subcommands; all mutations require an active Clada internal approver, reason, idempotency key, and explicit `--execute`;
- safe classifications including `HEALTHY_ACTIVE`, `INVITED_CREDENTIAL_VALID`, `INVITED_CREDENTIAL_EXPIRED`, `DELIVERY_FAILED`, `PROVISIONING_INCOMPLETE`, `USER_SUSPENDED`, `ORGANISATION_SUSPENDED`, `ACTIVATION_STATE_DRIFT`, and `MANUAL_REVIEW_REQUIRED`;
- Argon2id credential reissue with a new 24-hour expiry, all-session invalidation, fake/test delivery only, and failure revocation that leaves onboarding in `PROVISIONING`;
- no-delete suspension/reactivation, refusal of unsafe lifecycle drift or ambiguous targeting, canonical non-secret input digests, exact replay, mismatch refusal, and safe audit evidence.

Dependencies: prior service boundaries and authority model. Migration risk is none/low; security risk is privilege escalation or wrong-target operation. Tests cover dry-run, confirmation, target fingerprinting, zero-owner prevention, session revocation, idempotency, and audit. Production acceptance requires rehearsing each command on disposable data and validating the support table.

## PR 5: Pilot Production validation

Status: validation harness implemented in PR #31 as `pnpm pilot:rehearsal`. The harness runs a synthetic end-to-end onboarding, first-login, tenant-isolation, suspension, recovery, credential-expiry/reissue, rollback, audit and cleanup rehearsal only against a positively identified local disposable PostgreSQL database. This evidence does not enable Production execution, real email delivery, or external pilot onboarding.

Scope: approved disposable organisation, end-to-end onboarding, tenant isolation, failure/rollback and recovery rehearsal, operator runbook validation, and cleanup/archive through approved commands. No real customer is used for the first exercise.

Dependencies: PRs 1-4 deployed and approved. Migration risk is none; operational/security risk is Production targeting and test-data leakage. Tests are the complete onboarding runbook smoke suite. Acceptance requires truthful empty dashboard, isolated labelled intake, no Demo Solar impact, audit completeness, clean logs, documented archival, and Patrick's explicit pilot-readiness approval.

## Exceptional legacy Production credential recovery

ADR-0022 defines a separate, owner-only recovery command for an existing
active Production pilot account whose credential predates or differs from the
approved Preview credential. This is not tenant provisioning and does not
broaden PR 4's general recovery scope. It requires exact Production database
identification, a reviewed read-only plan, CTO/owner approval, a change ID,
hidden human credential entry, forced first-login replacement, serializable
audit/idempotency, and unchanged tenant ownership. The command is deployed, but
Production execution remains blocked until a fresh plan and separate execution
change are authorised.

## Cross-PR controls

Every PR updates current-versus-target documentation, threat/security notes, tests, and recovery instructions. No PR logs secrets or embeds Production values. Feature flags or dormant schema may be used so migration and behaviour rollout are separate. Production remains gated by release governance, explicit approval, database fingerprint checks, and a reviewed rollback/repair plan.

## Approved CTO decisions

- Direct outbound delivery through a replaceable adapter is approved; the first Production implementation is transactional email.
- Temporary credentials expire after 24 hours; no routine 72-hour exception is allowed.
- Installer has a persistent unique lowercase kebab-case slug distinct from internal ID.
- Multi-organisation membership is deferred; the pilot keeps the globally unique membership `userId`.
- Patrick McKenna is initial business approver; `approvedBy` stores his durable authenticated Clada internal user ID.
- High-risk recovery requires Patrick's explicit approval until delegated authority is implemented.

## Remaining implementation details

- Select the transactional-email provider and package during PR 2 security/design review.
- Define provider-specific delivery status mapping, retry limits, and timeout policy behind the adapter.
- Decide whether invalidation needs an explicit `credentialVersion` field or can be safely represented by hash replacement plus session revocation.
- Finalise exact schema/enum names while preserving the approved state semantics.

## Security hardening follow-up

`production.env` does not exist and is not tracked, but the repository has no explicit ignore rule for it. Create an immediate separate security-hardening PR before provisioning implementation that adds:

```gitignore
production.env
*.env.local
```

Do not add that change to documentation PR #25. The existing `.env*.local` rule safely covers `.env.local` and `.env.production.local`, but it does not cover every filename matched by the broader `*.env.local` pattern, such as `pilot.env.local`. The separate hardening PR should close both explicit gaps.

## Related documents

- [Tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md)
- [Pilot onboarding runbook](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md)
- [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md)
