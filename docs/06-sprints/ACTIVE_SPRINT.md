# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - approved documentation and pre-implementation handoff.

## Objective

Complete final review and merge preparation for the approved Platform Release 1.5 documentation. Implementation PRs 1–5 are authorised to begin in sequence after PR #34 merges. PR 6 remains blocked by the separately governed Release 1.4 generated-document implementation. No implementation has begun yet.

## In Scope

- approved Release 1.5 Master Specification
- five approved Release 1.5 feature specifications
- accepted ADR-0020 for organisation-owned work items
- approved Release 1.5 sprint plan and small-PR sequence
- COM, release, feature, ADR, sprint, and roadmap index updates
- explicit CTO sequencing decision: PRs 1–5 may use current `main` after PR #34 approval/merge, while PR 6 remains blocked by the separate Release 1.4 implementation sequence
- documentation validation
- documentation-only PR #34 ready-for-review preparation
- approved pre-implementation handoff for PRs 1–5

## Out Of Scope

- application code
- runtime behaviour changes
- Prisma schema or database migrations
- workspace, document centre, timeline, task, or note implementation
- deployment or release tag
- Release 1.5 implementation before PR #34 merges
- Release 1.5 PR 6 before the separate Release 1.4 implementation dependency is completed, reviewed, and merged

## Definition Of Done

This documentation sprint is complete when the approved documentation set is internally consistent and validated, PR #34 is ready for review, and the repository records that no implementation has begun. After PR #34 merges, implementation PRs 1–5 are authorised to begin in sequence. PR 6 remains blocked until the separately approved Release 1.4 governed generated-document implementation sequence is completed, reviewed, and merged into `main`.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
