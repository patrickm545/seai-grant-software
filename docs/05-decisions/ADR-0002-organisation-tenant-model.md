# ADR-0002: Organisation Is The Initial Tenant Boundary

| Field | Value |
| --- | --- |
| Document ID | ADR-0002 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When identity, billing, or tenancy changes |
| Last reviewed | 2026-07-10 |

## Context

Clada OS needs a reusable way to represent entities operating on the platform. SolarGRANT Pro currently uses `Installer` as the practical owner of lead data, but installer is a module/domain concept rather than a platform tenant boundary.

Future permissions, audit, workflow, documents, notifications, AI, reporting, and billing all need a stable organisation owner.

## Decision

Clada OS will use `Organisation` as the initial tenant boundary and operational owner for organisation-owned records.

In this release:

- an organisation can be `CLADA_INTERNAL` or `INSTALLER`;
- each installer belongs to one organisation;
- each organisation-owned lead belongs to one organisation;
- a lead can reference only an installer owned by the same organisation;
- the organisation is not yet a full billing account, marketplace tenant, or hierarchy node.

## Rationale

This keeps the first platform identity model small while avoiding duplicate terms for the same boundary. Installer remains the SolarGRANT Pro business entity. Organisation becomes the platform owner used for membership and tenant scoping.

## Consequences

Improves:

- explicit tenant boundaries;
- future permission and audit design;
- ability to support more than one installer safely.

Becomes harder:

- code must distinguish `Installer` from `Organisation`;
- migrations must assign an organisation owner to existing data;
- future billing may need a separate account model if commercial ownership diverges.

## Alternatives Considered

- Use `Installer` as the tenant: rejected because it is SolarGRANT Pro-specific.
- Add separate company, account, workspace, and tenant models now: rejected as overbuilt for Platform Release 1.1.
- Treat users as direct owners of records: rejected because contractor workflows are organisation-owned.

## Follow-Up

- Add organisation ownership to installers and leads.
- Enforce installer/lead organisation consistency through the database migration.
- Update feature specs and capability map.
- Revisit commercial account modelling in a future billing release.
