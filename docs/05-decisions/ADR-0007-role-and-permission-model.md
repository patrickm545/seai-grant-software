# ADR-0007: Platform Role and Permission Model

| Field | Value |
| --- | --- |
| Document ID | ADR-0007 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When role or permission model changes |
| Last reviewed | 2026-07-10 |

## Context

Platform Release 1.1 can resolve user membership in an organisation, but membership does not say which actions are allowed. Platform Release 1.2 needs reusable authorisation without overbuilding custom roles or policy scripting.

## Decision

Use platform-defined roles on organisation memberships and a code-defined permission catalogue.

Roles are:

- `ORGANISATION_OWNER`
- `ORGANISATION_ADMIN`
- `ORGANISATION_MEMBER`
- `CLADA_INTERNAL_ADMIN`
- `CLADA_INTERNAL_SUPPORT`
- `SERVICE_ACTOR`
- `SYSTEM_ACTOR`

Permissions are lower-case dotted action names, for example `lead.change_status`.

Permissions, not role names, are the enforcement unit. Roles map to permissions in server-side platform code. Custom roles are deferred.

## Rationale

This is the smallest model that supports the current multi-user security need and future module consumption. It keeps authorisation reviewable, avoids speculative custom role infrastructure, and prevents SolarGRANT Pro terms from becoming generic platform concepts.

## Consequences

Improves:

- explicit server-side permission checks;
- reviewable role-to-permission mapping;
- migration path from `isOwner`;
- product-neutral platform access rules.

Becomes harder:

- permissions must be named deliberately;
- membership migration must assign safe initial roles;
- future custom roles will require a new ADR and migration plan.

## Alternatives Considered

- Keep only `isOwner`: rejected because it cannot express limited members or support users.
- Store every permission assignment in the database now: deferred because custom roles and permission administration are out of scope.
- Use role-name checks throughout application code: rejected because it couples business logic to grouping names.
- Implement ABAC or policy scripts: rejected as excessive for Platform Release 1.2.

## Follow-Up

- Add `OrganisationMembership.role`.
- Add permission catalogue tests.
- Document future extension rules.
- Reassess custom roles only after real multi-user administration exists.
