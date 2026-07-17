# ADR-0019: Standardised Tenant Provisioning and Forced First-Login Password Change

| Field | Value |
| --- | --- |
| Document ID | ADR-0019 |
| Status | Proposed |
| Owner | Clada Systems Engineering |
| Review cycle | Before pilot provisioning implementation or identity-provider change |
| Last reviewed | 2026-07-17 |

## Context

SolarGRANT Pro has database-backed pilot authentication and a guarded transactional pilot upsert command, but the current data model and command do not provide dry-run planning, provisioning operations, lifecycle states, credential expiry, forced first-login password change, complete audit evidence, or an approved secret-delivery mechanism. Clada OS must own a reusable onboarding boundary before the first external pilot.

## Problem

Repeated Production SQL or bespoke Codex database work is unsafe, difficult to review, non-repeatable, and prone to partial or cross-tenant state. A successful account creation alone is insufficient: onboarding must be deterministic, atomic, idempotent, observable, auditable, tenant-safe, and recoverable.

## Decision

For early pilots, use a standard repository provisioning command operated through Codex. It will default to dry-run, bind execution to the reviewed input plan and idempotency key, require explicit Production confirmation and environment verification, perform related database writes in one transaction, apply strict create/reuse/no-op/conflict rules, write non-secret audit events, and run tenant smoke tests.

The interim credential is cryptographically generated, hashed, expires after 24 hours by default, is delivered only through an approved non-logged separate channel, and forces a server-enforced password change before product access. The restricted session cannot access ordinary pages, APIs, or refresh paths. Password change revokes the temporary authority and rotates the session.

The command must not print a credential. Production use remains blocked until a security-approved secret handoff is implemented. Invitation links and an internal admin UI replace the interim process in later phases.

## Scope

This decision covers Clada OS organisation, Installer tenant, global user, owner membership, provisioning operation, credential/invitation state, first-login restrictions, audit evidence, and operator workflow. The first implementation provisions only `ORGANISATION_OWNER` for SolarGRANT Pro. It does not approve public signup, broad staff roles, billing, SSO, or a Production data change in this documentation PR.

## Alternatives considered

1. Repeated manual Production database edits: rejected because they are non-repeatable, weakly auditable, and invite partial state.
2. Bespoke Codex database work per customer: rejected; Codex may operate a standard command but must not become an undocumented control plane.
3. Standard repository command through Codex: selected as the smallest reviewable pilot boundary.
4. Immediate internal admin UI: deferred; it adds UI authorisation and recovery scope before the service contract is proven.
5. Invitation links from the outset: preferred end state, deferred only to keep the first implementation bounded.
6. Third-party identity provider: deferred until requirements and commercial value justify migration and vendor dependence.

## Consequences

Benefits are atomic onboarding, deterministic retries, safe conflict handling, explicit tenant checks, durable audit evidence, and reuse across Clada products. Costs are new lifecycle/operation data, recovery tooling, restricted-session logic, test coverage, and an approved secure-delivery dependency. Operators cannot bypass conflicts with ad hoc SQL.

## Security implications

Membership remains the tenant-authorisation source. Temporary credentials never appear in normal output or logs, expire, are rate-limited, and are invalidated by change/reset/suspension. All protected server boundaries enforce first-login restriction. Internal Clada identity remains separate from customer membership. Audit metadata is sanitised and secret-free.

## Operational implications

Every Production execution needs approval, dry-run evidence, exact-plan confirmation, environment fingerprint verification, an idempotency key, post-commit smoke tests, and a safe result. Failures before commit roll back; post-commit delivery failures use audited revoke/reissue or repair. Suspension and archive are preferred over deletion.

## Migration path

Implement the data model and constraints, then provisioning service/command, forced first-login flow, recovery commands, and disposable-tenant Production validation as separate reviewable PRs. Migrate from temporary credentials to one-time invitations, then expose the proven services through a Clada internal admin UI. Multi-organisation users require removal of the current globally unique membership `userId` plus an explicit tenant-selection design.

## Future review triggers

Review this decision before enabling multi-organisation membership, automated email delivery, invitation links, staff roles, self-service signup, MFA/SSO, a third-party identity provider, product entitlements, or a general internal administration UI.

## Related documents

- [Tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md)
- [Pilot onboarding runbook](../03-engineering/SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md)
- [Implementation plan](../03-engineering/TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md)
- [ADR-0018](ADR-0018-pilot-installer-authentication.md)
