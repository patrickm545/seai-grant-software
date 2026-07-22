# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-22 |

## Sprint

Platform Release 1.5 - Lead Workspace And Document Management documentation and approval phase.

## Objective

Create and review the complete documentation set for Platform Release 1.5. No application implementation is authorised during this sprint.

## In Scope

- Release 1.5 Master Specification
- five Release 1.5 feature specifications
- ADR-0020 for organisation-owned work items
- Release 1.5 sprint plan and small-PR sequence
- COM, release, feature, ADR, sprint, and roadmap index updates
- explicit CTO sequencing decision: PRs 1–5 may use current `main` after PR #34 approval/merge, while PR 6 remains blocked by the separate Release 1.4 implementation sequence
- documentation validation
- documentation-only draft pull request to `main`
- CTO review handoff

## Out Of Scope

- application code
- runtime behaviour changes
- Prisma schema or database migrations
- workspace, document centre, timeline, task, or note implementation
- deployment or release tag
- approval by inference

## Definition Of Done

This documentation sprint is complete when the documentation set is internally consistent and validated, a documentation-only draft PR is opened to `main`, the PR number and ADR recommendation are reported, and work stops for CTO review. After PR #34 approval/merge, PRs 1–5 may proceed only through their remaining documented gates. PR 6 remains blocked until the separately approved Release 1.4 governed generated-document implementation sequence is completed, reviewed, and merged into `main`.

## Release Documents

- [Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Sprint Plan](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
