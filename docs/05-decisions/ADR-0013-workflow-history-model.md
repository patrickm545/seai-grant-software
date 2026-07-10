# ADR-0013: Workflow History Model

| Field | Value |
| --- | --- |
| Document ID | ADR-0013 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When audit, reporting, or workflow history requirements expand |
| Last reviewed | 2026-07-10 |

## Context

Platform Release 1.2 introduced actor-aware audit. SolarGRANT Pro also has lead activity timelines. Workflow Foundation needs transition history without duplicating either model's full responsibility.

## Decision

Create `WorkflowHistory` as a product-neutral transition history table. It records workflow instance, previous stage, next stage, actor, organisation, timestamp, metadata, outcome, and an optional link to the audit event for the same transition.

Do not fabricate history for existing lead stages during migration.

## Rationale

Workflow history is a platform fact useful for workflow review and future reporting. Audit remains the trust and compliance record. Product activity remains a user-facing module timeline.

## Consequences

Improves:

- workflow transitions can be reported without reading SolarGRANT Pro activity rows;
- audit and workflow history can be correlated;
- historical lead pipeline state is preserved without invented transition events.

Becomes harder:

- successful transitions write two related records;
- history and audit metadata must remain aligned;
- product timelines still need their own activity rows for UI language.

## Alternatives Considered

- Use only `AuditLog`: rejected because audit includes more than workflow and is not a clean source for workflow reporting.
- Use only `LeadActivity`: rejected because it is product-specific.
- Backfill history from current lead stages: rejected because it would fabricate transition events that did not exist.

## Follow-Up

- Return created audit rows from the audit writer.
- Add integration tests for history and audit creation.
- Document any denied-attempt history limitations.
