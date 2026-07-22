# ADR-0020: Organisation-Owned Work Items And Lead Task Proving Slice

| Field | Value |
| --- | --- |
| Document ID | ADR-0020 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When task, collaboration, assignment, or automation boundaries change |
| Last reviewed | 2026-07-22 |

## Context

Platform Release 1.5 requires a minimum task-management foundation so installers can record, assign, due-date, complete, reopen, and cancel work from a lead workspace.

The current `Lead` record has `followUpDate`, `nextFollowUpAt`, and string assignee fields. Those fields can represent one next follow-up but cannot safely represent multiple work items, durable completion state, assignment to an organisation membership, concurrent updates, or future collaboration. `LeadActivity` records product-readable events, and `AuditLog` records trust/compliance facts; neither is a mutable work queue.

Introducing a reusable task record affects platform ownership, tenancy, lifecycle, assignment, concurrency, audit, migration, and product dependency direction. It therefore requires an ADR.

## Decision

Create a small product-neutral Clada OS work-item foundation. Use a SolarGRANT Pro lead task as its Release 1.5 proving slice.

The illustrative model name is `WorkItem`; the implementation feature specification may approve an equally explicit product-neutral name without changing this decision.

Each work item must contain:

- a stable opaque identifier;
- mandatory `organisationId` ownership;
- a product-neutral `resourceType` and `resourceId` link;
- bounded title and optional description;
- lifecycle status limited initially to `OPEN`, `COMPLETED`, and `CANCELLED`;
- optional bounded priority;
- optional UTC due timestamp;
- optional assignee membership;
- creator and completion actor attribution where applicable;
- completion/cancellation timestamps;
- created/updated timestamps;
- an optimistic-concurrency version or equivalent current-state guard.

Release 1.5 permits only `resourceType = lead` through the SolarGRANT Pro adapter. A service must verify that the referenced lead belongs to the trusted organisation before creation or mutation. Generic resource links do not make arbitrary resource types valid automatically.

Assignment is to `OrganisationMembership`, not to the legacy lead assignee strings. The assignee must be active and belong to the same organisation at assignment time. Work remains visible as historical organisation data if a membership later becomes inactive; reassignment rules belong to the service and product UI.

Normal product behaviour does not hard-delete work items. Completion, reopen, and cancellation are explicit lifecycle mutations. Audit records and SolarGRANT Pro activity projections record material successful mutations, but neither replaces the work-item record.

The work-item service owns permission, organisation, resource, membership, lifecycle, concurrency, and transaction checks. SolarGRANT Pro owns task wording, placement, default copy, product activity descriptions, and lead-local user experience.

Existing `Lead.followUpDate` and `Lead.nextFollowUpAt` remain compatibility fields during Release 1.5. An additive, idempotent migration creates at most one open follow-up work item per eligible lead without fabricating past completions. Temporary dual writes are allowed only if transaction-bound, documented, tested, and scheduled for removal after all consumers use work items.

## Invariants

1. Every work item belongs to exactly one organisation.
2. Every permitted resource and assignee belongs to that same organisation.
3. Client-provided tenant or actor context is never authoritative.
4. A completed work item has a completion timestamp; an open work item does not.
5. A cancelled work item has a cancellation timestamp and cannot be completed without an explicit reopen.
6. Stale concurrent mutations do not overwrite newer state.
7. A failed mutation creates no successful audit or product activity record.
8. Note bodies, customer data, and task descriptions are not copied into audit metadata.
9. Work items are not workflow instances; task lifecycle does not extend the Workflow Foundation.
10. Work items are not notifications; due dates do not imply reminder delivery.

## Rationale

- A structured record is the minimum credible foundation for multiple tasks, assignment, due work, and completion.
- Organisation ownership and membership-backed assignment reuse the accepted tenant and identity model.
- A generic resource link supports future contractor workflows while the allowlisted lead proving slice prevents speculative abstraction.
- A small lifecycle satisfies pilot needs without creating another configurable workflow engine.
- Optimistic concurrency prevents silent lost updates in shared operational work.
- Keeping tasks separate from activities, audit, and workflow preserves the accepted responsibility of each domain.
- Compatibility fields make migration and rollback safer without treating legacy strings as the future assignment model.

## Consequences

Positive consequences:

- installers can manage more than one explicit piece of work per lead;
- due, overdue, assigned, and completed work becomes queryable;
- future modules can reuse a narrow task contract after another approved proving slice;
- task changes can be tenant-safe, permission-aware, auditable, and conflict-safe;
- future notifications and collaboration have a stable work-item identifier to reference.

Costs and constraints:

- Release 1.5 requires an additive migration, backfill, new permissions, integration tests, and operational rollout evidence;
- temporary compatibility with lead follow-up fields may require dual-write discipline;
- generic resource identifiers require strict allowlisting and service validation because a database foreign key cannot target every resource table;
- no hard delete means privacy/retention policy must eventually define work-item erasure and legal-hold behaviour;
- task automation, recurring work, dependencies, comments, mentions, and cross-resource work remain deferred.

## Security, Privacy, And Tenant Rules

- All reads and mutations require trusted organisation context and explicit permission.
- Resource and membership ownership is validated server side.
- Database composite constraints enforce membership/organisation consistency where practical.
- Cross-tenant valid identifiers receive safe denial without existence disclosure.
- Audit metadata is allowlisted and excludes task descriptions, note content, and customer facts.
- Work-item content uses explicit length limits, plain-text rendering, and output escaping.
- Internal access remains governed by ADR-0010.
- Retention, export, erasure, and legal-hold treatment must be added to the commercial privacy/records policy before scale.

## Transactions And Concurrency

- The work-item mutation, actor attribution, audit event, and any SolarGRANT Pro activity projection commit in one transaction.
- Updates use a version/current-state condition. Zero updated rows after a valid lookup means conflict, not success.
- Competing completion requests produce at most one successful completion event.
- Backfill uses a deterministic identity or unique migration marker so reruns create no duplicates.
- List/read operations use tenant-scoped indexes and do not hold transactions across UI rendering.

## Alternatives Considered

### Continue using one follow-up date on Lead

Rejected. It cannot represent multiple tasks, membership assignment, lifecycle evidence, or safe concurrent collaboration.

### Store tasks as LeadActivity entries

Rejected. Activities are append-only product timeline events, not current mutable work state. Querying open work from event prose would be fragile and would blur UI history with operational state.

### Model every task as a WorkflowInstance

Rejected. The Workflow Foundation models business process progression through defined stages and transitions. A small task lifecycle does not justify one workflow definition/instance per task and would overcomplicate pilot work.

### Create a SolarGRANT Pro LeadTask table

Rejected. Ownership, assignment, due work, status, concurrency, and audit are credible reusable platform mechanics. Solar-specific wording stays in the adapter and UI.

### Adopt a full project-management model now

Rejected. Projects, subtasks, dependencies, recurrence, labels, time estimates, boards, and automation are not required for the pilot and would violate incremental evolution.

## Migration And Rollback

- Add work-item tables, enums, constraints, and indexes without altering existing lead rows.
- Backfill one open follow-up task from the canonical future/overdue lead follow-up timestamp using an idempotent rule.
- Preserve legacy follow-up fields during Release 1.5.
- Do not fabricate completed tasks or historical task activity.
- Application rollback may ignore additive work-item tables and continue reading legacy fields.
- Do not drop work-item data after pilot writes; forward-fix or disable the surface if rollback is required.

## Follow-Up

1. CTO accepted this ADR on 2026-07-22; schema implementation has not begun.
2. The Task Management Foundation feature specification locks exact names, field lengths, priority values, permission mapping, backfill identity, and error contracts.
3. Implementation adds schema, migration, service, permissions, audit/activity integration, tests, and deployment evidence in a focused PR.
4. Remove any temporary follow-up dual write only after readers and operational reports consume work items.
5. Create future ADRs before adding task automation, recurring work, dependency graphs, cross-organisation work, customer visibility, or collaboration semantics.

## Related Documents

- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Task Management Foundation](../04-features/FEAT-PLATFORM-1-5-TASK-MANAGEMENT-FOUNDATION.md)
- [ADR-0002](ADR-0002-organisation-tenant-model.md)
- [ADR-0003](ADR-0003-actor-and-membership-model.md)
- [ADR-0005](ADR-0005-tenant-aware-data-access.md)
- [ADR-0008](ADR-0008-authorisation-enforcement-boundary.md)
- [ADR-0009](ADR-0009-actor-aware-audit-model.md)
- [ADR-0011](ADR-0011-workflow-foundation-architecture.md)
