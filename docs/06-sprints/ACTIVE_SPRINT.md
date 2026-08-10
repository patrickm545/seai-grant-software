# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-08-10 |

## Sprint

Platform Release 1.5 - PR 2 Manual Lead Creation implementation.

## Production Release Blocker

Repository work does not authorise Production promotion. The Production
migration-history incident and ADR-0024 remediation block every Production
release. PR #41 is merged but its password-reset migration is pending and its
foundation is not live. Password-reset request-flow work and external pilot
rollout remain paused.

PR #43 implements the ADR-0024 verifier on a separate focused branch. Its
attestation is pending and Production acceptance remains disabled until a
separately reviewed evidence/approval activation. The implementation does not
change this sprint's product scope and does not authorise Production execution.

PR #44 prepares the fixed read-only evidence-capture tooling and records
deterministic disposable fresh/post fingerprints. It performs no Production
query or live capture. A separate operational PR must capture evidence and
activate the attestation; a later execution PR must apply and verify the
migration. The attestation and release blocker remain unchanged.

Draft PR #45 now records the temporary pilot-stage operating model: Patrick
McKenna is CEO, Production Owner, Production Operator, Recovery Owner and final
accountable approver; no independent human technical reviewer is currently
available; and AI-assisted CTO review is a method rather than a human approval.
The narrow compensating-control mode applies only to two read-only Production
captures, attestation activation and exact blocked status verification. The
approved change ID, restore evidence, controlled connection metadata, capture
artifacts and activation evidence remain pending. No Production capture or
status command ran and the release blocker remains unchanged. Preview lineage
is repaired and strict. This does not authorise migration execution,
application deployment or alias movement.

R13 is permanently closed. Its repository-only follow-up defines one pending
`attestedHistoricalResolvedMigration` for the exact pilot-auth repair/resolve
history without changing ordinary one-step migration acceptance. Current
ledger timestamps, evolved catalog evidence, two matching captures and
approvals remain absent, so the attestation has zero captures and approvals and
the release blocker is unchanged. R14 stopped before complete evidence and is
closed; any later operation requires separate authority.

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
