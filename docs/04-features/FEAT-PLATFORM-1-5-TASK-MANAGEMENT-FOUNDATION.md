# Platform Release 1.5 - Task Management Foundation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-TASKS |
| Status | Proposed |
| Owner | Clada Systems Platform Engineering |
| Review cycle | Platform Release 1.5 and when work-item lifecycle changes |
| Last reviewed | 2026-07-22 |

## Summary

Create the minimum reusable Clada OS work-item foundation and prove it through SolarGRANT Pro lead tasks. Installers can create, assign, due-date, edit, complete, reopen, and cancel explicit work without turning Release 1.5 into a project-management suite.

## Problem

The current lead has one follow-up timestamp and legacy string assignees. It cannot represent multiple pieces of work, membership ownership, completion state, or safe concurrent updates. Installers risk missed work or parallel spreadsheets.

## Evidence

- Existing `nextFollowUpAt`/`followUpDate` and follow-up activity behaviour.
- Product UX audit recommendation for structured next action with due date and owner.
- Accepted organisation, membership, authorisation, audit, and workflow foundations.
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md).

## Product Scope

In scope:

- work-item schema, additive migration, tenant/resource/membership constraints, indexes, and idempotent follow-up backfill;
- `task.read`, `task.create`, and `task.update` permission decisions;
- protected create, edit, assign/unassign, complete, reopen, and cancel services;
- lead-local open/completed/cancelled views with due/overdue/upcoming state;
- actor attribution, optimistic concurrency, audit, and SolarGRANT Pro activity projection;
- truthful empty, validation, conflict, permission, and error states.

Out of scope:

- task deletion, subtasks, dependencies, recurrence, comments, mentions, attachments, time tracking, custom states, boards, automations, reminders, calendar sync, or cross-organisation work;
- task-as-workflow-instance;
- replacing the global dashboard with a full work queue in this release.

## Platform Classification

Clada OS platform capability with a SolarGRANT Pro lead proving slice. Platform owns work mechanics; SolarGRANT Pro owns task language and lead-local UX.

## User Workflow

1. Authorised installer opens Tasks for an owned lead.
2. Installer creates a bounded title, optional description, optional due time, optional priority, and optional active same-organisation assignee.
3. Open tasks are ordered by overdue, due date, then creation time with undated tasks clearly labelled.
4. Installer edits or assigns using the current version.
5. Installer completes, reopens, or cancels a task; stale changes return a conflict.
6. Material successful mutations create audit and product activity records atomically.

## Design Requirements

- Creating a basic task requires only a title; optional fields do not obstruct capture.
- Due/overdue state uses text and semantics, not colour alone.
- Assignee choices include only active memberships from the current organisation.
- Completion is quick but undoable through explicit reopen.
- Cancellation is distinct from completion.
- Conflict UI shows that the task changed and offers refresh; it does not silently overwrite.
- 390 px, keyboard, focus, screen-reader status announcements, and touch targets are acceptance gates.

## Architecture Notes

- Exact schema follows ADR-0020 and the Master Specification.
- `resourceType` is allowlisted to `lead` in Release 1.5.
- Service resolves organisation and actor context; client ownership/actor fields are ignored.
- Create validates lead ownership before work-item insert.
- Assignment validates active membership and matching organisation.
- Mutations use version/current-state conditional updates inside a transaction with audit/activity writes.
- Audit metadata includes IDs and safe state changes, not title/description/customer facts.
- Follow-up backfill chooses `nextFollowUpAt`, falling back to `followUpDate`, and creates no completion history.
- Manual Lead Creation PR 2 may capture an optional compatibility follow-up before the work-item schema lands; PR 3 backfill and PR 4 service rules must create at most one corresponding open task.
- Legacy follow-up fields remain readable during rollback compatibility; any dual writes are transaction-bound and documented.

## Permission Recommendation

| Permission | Initial role intent |
| --- | --- |
| `task.read` | Active organisation members who may read the linked lead. |
| `task.create` | Organisation owner/admin/member roles permitted to perform lead work; restricted viewers denied. |
| `task.update` | Organisation owner/admin/member roles permitted to perform lead work; restricted viewers denied. |

Every task permission is necessary but not sufficient: linked-resource read/access and organisation ownership are also required. Internal roles follow ADR-0010 and explicit mapping.

## Risks

- Generic resource IDs link across tenants.
- Legacy follow-up backfill duplicates tasks.
- Two installers overwrite task state.
- Task scope expands beyond pilot needs.
- Audit leaks content.

Use allowlisted adapters, composite/service tenant checks, deterministic backfill, optimistic concurrency, strict non-goals, and sanitized audit metadata.

## Acceptance Criteria

- Every work item has one organisation and an approved owned lead resource.
- Cross-tenant lead/assignee IDs are rejected safely with no writes.
- Authorised users can create, edit, assign, complete, reopen, and cancel according to valid state transitions.
- Restricted or inactive actors are denied server side.
- Competing completion produces at most one success event.
- Backfill can run twice without duplicates and invents no history.
- Successful mutations atomically create required audit/activity records.
- Task bodies do not enter logs or audit metadata.
- Existing follow-up behaviour remains rollback-compatible.

## Verification Plan

- unit tests for lifecycle, permission composition, validation, ordering, and error mapping;
- PostgreSQL tests for organisation/membership consistency, backfill idempotency, concurrency, and rollback;
- cross-tenant/inactive/restricted/tampered-context integration tests;
- migration tests from approved baseline and fresh database;
- browser tests for task critical path at desktop and 390 px;
- accessibility checks and representative query-plan evidence.

## Rollout Plan

Land schema/migration/service/tests before UI. Run migration in disposable PostgreSQL, then Preview under guarded environment commands. Enable lead-local task UI for one pilot organisation, verify backfill and conflicts, then expand. Preserve legacy fields until release-close evidence supports cleanup in a later PR.

## Documentation Updates

- ADR-0020;
- Release 1.5 Master Specification and sprint plan;
- permission catalogue/role documentation after approval;
- architecture overview and capability map after implementation;
- database operations/migration evidence;
- technical debt register only for accepted compatibility compromises.
