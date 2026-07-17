# Tenant Provisioning Implementation Plan

| Field | Value |
| --- | --- |
| Document ID | ENG-TENANT-PROVISIONING-PLAN-001 |
| Status | Proposed |
| Owner | Clada Systems Engineering |
| Review cycle | At every implementation PR |
| Last reviewed | 2026-07-17 |

## Purpose

This plan divides the approved architecture into independently reviewable PRs. It authorises no implementation or Production change. Each PR starts only after [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md) and its dependencies are approved.

## PR 1: Data model and migration

Scope: lifecycle fields, `mustChangePassword`, credential expiry/invitation state, provisioning operation and idempotency, audit correlation, active-owner semantics, constraints, and indexes. Decide whether Installer needs a slug or uses a documented stable ID. Preserve existing tenant data and explicitly handle the current globally unique membership `userId`.

Dependencies: approved domain model and migration/backfill plan. Migration risk is high because authentication and membership constraints are live; security risk is accidental activation, owner loss, or weakened uniqueness. Tests cover forward migration on representative data, constraint failures, rollback/recovery rehearsal, owner invariants, email/slug uniqueness, and no lead movement. Production acceptance requires reviewed backup/recovery evidence, guarded migration, row-count/ownership reconciliation, and no behaviour enablement.

## PR 2: Provisioning service and command

Scope: canonical validation, safe plans, dry-run default, immutable input digest, idempotency, strict conflicts, one transaction, create/reuse rules, owner membership, secure credential generation, expiry, in-transaction audit, safe exit/output, and unit/integration tests. The credential must flow directly to an approved non-logged delivery sink; absence of that integration blocks Production.

Dependencies: PR 1 and approved secret-delivery design. Migration risk is low; data-write and secret-exposure risk are high. Tests cover every conflict matrix row, duplicate/rerun behaviour, rollback on each step, audit failure, environment confirmation, no-secret output/log snapshots, and dry-run zero writes. Production acceptance requires disposable Preview execution, peer-reviewed plan, safe delivery proof, and exact database/audit reconciliation.

## PR 3: Forced first-login password change

Scope: restricted authentication state/session, server-side route and API guard, password-change UI/endpoint, current-credential verification, target policy, activation, credential invalidation, all-session revocation/rotation, audit, accessible mobile/error states, and tests.

Dependencies: PRs 1-2. Migration risk is low; authentication bypass/lockout risk is high. Tests cover every protected surface, manually entered URLs, expired/suspended states, browser close/resume, validation failures, session expiry, old credential rejection, concurrency, generic errors, and accessibility. Production acceptance requires an end-to-end disposable user, no route bypass, session rotation evidence, and clean logs.

## PR 4: Operator recovery commands

Scope: credential reissue, user and organisation suspend/reactivate, metadata correction, owner replacement, second-owner preparation where approved, safe audit output, and documented no-delete defaults.

Dependencies: prior service boundaries and authority model. Migration risk is none/low; security risk is privilege escalation or wrong-target operation. Tests cover dry-run, confirmation, target fingerprinting, zero-owner prevention, session revocation, idempotency, and audit. Production acceptance requires rehearsing each command on disposable data and validating the support table.

## PR 5: Pilot Production validation

Scope: approved disposable organisation, end-to-end onboarding, tenant isolation, failure/rollback and recovery rehearsal, operator runbook validation, and cleanup/archive through approved commands. No real customer is used for the first exercise.

Dependencies: PRs 1-4 deployed and approved. Migration risk is none; operational/security risk is Production targeting and test-data leakage. Tests are the complete onboarding runbook smoke suite. Acceptance requires truthful empty dashboard, isolated labelled intake, no Demo Solar impact, audit completeness, clean logs, documented archival, and Patrick's explicit pilot-readiness approval.

## Cross-PR controls

Every PR updates current-versus-target documentation, threat/security notes, tests, and recovery instructions. No PR logs secrets or embeds Production values. Feature flags or dormant schema may be used so migration and behaviour rollout are separate. Production remains gated by release governance, explicit approval, database fingerprint checks, and a reviewed rollback/repair plan.

## Approval decisions still required

- Approve the non-logged temporary-credential delivery integration or move directly to invitations.
- Approve whether the 24-hour default permits a reasoned 72-hour exception.
- Decide Installer slug storage versus deterministic stable-ID mapping.
- Decide when multi-organisation membership and tenant selection enter scope.
- Define the authority and identity format for `approved-by` and owner-recovery approval.

## Related documents

- [Tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md)
- [Pilot onboarding runbook](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md)
- [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md)
