# ADR-0009: Actor-Aware Audit Model

| Field | Value |
| --- | --- |
| Document ID | ADR-0009 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When audit model changes |
| Last reviewed | 2026-07-10 |

## Context

Existing audit and lead activity records use string actor fields. That is not enough for multi-user authorisation, support review, GDPR accountability, or future platform capabilities.

## Decision

Add typed audit attribution to `AuditLog` while preserving legacy string fields during a compatibility period.

Audit events may record:

- actor type;
- user ID;
- membership ID;
- organisation ID;
- action;
- resource type;
- resource ID;
- source;
- outcome;
- timestamp;
- non-sensitive metadata.

Actor types are human user, system, service, and public token. Existing string actor fields remain readable and populated by compatibility writes.

## Rationale

Typed audit events give the platform enough traceability without introducing event sourcing or an analytics warehouse. Keeping legacy fields avoids unsafe historical data loss and allows incremental call-site migration.

## Consequences

Improves:

- answerability for who acted and under which organisation;
- audit ownership for protected resources;
- future reporting and support workflows;
- privacy review of metadata.

Becomes harder:

- audit writers must receive actor context;
- legacy rows may have partial typed attribution;
- UI must tolerate both legacy and typed records.

## Alternatives Considered

- Replace `AuditLog` entirely: rejected because historical records should be preserved safely.
- Store only JSON metadata: rejected because important query fields need first-class columns.
- Add an event-sourcing system now: rejected as out of scope.
- Force public token users into memberships: rejected because public portal access is token-scoped and not authenticated organisation membership.

## Follow-Up

- Add typed audit columns and indexes.
- Backfill best-effort typed values for existing rows.
- Add typed audit writer and metadata sanitisation.
- Document remaining compatibility debt until all legacy writes migrate.
