# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - PR 2 Manual Lead Creation implementation.

## Objective

Implement and validate protected minimum manual lead capture into the existing SolarGRANT Pro `Lead`, then continue directly into the canonical workspace without fabricating qualification or consent facts.

## In Scope

- canonical `/installer-review-emerald/leads/new` route with name plus phone/email minimum capture;
- additive origin, creator, assignee, exact-match and progressive-nullability migration;
- trusted tenant/actor service, bounded duplicate warning, organisation-scoped idempotency, fail-closed privacy enablement, workflow/activity/note/audit transaction and workspace redirect;
- action-specific qualification gates and public-intake/portal/consumer regression;
- field/consumer table, migration evidence, desktop/390 px/accessibility evidence and draft CTO review PR.

## Out Of Scope

- PR 3 work-item schema or task migration;
- PR 4 Tasks UI/service, PR 5 full Notes UI/service, PR 6 timeline, or PR 7 Document Centre;
- task, installer-note, source-aware timeline, Customer Document Centre, or generated-document persistence;
- Release 1.5 PR 7 before the separate Release 1.4 generated-document implementation is approved, completed, reviewed, and merged;
- merge, deployment, release tag, or implementation outside PR 1.

## Approval State

- Master Specification: Approved.
- Six feature specifications: Approved.
- ADR-0020: Accepted.
- ADR-0021: Accepted.
- Sprint plan: Approved.
- CTO approval: Approved.
- CEO/product approval: Approved.
- Documentation gate PR #34: Merged in the authoritative `main` baseline.
- PR 1: Merged as PR #35 at `3cd9ded8cc93a98ed1a0136ba13d4cc9bf63e7fd`.
- PR 2: CTO/Project Shield corrections and disposable verification are in progress on its existing draft branch. The technical privacy gate is fail-closed; Production approval and enablement remain incomplete.

## Definition Of Done

PR 2 is ready for review when the protected creation flow, migration, field/consumer table, permission and tenant boundaries, public-intake compatibility, qualification gates, responsive/accessibility checks, and full validation pass; the scoped changes are committed and pushed; and a draft PR is opened without Production enablement or PR 3 work.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
