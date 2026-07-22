# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - approved documentation and final pre-merge handoff.

## Objective

Prepare documentation-only PR #34 for final CTO pre-merge review after approval of Manual Lead Creation, Accepted ADR-0021, all six feature specifications, and the eight-PR sequence. No implementation has begun.

## In Scope

- Approved amended Release 1.5 Master Specification;
- six Approved Release 1.5 feature specifications;
- Accepted ADR-0020 and ADR-0021;
- Approved eight-PR implementation sequence;
- resolved ADR-0021 origin, completeness, migration, creator/assignee, permission, duplicate, follow-up, note, privacy, and PR 2 stop-condition decisions;
- explicit sequencing: PRs 1-6 authorised only after PR #34 merges and their gates pass; PR 7 remains blocked by the separate Release 1.4 implementation;
- aligned COM, release, feature, ADR, sprint, product-current-state, and roadmap records;
- documentation validation, PR body update, and ready-for-review transition.

## Out Of Scope

- application code or runtime behaviour;
- Prisma schema or database migrations;
- dependencies, tests, or deployment configuration;
- any Release 1.5 implementation before PR #34 merges;
- Release 1.5 PR 7 before the separate Release 1.4 generated-document implementation is approved, completed, reviewed, and merged;
- merge, deployment, release tag, or implementation work.

## Approval State

- Master Specification: Approved.
- Six feature specifications: Approved.
- ADR-0020: Accepted.
- ADR-0021: Accepted.
- Sprint plan: Approved.
- CTO approval: Approved.
- CEO/product approval: Approved.
- Implementation begun: No.
- PR #34: Ready for review; merge pending.

## Definition Of Done

This documentation sprint is complete when the approved records agree; all required validation and targeted consistency scans pass; the documentation-only changes are committed and pushed; PR #34 is marked ready for review; and no runtime, schema, migration, dependency, test, deployment, or application-behaviour change exists.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
