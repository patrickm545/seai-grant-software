# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - Manual Lead Creation documentation amendment and re-approval preparation.

## Objective

Amend documentation-only PR #34 to include Manual Lead Creation, supersede the previous approval state, define the minimum compatible Lead data evolution, and prepare the revised eight-PR sequence for CTO and CEO re-review. No implementation is authorised and none has begun.

## In Scope

- Proposed amended Release 1.5 Master Specification;
- six Proposed Release 1.5 feature specifications, including Manual Lead Creation;
- Accepted ADR-0020, unchanged;
- Proposed ADR-0021 for lead creation origin and progressive completeness;
- Proposed Release 1.5 eight-PR sequence;
- explicit dependency rule: PRs 1-6 may proceed only after re-approval and PR #34 merge; PR 7 remains blocked by the separate Release 1.4 implementation;
- COM, release, feature, ADR, sprint, product-current-state, and roadmap updates;
- documentation and approval-state validation;
- draft PR #34 body update and CTO re-review handoff.

## Out Of Scope

- application code or runtime behaviour;
- Prisma schema or database migrations;
- any Release 1.5 implementation before amended documentation approval and PR #34 merge;
- Manual Lead Creation, workspace, tasks, notes, timeline, document centre, or hardening implementation;
- Release 1.5 PR 7 before the separate Release 1.4 generated-document implementation is approved, completed, reviewed, and merged;
- deployment, merge, release tag, or release-close approval.

## Approval State

- Prior CTO approval: Superseded by material scope amendment.
- Prior CEO/product approval: Superseded by material scope amendment.
- CTO re-review: Pending.
- CEO/product re-approval: Pending.
- Implementation authorisation: Pending.
- Implementation begun: No.
- PR #34 state: Draft.

## Definition Of Done

This amendment sprint is ready for re-review when six feature specs, the Master, Accepted ADR-0020, Proposed ADR-0021, the eight-PR sequence, PR 7 dependency, indexes, roadmap, product boundary, and approval records agree; required documentation checks pass; changes are committed and pushed to PR #34; the PR remains draft; and no runtime file changed.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
