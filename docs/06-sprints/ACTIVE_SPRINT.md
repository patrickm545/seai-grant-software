# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - PR 1 Canonical Lead Workspace Shell implementation.

## Objective

Implement and validate the first approved Release 1.5 slice: one canonical, tenant-safe installer lead workspace with persistent lead context, local navigation, Overview composition, truthful deferred-section states, and legacy-route compatibility.

## In Scope

- canonical `/installer-review-emerald/leads/[leadId]` route and bounded workspace view model;
- authenticated persistent summary and Overview, Documents, Activity, Tasks, and Notes navigation;
- truthful loading, unavailable, not-found, and recoverable-error states;
- safe redirects from superseded admin lead-detail routes;
- desktop, 390 px, keyboard, focus, zoom, tenant, permission, route, and query evidence;
- current-state documentation and draft CTO review PR.

## Out Of Scope

- Prisma schema or database migrations;
- dependencies, tests, or deployment configuration;
- Manual Lead Creation or any PR 2 implementation;
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
- PR 1: Implementation in progress on its dedicated branch; draft CTO review PR pending validation.
- PR 2: Not begun.

## Definition Of Done

PR 1 is complete when the canonical workspace and compatibility routes pass focused tenant, permission, navigation, responsive, accessibility, performance, regression, build, and documentation validation; the scoped changes are committed and pushed; and a draft PR is opened for CTO review without schema, migration, dependency, or deferred Release 1.5 implementation.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
