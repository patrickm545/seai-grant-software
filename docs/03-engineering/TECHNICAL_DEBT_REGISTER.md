# Technical Debt Register

| Field | Value |
| --- | --- |
| Document ID | ENG-TECH-DEBT-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-17 |

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
| PCG-001 | Full roles and permissions foundation | Platform Release 1.2 | Implemented in Platform Release 1.2 as a platform role enum, code-defined permission catalogue, role-to-permission mapping, and proving-slice authorisation. | No longer a planned gap after the release merges; future custom roles and user administration remain out of scope rather than debt. |
| PCG-002 | Actor-aware audit foundation | Platform Release 1.2 | Implemented in Platform Release 1.2 as typed audit fields, a typed audit writer, compatibility wrapper, backfill migration, and proving-slice audit event. | No longer a planned gap after the release merges; remaining string-field compatibility is tracked as technical debt. |
| PCG-003 | Workflow foundation | Platform Release 1.3 | Implemented in Platform Release 1.3 as workflow definitions, stages, transitions, instances, history, execution service, migration backfill, and SolarGRANT Pro lead pipeline proving slice. | No longer a planned gap after the release merges; projection drift and future stricter transition modelling are tracked as technical debt or future platform work. |

## Current Technical Debt

| ID | Severity | Area | Description | Impact | Recommendation | Blocks active release? |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | Medium | Audit | Platform Release 1.2 adds typed `AuditLog` attribution and typed proving-slice `LeadActivity` attribution, but legacy string fields remain for compatibility and not every legacy write has been migrated to full typed context. | Traceability is materially stronger for protected actions, but mixed legacy and typed records still require careful UI and support interpretation. | Keep the compatibility wrapper, migrate remaining material audit/activity call sites as adjacent protected workflows move behind platform services, then close this item after the legacy fields are no longer required for active workflows. | No. |
| TD-002 | High | Validation | **Partially resolved:** a small GitHub Actions workflow now enforces install, lint, typecheck, unit tests, build, and optional disposable PostgreSQL integration tests. Documentation validation and a single complete release command are still absent. | Core regressions are checked automatically, but documentation integrity and provider-backed tests still depend on configuration and review discipline. | Add the planned documentation validator; configure disposable CI database metadata before relying on PostgreSQL results. | No. |
| TD-003 | High | Security and GDPR | Security/GDPR guidance exists, but formal commercial-scale privacy, DPA, retention, deletion/export, and incident-response documents are incomplete. | Commercial customers and production operations will need stronger privacy and incident readiness evidence. | Move active security guidance into the numbered COM and add missing commercial-scale policies before commercial launch. | No to start; likely before commercial launch. |
| TD-004 | Medium | Package management | Both `package-lock.json` and `pnpm-lock.yaml` are tracked while `package.json` declares `pnpm@10.11.0`. | Future installs can diverge if contributors or automation use npm accidentally. | Standardize on pnpm and remove the unused lockfile in a focused maintenance PR. | No. |
| TD-005 | Medium | Documentation validation | COM metadata and links are manually reviewable but not enforced by a durable validation script. | Broken links or missing metadata can enter the COM unnoticed. | Add a documentation validation script that checks metadata tables, internal Markdown links, and COM summary navigation. | No. |
| TD-006 | Medium | Documentation structure | Legacy support folders and active numbered COM sections still overlap. | Future contributors may be uncertain which documents are authoritative without reading the navigation notes carefully. | Reconcile active content into numbered COM sections and archive superseded support docs deliberately. | No. |
| TD-007 | Medium | Data access coverage | The lead stage-change proving slice now uses permission-aware and workflow-aware service boundaries, but some direct Prisma access remains in public-token, seed, setup, and legacy read contexts. | Direct access is acceptable in documented exceptions, but future protected mutations could bypass tenant, permission, or workflow checks if not reviewed. | Keep public-token and setup exceptions explicit, and move each future protected workflow behind platform service helpers as it is touched. | No. |
| TD-008 | Medium | Authentication | Admin authentication is still a lightweight password and signed-cookie flow adapted into the identity foundation. | This is adequate for the first proving slice but not for mature multi-user roles, invitations, or commercial account administration. | Keep the current adapter for Platform Release 1.2 unless scope requires deeper auth, but document provider mapping and future authentication decisions. | No. |
| TD-009 | Medium | Row-level security | Tenant isolation is enforced in application helpers and PostgreSQL ownership constraints, but database row-level security is not implemented. | A future direct query path could bypass application-level scoping if review discipline fails. | Reassess row-level security after the permission and audit context model stabilizes. | No. |
| TD-010 | Low | Naming legacy | The package name and repository name still reflect the original SEAI solar grant assistant history. | Naming can confuse future contributors about the difference between Clada OS and SolarGRANT Pro. | Defer renaming until product and deployment implications are clear; keep COM terminology authoritative meanwhile. | No. |
| TD-011 | Medium | Workflow projection | `Lead.pipelineStage` remains as a compatibility projection of `WorkflowInstance.currentStage` for current UI, portal progress, and reporting paths. Platform Release 1.3 keeps protected transitions atomic, but direct future writes could still bypass the adapter. | Future direct updates to `Lead.pipelineStage` could drift from workflow instance state and history. | Keep all protected stage changes behind `changeLeadPipelineStage`, add checks when future UI/reporting moves to workflow instances directly, and consider removing the projection after product surfaces consume workflow state. | No. |
| TD-012 | Low | Workflow history | `WorkflowHistory` now has composite database constraints for workflow definition, stage, transition, instance, and organisation consistency, but denied-attempt history and denormalised stage-key string matching remain intentionally deferred. | Rejected workflow requests are proven by no-mutation behaviour and audit policy remains simpler, but future reporting may need durable rejected-attempt facts. | Define a failed-attempt workflow/audit policy before adding denied-attempt history or database checks tying historical stage-key strings to current stage rows. | No. |
| TD-013 | High | Deployment readiness | **Mitigated repository-side:** guarded Preview/test/Production migration commands now run status before deploy and require clean status afterward. Production has a deliberate acknowledgement and change-reference path. Provider promotion execution remains manual. | A correctly built application can still fail at runtime if operators bypass the named commands or provider configuration is wrong. | Require the runbook gate for every database-backed release and retain command evidence; consider automated promotion only after pilot operations justify it. | No after PR #10 amendment; retain as an operational release gate. |
| TD-014 | Medium | Notifications | Email and SMS delivery are awaited with bounded provider timeouts from the intake request path, but there is still no durable notification outbox or retry worker. | Notification provider outages do not roll back saved leads or fail successful form submissions, but failed notifications require log review and may not retry automatically. | Add a durable notification outbox, retry policy, and admin-visible notification status before commercial scale. | No. |
| TD-015 | High | Deployment environments | **Mitigated; recovery evidence pending:** repository guardrails are implemented, Vercel now has separate Production/Preview/Development database scopes and identity markers, the three Neon targets have distinct verified fingerprints, and a clean-cache Preview deployment plus non-destructive route checks passed. Production branch protection remains unverified where the current plan exposes no enabled control; backup/PITR retention and a non-Production recovery rehearsal are still pending. Authenticated dashboard reads also still perform default identity upserts. | Cross-environment database targeting now fails closed in code and the deployed provider mapping is isolated. Recovery readiness is not yet evidenced, and implicit setup writes still prevent authenticated Production smoke reads. | Verify and record retention/PITR, branch protection where available, and a non-Production recovery rehearsal. The authentication/onboarding PR must remove read-time bootstrap upserts before authenticated Production checks. | Yes for authenticated pilot onboarding or Production data workflows until recovery evidence and the read-time-upsert blocker are addressed; no for merging the isolation guardrails. |
| TD-016 | Medium | Privacy and communications | The SolarGRANT Pro intake flow currently supports SMS notifications containing or relating to customer lead information. SMS may place customer information on installer-owned or employee-owned mobile phones outside centrally managed company systems. | Customer information may be distributed across personal or unmanaged devices, making access control, retention, deletion, offboarding, audit, and GDPR compliance harder to manage. | Remove SMS notifications from the intake flow and retire the current SMS integration, configuration, environment variables, tests, and documentation. Use centrally managed email as the supported external notification channel. Preserve a product-neutral notification service boundary for future managed channels such as in-app notifications, Microsoft Teams, Slack, or WhatsApp Business if later approved. | No. Schedule as a focused product maintenance PR before wider installer onboarding or commercial-scale use. |
| TD-017 | Low | Installer workflow | The Sales Playbook page and navigation item do not fit the core installer workflow and have no currently validated use case. | The unrelated surface distracts from the primary installer journey and adds navigation and maintenance overhead. | Remove the Sales Playbook page and navigation item unless a future validated use case justifies restoring them. | No. |
| TD-018 | Low | Authentication usability and accessibility | The login page password field does not provide a Show/Hide Password toggle. | Pilot users cannot visually verify a typed password, increasing avoidable sign-in friction, particularly for long passwords and assistive-technology users. | Add an eye-icon Show/Hide Password toggle with an accessible name, keyboard support, visible focus, and state communicated to assistive technology. | No. |

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
