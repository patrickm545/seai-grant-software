# ADR-0019: Standardised Tenant Provisioning and Forced First-Login Password Change

| Field | Value |
| --- | --- |
| Document ID | ADR-0019 |
| Status | Proposed |
| Owner | Clada Systems Engineering |
| Review cycle | Before pilot provisioning implementation or identity-provider change |
| Last reviewed | 2026-07-18 |

## Context

SolarGRANT Pro has database-backed pilot authentication and a guarded transactional pilot upsert command, but the current data model and command do not provide dry-run planning, provisioning operations, lifecycle states, credential expiry, forced first-login password change, complete audit evidence, or an approved secret-delivery mechanism. Clada OS must own a reusable onboarding boundary before the first external pilot.

## Problem

Repeated Production SQL or bespoke Codex database work is unsafe, difficult to review, non-repeatable, and prone to partial or cross-tenant state. A successful account creation alone is insufficient: onboarding must be deterministic, atomic, idempotent, observable, auditable, tenant-safe, and recoverable.

## Decision

For early pilots, use a standard repository provisioning command operated through Codex. It defaults to dry-run, binds execution to the reviewed input plan and idempotency key, requires explicit Production confirmation and environment verification, performs related database writes in one transaction, applies strict create/reuse/no-op/conflict rules, writes non-secret audit events, and runs tenant smoke tests.

The provisioning transaction leaves the organisation `PROVISIONING` and first owner `INVITED` with `mustChangePassword=true`. The organisation becomes `ACTIVE` only when successful password replacement atomically makes the owner `ACTIVE` and clears `mustChangePassword`. If activation never completes, authorised reissue retains `PROVISIONING`; cancellation revokes credentials/sessions and archives the organisation.

The interim credential is cryptographically generated and expires after exactly 24 hours; no routine 72-hour exception is allowed. It is stored as the user's only normal password hash with proposed expiry and invalidation state—never as a second valid hash. Reissue replaces the hash and revokes sessions. Successful replacement replaces it again, clears expiry, and enables normal access.

A replaceable `CredentialDeliveryAdapter` sends the in-memory credential directly through a transactional-email Production implementation. It never persists/logs or returns the plaintext, returns only safe provider delivery ID/status, supports a fake test adapter and failure reporting, and has no plaintext fallback. Codex and Patrick never receive the credential. One-time invitation links remain the planned replacement.

Temporary login creates only a 30-minute non-refreshable restricted session. It cannot access ordinary pages/protected APIs or become normal through refresh. After expiry, the owner signs in again with the still-valid temporary credential. Successful replacement revokes restricted sessions and issues a normal 12-hour session.

Installer receives a persistent unique lowercase kebab-case slug distinct from its internal ID. Multi-organisation membership is deferred, and the pilot retains the globally unique membership `userId`. Patrick McKenna is the initial business approver; `approvedBy` references his durable authenticated Clada internal user ID. High-risk recovery requires his explicit approval until delegated authority is implemented.

## Scope

This decision covers Clada OS organisation, Installer tenant/slug, global user, single pilot membership, owner membership, provisioning operation, credential/delivery state, first-login restrictions, audit evidence, and operator workflow. The first implementation provisions only `ORGANISATION_OWNER` for SolarGRANT Pro. It does not approve public signup, broad staff roles, multi-organisation access, billing, SSO, or a Production data change in this documentation PR.

## Alternatives considered

1. Repeated manual Production database edits: rejected because they are non-repeatable, weakly auditable, and invite partial state.
2. Bespoke Codex database work per customer: rejected; Codex may operate a standard command but must not become an undocumented control plane.
3. Standard repository command through Codex: selected as the smallest reviewable pilot boundary.
4. Immediate internal admin UI: deferred; it adds UI authorisation and recovery scope before the service contract is proven.
5. Invitation links from the outset: preferred end state, deferred only to keep the first implementation bounded.
6. Third-party identity provider: deferred until requirements and commercial value justify migration and vendor dependence.

## Consequences

Benefits are atomic onboarding, deterministic retries, safe conflict handling, explicit tenant checks, direct credential delivery, durable audit evidence, and reuse across Clada products. Costs are new lifecycle/operation data, persistent Installer slugs, recovery tooling, restricted-session logic, adapter/provider integration, and test coverage. Operators cannot bypass conflicts with ad hoc SQL.

## Security implications

Membership remains the tenant-authorisation source. Temporary credentials never reach Codex, operators, normal output, logs, audit, or storage in plaintext; they expire after 24 hours, are rate-limited, and are invalidated by change/reset/suspension. Delivery audit contains only safe provider receipt data. All protected server boundaries enforce the 30-minute restricted-session boundary. Internal Clada identity remains separate from customer membership. Audit metadata is sanitised and secret-free.

## Operational implications

Every Production execution needs Patrick's approval through his authenticated internal user identity, dry-run evidence, exact-plan confirmation, environment fingerprint verification, an idempotency key, direct adapter delivery, post-commit smoke tests, and a safe result. Failures before commit roll back; post-commit delivery failures leave the organisation `PROVISIONING` and use audited revoke/reissue. High-risk recovery needs Patrick's explicit approval. Suspension and archive are preferred over deletion.

## Migration path

Implement lifecycle/credential state, persistent Installer slug, provisioning/audit structures, and constraints while retaining globally unique membership `userId`. Then implement the provisioning service/command plus delivery adapter, forced first-login flow, recovery commands, and disposable-tenant Production validation as separate reviewable PRs. Migrate from temporary credentials to one-time invitations, then expose proven services through a Clada internal admin UI. Multi-organisation users remain beyond pilot scope and require a future ADR, constraint change, and tenant-selection design.

## Future review triggers

Review this decision before enabling multi-organisation membership, changing the credential-delivery trust boundary/provider class, invitation links, delegated approval, staff roles, self-service signup, MFA/SSO, a third-party identity provider, product entitlements, or a general internal administration UI.

## Related documents

- [Tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md)
- [Pilot onboarding runbook](../03-engineering/SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md)
- [Implementation plan](../03-engineering/TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md)
- [ADR-0018](ADR-0018-pilot-installer-authentication.md)
