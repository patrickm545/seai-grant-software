# Technical Debt Register

| Field | Value |
| --- | --- |
| Document ID | ENG-TECH-DEBT-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-10 |

## Purpose

This register tracks technical debt that affects Clada OS architecture, security, maintainability, delivery confidence, or commercial readiness. It also records planned capability gaps when a known platform capability is intentionally scheduled for a future release.

It is not a feature backlog. Items should remain here only when they represent an architectural, operational, testing, documentation, or maintenance risk that future work should deliberately resolve.

A missing capability is not technical debt when it has not yet reached its scheduled implementation release. It becomes technical debt only when the current implementation contains a known compromise, workaround, duplication, weakness, or deferred correction.

## Severity Definitions

| Severity | Meaning |
| --- | --- |
| Critical | Must be fixed before the next platform release can start or before production use can continue safely. |
| High | Should be planned into the next relevant release or fixed before commercial scale. |
| Medium | Should be scheduled when it is adjacent to related work or starts slowing delivery. |
| Low | Useful cleanup that should not distract from active release goals. |

## Planned Capability Gaps

These items are intentionally scheduled platform capabilities. They are not implementation debt merely because they have not yet been built.

| ID | Planned capability | Scheduled release | Current status | Classification note |
| --- | --- | --- | --- | --- |
| PCG-001 | Full roles and permissions foundation | Platform Release 1.2 | Documented in the platform roadmap; not yet implemented. | Planned capability gap, not technical debt. Existing tenant context is the approved Platform Release 1.1 foundation. |
| PCG-002 | Actor-aware audit foundation | Platform Release 1.2 | Documented in the platform roadmap; not yet implemented. | Planned capability gap, not technical debt. Current string-based audit fields are tracked separately as technical debt because they are an existing implementation compromise. |

## Current Technical Debt

| ID | Severity | Area | Description | Impact | Recommendation | Blocks Platform Release 1.2? |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | High | Audit | `AuditLog.actor`, `LeadActivity.createdBy`, and `LeadActivity.createdByRole` are string fields rather than actor, user, membership, organisation, and permission-aware references. | Traceability is useful but not strong enough for commercial audit, permissions, or multi-organisation accountability. | During Platform Release 1.2, replace or wrap string-based audit writes with the planned actor-aware audit foundation. | No to start; yes to complete. |
| TD-002 | High | Validation | There is no GitHub Actions workflow or single command that enforces lint, typecheck, tests, migration checks, and documentation checks. | Release evidence depends on local discipline and PR notes, increasing regression risk as the team or agent count grows. | Add CI with `pnpm lint`, `pnpm typecheck`, `pnpm test`, migration validation, and documentation validation. | No. |
| TD-003 | High | Security and GDPR | Security/GDPR guidance exists, but formal commercial-scale privacy, DPA, retention, deletion/export, and incident-response documents are incomplete. | Commercial customers and production operations will need stronger privacy and incident readiness evidence. | Move active security guidance into the numbered COM and add missing commercial-scale policies before commercial launch. | No to start; likely before commercial launch. |
| TD-004 | Medium | Package management | Both `package-lock.json` and `pnpm-lock.yaml` are tracked while `package.json` declares `pnpm@10.11.0`. | Future installs can diverge if contributors or automation use npm accidentally. | Standardize on pnpm and remove the unused lockfile in a focused maintenance PR. | No. |
| TD-005 | Medium | Documentation validation | COM metadata and links are manually reviewable but not enforced by a durable validation script. | Broken links or missing metadata can enter the COM unnoticed. | Add a documentation validation script that checks metadata tables, internal Markdown links, and COM summary navigation. | No. |
| TD-006 | Medium | Documentation structure | Legacy support folders and active numbered COM sections still overlap. | Future contributors may be uncertain which documents are authoritative without reading the navigation notes carefully. | Reconcile active content into numbered COM sections and archive superseded support docs deliberately. | No. |
| TD-007 | Medium | Data access coverage | The lead proving slice uses scoped helpers, but some direct Prisma access remains in public-token, seed, setup, and legacy contexts. | Direct access is acceptable in known exceptions, but future changes could accidentally bypass tenant scoping. | During Platform Release 1.2, add a data-access review checklist and tests for protected workflow routes. | No to start; should be reviewed during 1.2. |
| TD-008 | Medium | Authentication | Admin authentication is still a lightweight password and signed-cookie flow adapted into the identity foundation. | This is adequate for the first proving slice but not for mature multi-user roles, invitations, or commercial account administration. | Keep the current adapter for Platform Release 1.2 unless scope requires deeper auth, but document provider mapping and future authentication decisions. | No. |
| TD-009 | Medium | Row-level security | Tenant isolation is enforced in application helpers and PostgreSQL ownership constraints, but database row-level security is not implemented. | A future direct query path could bypass application-level scoping if review discipline fails. | Reassess row-level security after the permission and audit context model stabilizes. | No. |
| TD-010 | Low | Naming legacy | The package name and repository name still reflect the original SEAI solar grant assistant history. | Naming can confuse future contributors about the difference between Clada OS and SolarGRANT Pro. | Defer renaming until product and deployment implications are clear; keep COM terminology authoritative meanwhile. | No. |

## Critical Debt

No critical technical debt was identified during Architecture Checkpoint 1.

## Review Rules

- Update this register when a release discovers, resolves, or intentionally defers material debt.
- Do not use this register to hold ordinary feature ideas.
- Link debt items from sprint records when they materially affect release scope or validation.
- Remove or supersede items only when the resolution is merged and documented.

## Related Documents

- [Architecture Checkpoint 1](../06-sprints/ARCHITECTURE_CHECKPOINT_1.md)
- [Engineering Standards](ENGINEERING_STANDARDS.md)
- [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
- [Platform Execution Model and Roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md)
- [Security and GDPR](../engineering/security-and-gdpr.md)
