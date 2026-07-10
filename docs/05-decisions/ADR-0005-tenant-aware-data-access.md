# ADR-0005: Tenant-Aware Data Access Defaults To Denial

| Field | Value |
| --- | --- |
| Document ID | ADR-0005 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When tenant-owned data access changes |
| Last reviewed | 2026-07-10 |

## Context

SolarGRANT Pro lead records include customer personal data. Existing code frequently reads or updates leads by ID. As soon as the application contains multiple installer organisations, direct ID-based access becomes a cross-tenant data exposure risk.

## Decision

Organisation-owned data access must resolve actor and organisation context before reads or writes.

For Platform Release 1.1:

- missing organisation context fails closed;
- invalid membership fails closed;
- lead reads and writes must include `organisationId` scope;
- PostgreSQL must reject a lead whose `installerId` points to an installer in another organisation;
- document and activity access is scoped through the parent lead;
- client-supplied organisation IDs must be validated against server-side membership;
- internal administrative exceptions must be explicit and are not broadly implemented in this release.

## Rationale

Default-deny scoping is the smallest secure pattern that proves tenant boundaries without introducing a full permission engine.

## Consequences

Improves:

- cross-organisation data isolation;
- database-level protection against lead/installer ownership mismatch;
- security reviewability of lead workflows;
- future permission and audit implementation.

Becomes harder:

- route handlers and server actions need explicit context checks;
- direct Prisma access to organisation-owned records must be reviewed.

## Alternatives Considered

- Rely on middleware only: rejected because route handlers and server actions need their own authorization.
- Add database row-level security now: deferred because the app first needs a stable application-level context contract.
- Manually add ad hoc filters everywhere: rejected because security-sensitive behavior should be centralized enough to review.

## Follow-Up

- Add scoped lead access helpers.
- Add database-backed tests that attempt cross-organisation reads, updates, deletes, and mismatched installer ownership.
- Reassess row-level security after the application-level tenant model stabilizes.
