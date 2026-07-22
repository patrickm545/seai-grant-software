# Platform Release 1.5 - Timeline And Activity History

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-TIMELINE |
| Status | Approved |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Platform Release 1.5 and pilot feedback |
| Last reviewed | 2026-07-22 |

## Summary

Provide a chronological, source-aware installer timeline for a lead. The timeline projects existing product activities, workflow transitions, task events, installer notes, and document events without replacing their authoritative source records or exposing the compliance audit log wholesale.

## Problem

Installers need a readable answer to “what happened?” Existing facts are split across product activities, workflow history, document actions, and audit. Simply merging raw tables would duplicate events, expose internal metadata, and confuse operational history with compliance evidence.

## Evidence

- `LeadActivity` already powers product-facing recent activity and lead timelines.
- ADR-0013 explicitly separates product timeline, workflow history, and audit responsibilities.
- ADR-0014 already supports product activity projections in the same transaction as workflow transitions.
- Release 1.5 introduces task and note events that need consistent presentation.

## Product Scope

In scope:

- reverse-chronological timeline with stable pagination;
- allowlisted entry types for intake, note, contact/follow-up, workflow, task, upload/review, generated document, and approved portal events;
- source type, source ID, occurred time, safe actor display, title, description, and optional deep link;
- date grouping, filters by broad event category, truthful empty state, and accessible labels;
- deduplication rule where one transaction writes platform and product records for the same user-visible action.

Out of scope:

- new generic timeline/event-store table;
- event sourcing, replay, editing/deleting history, raw audit-log browser, raw metadata display, communication inbox, real-time streaming, or analytics warehouse;
- fabricating historical entries from current values.

## Platform Classification

SolarGRANT Pro module read projection over platform and product facts. Platform source records retain their accepted ownership.

## User Workflow

1. Installer opens Activity for an owned lead.
2. Timeline shows newest material events first with readable source/category and actor context.
3. Installer filters by All, Workflow, Tasks, Notes, or Documents.
4. Installer follows permitted deep links to the relevant workspace section.
5. Older entries load through a stable cursor without duplicates or reordering.

## Design Requirements

- Use plain operational language and explicit timestamps.
- Distinguish installer, customer/public-token, system, and internal actors only when safe and useful.
- Do not display raw enum names, resource IDs, audit metadata, provider errors, tokens, document content, task descriptions, or customer contact data as metadata.
- Same-action platform and product writes should appear once when a product activity already represents the user-visible event.
- Filters preserve stable URL state and accessible result counts.
- Timeline remains readable at 390 px and at 200% zoom.

## Architecture Notes

- Prefer `LeadActivity` as the canonical SolarGRANT Pro display event when it exists for an action.
- Use `WorkflowHistory` only for workflow facts not already represented or to enrich an allowlisted activity with safe stage context.
- Use task/document records or approved product activities for their user-visible events; `AuditLog` remains compliance evidence and is not a fallback content feed.
- Build an explicit mapper per source with allowlisted fields.
- Stable order uses `(occurredAt desc, sourceType, sourceId)` or an equivalent deterministic cursor.
- Queries require tenant-scoped lead ownership and bounded page size.
- The read projection performs no writes.

## Risks

- Duplicate entries for one transaction.
- Raw audit or metadata disclosure.
- Conflicting timestamps and actor labels.
- Unbounded queries slow lead workspaces.
- Historical gaps are mistaken for fabricated completeness.

Mitigate with source precedence, explicit mappers, safe actor rules, pagination, and truthful copy.

## Acceptance Criteria

- Only events for the organisation-owned lead are returned.
- Stable pagination produces no duplicates or gaps under normal concurrent inserts.
- Workflow, task, note, and document actions use approved product-readable labels.
- Raw audit metadata and sensitive values never reach the client.
- One user-visible action does not appear twice merely because it has activity, history, and audit records.
- Empty and partial-history states are truthful.
- The timeline cannot mutate or delete source records.

## Verification Plan

- unit tests per source mapper, source precedence, ordering, cursor, actor display, filters, and sanitisation;
- integration tests for tenant isolation and transaction-created activity/history/audit combinations;
- fixtures for simultaneous timestamps and malformed/legacy metadata;
- browser tests for pagination/filter state and 390 px/keyboard/zoom behaviour;
- query plan/count evidence with representative pilot history volume.

## Rollout Plan

Start with existing `LeadActivity` plus workflow enrichment, then add task and governed-document event mappings as their approved services land. Do not backfill or invent missing history.

## Documentation Updates

- Release 1.5 Master Specification and sprint plan;
- SolarGRANT Pro module/current-state documentation after implementation;
- audit/activity mapping reference if implementation introduces a durable mapping table in documentation.
