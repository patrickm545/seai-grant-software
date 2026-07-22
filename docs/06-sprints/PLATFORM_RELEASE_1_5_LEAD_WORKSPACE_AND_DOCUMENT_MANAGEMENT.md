# Platform Release 1.5 - Lead Workspace And Document Management Sprint Plan

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-5 |
| Status | Proposed |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Each Release 1.5 implementation sprint and at release close |
| Last reviewed | 2026-07-22 |

## Purpose

Translate the proposed Release 1.5 Master Specification into small, approval-gated implementation increments. This document does not authorise application code. The current active work is documentation and CTO/CEO review only.

## Baseline And CTO Sequencing Decision

The documentation baseline is `main` merge commit `9828af1` from PR #33.

The CTO review decision is explicit:

- Release 1.5 PRs 1–5 may proceed from current `main` after PR #34 is approved and merged and their other documented approval gates are satisfied.
- Release 1.5 PR 6 must not begin until the missing Release 1.4 governed generated-document implementation has completed its own separately approved implementation PR sequence and has been reviewed and merged into `main`.
- Existing uploaded `LeadDocument` evidence may be surfaced earlier only where an approved PR 1–5 workspace scope requires it, and it must be labelled as uploaded evidence.
- No Release 1.5 PR may create a temporary generated-document substitute or duplicate or partially recreate the architecture governed by ADR-0015, ADR-0016, and ADR-0017.

This decision resolves sequencing only. The sprint plan, Master Specification, feature specifications, and ADR-0020 remain Proposed/Pending.

## Objectives

- make the lead workspace the primary installer working environment;
- expose existing capabilities coherently rather than redesigning them;
- add the minimum tenant-safe work-item foundation;
- make installer notes durable and attributed;
- provide source-aware activity and document projections;
- prove responsive, accessible, secure pilot use;
- preserve small PRs, backwards compatibility, tenant isolation, auditability, and immutable evidence.

## Required Approval Gates

Release 1.5 PRs 1–5 remain stopped until all are complete:

1. PR #34 is approved and merged.
2. CTO architecture approval of the Master Specification is recorded.
3. CEO product/scope approval of the Master Specification is recorded.
4. ADR-0020 is accepted before task-foundation implementation.
5. Relevant feature specifications are approved before their implementation PRs.
6. Exact task permissions, field constraints, migration/backfill identity, and concurrency contract are approved before task-foundation implementation.
7. Sprint sequence is approved.
8. Explicit implementation authorisation is recorded.

Release 1.5 PR 6 additionally requires the separate Release 1.4 governed generated-document implementation PR sequence to be approved, implemented, reviewed, and merged into `main` first.

## Feature Specifications

- [Unified Lead Workspace](../04-features/FEAT-PLATFORM-1-5-UNIFIED-LEAD-WORKSPACE.md)
- [Customer Document Centre](../04-features/FEAT-PLATFORM-1-5-CUSTOMER-DOCUMENT-CENTRE.md)
- [Timeline And Activity History](../04-features/FEAT-PLATFORM-1-5-TIMELINE-AND-ACTIVITY-HISTORY.md)
- [Task Management Foundation](../04-features/FEAT-PLATFORM-1-5-TASK-MANAGEMENT-FOUNDATION.md)
- [Installer Notes](../04-features/FEAT-PLATFORM-1-5-INSTALLER-NOTES.md)

## Architecture Decisions

- [ADR-0020: Organisation-Owned Work Items And Lead Task Proving Slice](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- Existing ADR-0005, ADR-0008, ADR-0009, ADR-0010, ADR-0013, ADR-0014, ADR-0015, ADR-0016, and ADR-0017 remain in force.

## Proposed PR Sequence

### PR 1 - Canonical Lead Workspace Shell

Outcome:

- canonical route and shared authenticated shell;
- persistent summary header and lead-local navigation;
- Overview section composition;
- legacy redirects;
- truthful loading, empty, partial, and error states;
- responsive/accessibility foundation.

Constraints:

- no schema migration;
- no new task/document/timeline persistence;
- existing mutation services remain authoritative.

Evidence:

- route/redirect tests;
- tenant-scoped query tests;
- desktop and 390 px browser evidence;
- keyboard/focus/zoom checks;
- bounded query evidence.

### PR 2 - Work-Item Schema And Migration

Outcome:

- additive platform work-item model, enums, constraints, and indexes;
- permission catalogue/mapping changes;
- deterministic idempotent follow-up backfill;
- fresh and approved-baseline migration evidence.

Constraints:

- no task UI;
- no fabricated completion history;
- preserve legacy follow-up fields;
- no generic resource types beyond the allowlisted lead adapter.

Evidence:

- Prisma validation/generation;
- migration SQL tests;
- disposable PostgreSQL fresh/upgrade/rerun tests;
- cross-tenant relation/assignee constraint tests;
- rollback note.

### PR 3 - Work-Item Service And Lead Tasks

Outcome:

- protected create, read, edit, assign, complete, reopen, and cancel services;
- optimistic concurrency;
- atomic audit and product activity projection;
- lead-local Tasks UI;
- due/overdue/upcoming and completed/cancelled presentation.

Constraints:

- no recurrence, subtasks, dependencies, notifications, comments, boards, or automation;
- no raw Prisma client model contract.

Evidence:

- lifecycle/permission unit tests;
- tenant/inactive/restricted/tampered-context integration tests;
- concurrency and transaction rollback tests;
- desktop/390 px browser task journey;
- accessibility evidence.

### PR 4 - Installer Notes

Outcome:

- protected append-only note service using `LeadActivity`;
- typed actor attribution and safe audit event;
- Notes section and quick-add action;
- labelled legacy internal-note compatibility.

Constraints:

- plain text only;
- no edit/delete, mentions, attachments, customer visibility, or AI generation;
- note bodies excluded from logs/audit metadata.

Evidence:

- validation, permission, tenant, actor, atomicity, and sanitisation tests;
- desktop/390 px keyboard and failure-recovery browser journey.

### PR 5 - Source-Aware Timeline

Outcome:

- bounded timeline read service;
- explicit source mappers and precedence/deduplication;
- stable pagination and category filters;
- Activity section.

Constraints:

- no new timeline/event-store table;
- no raw audit metadata;
- no fabricated history.

Evidence:

- mapping/order/cursor/deduplication tests;
- tenant-isolation tests;
- simultaneous timestamp and legacy metadata fixtures;
- responsive/accessibility and query-plan evidence.

### PR 6 - Customer Document Centre

Hard prerequisite:

- do not begin this PR until the missing Release 1.4 governed generated-document implementation has completed its own separately approved implementation PR sequence and has been reviewed and merged into `main`;
- confirm the PR 6 branch contains the authoritative Release 1.4 capability governed by ADR-0015, ADR-0016, and ADR-0017 before any Customer Document Centre work starts.

Outcome:

- uploaded-evidence read model and actions;
- governed generated-document metadata/actions from the merged authoritative Release 1.4 implementation;
- source-specific grouping, status, counts, empty/unavailable states;
- document-related timeline integration.

Constraints:

- no `LeadDocument` migration or unified table;
- no generated-document substitute;
- no duplication or partial recreation of Release 1.4 generated-document models, services, storage, rendering, retrieval, or audit contracts;
- no file bytes in list queries;
- no changes to immutable generated evidence or portal token semantics.

Evidence:

- mapping/status/count tests;
- permission and tenant-isolation tests per source;
- portal regression tests;
- ADR-0017 retrieval evidence when applicable;
- responsive/accessibility/performance evidence.

### PR 7 - Pilot Hardening And Release Close

Outcome:

- complete installer browser smoke journey;
- accessibility and mobile corrections within approved scope;
- migration/deployment rehearsal;
- safe observability and support guidance;
- current-state, capability, roadmap, debt, validation, and release sign-off updates.

Constraints:

- no unrelated feature expansion or architecture redesign;
- no release tag before CTO/CEO approval and merge.

Evidence:

- full validation matrix;
- one provisioned pilot-organisation rehearsal;
- database status-before/status-after evidence;
- recovery prerequisites confirmed;
- CTO and CEO review record.

## Cross-PR Review Rules

- Each PR has one primary outcome and explicit file scope.
- Schema, migration, service, and UI may be split further if review size becomes unsafe.
- Do not combine opportunistic refactors, dependency upgrades, or branding changes.
- Every protected read/mutation includes tenant and permission evidence.
- Every database PR includes fresh and upgrade migration evidence.
- Every UI PR includes desktop and 390 px evidence plus relevant accessibility checks.
- Documentation changes accompany the PR that changes reality.
- A later PR must not compensate for a known security or data-integrity defect in an earlier PR; fix before merge.

## Migration And Deployment Sequence

1. Use current `main` as the implementation baseline for Release 1.5 PRs 1–5 after PR #34 approval and merge.
2. Validate work-item migration against a disposable copy of that approved schema state.
3. Deploy additive schema before code that requires it.
4. Deploy service/UI readers compatible with legacy follow-up fields.
5. Verify backfill count and duplicates using aggregate identifiers only; do not print customer data.
6. Exercise one isolated Preview pilot organisation.
7. Confirm backup/PITR and recovery gates.
8. Run guarded Production migration with change reference and clean status evidence.
9. Enable the workspace for the first pilot organisation.
10. Complete, review, and merge the separately approved Release 1.4 implementation PR sequence before creating the Release 1.5 PR 6 branch.
11. Confirm PR 6 contains the authoritative ADR-0015/0016/0017 implementation, then implement and validate the Customer Document Centre.
12. Monitor safe error categories, conflicts, latency, and support outcomes.

## Release Validation Matrix

| Area | Required evidence |
| --- | --- |
| Documentation | Metadata, internal links, COM navigation, placeholders, diff check. |
| Schema | Prisma format/validate/generate and migration SQL review. |
| Migration | Fresh database, approved-baseline upgrade, rerun idempotency, guarded status. |
| Unit | View models, task lifecycle, timeline mapping, document mapping, note validation. |
| Integration | Permissions, tenant isolation, actor attribution, audit, concurrency, rollback. |
| Regression | Intake, portal, workflow, jurisdiction, existing documents, truthful empty states. |
| Browser | Login to lead workspace; navigate; note; task; document; stage; back/forward. |
| Responsive | 390 px critical path without horizontal table interaction. |
| Accessibility | Keyboard, focus, headings, names, live status, contrast, zoom, touch targets. |
| Performance | Bounded queries/pages and representative pilot latency/query evidence. |
| Deployment | Preview rehearsal, Production change reference, status before/after, recovery gate. |

## Stop Conditions

Stop and return to CTO review when:

- Release 1.5 PR 6 is proposed, branched, or started before the separate Release 1.4 governed generated-document implementation sequence is approved, completed, reviewed, and merged into `main`;
- any Release 1.5 work creates a temporary generated-document substitute or duplicates or partially recreates ADR-0015, ADR-0016, or ADR-0017 architecture;
- a feature would merge uploaded evidence with governed generated documents;
- a protected path cannot guarantee server-derived tenant context;
- task membership/resource organisation consistency is not enforceable and tested;
- migration cannot be made idempotent or rollback-compatible;
- note/task content would enter logs or audit metadata;
- the timeline requires raw audit exposure or a new event store;
- scope expands into quote revisions, collaboration, notification, scheduling, or general project management;
- required recovery/deployment evidence is unavailable for a Production data change.

## Definition Of Done

Release 1.5 is done only when all approved PRs are merged, all acceptance criteria in the Master Specification pass, the pilot journey is verified, migrations are safely deployed, current-state documentation matches reality, CTO and CEO approve release close, the release tag is explicitly authorised and created, and the roadmap records the actual outcome and deferrals.

## Related Documents

- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Release Lifecycle](../release-governance/RELEASE_LIFECYCLE.md)
- [CTO Review Checklist](../release-governance/CTO_REVIEW_CHECKLIST.md)
- [Database Operations Runbook](../03-engineering/DATABASE_OPERATIONS_RUNBOOK.md)
- [Technical Debt Register](../03-engineering/TECHNICAL_DEBT_REGISTER.md)
