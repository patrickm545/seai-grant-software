# Platform Role Foundation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-2-ROLE-FOUNDATION |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Add the smallest reusable platform role foundation needed to group permissions for organisation members, internal staff, service actors, and system actors.

Roles are convenience groupings. Permissions remain the authoritative server-side authorisation mechanism.

## Problem

Platform Release 1.1 can validate membership, but membership alone must not imply access to every action inside an organisation. The platform needs a small role assignment on memberships so effective permissions can be resolved consistently.

## Evidence

- `OrganisationMembership.isOwner` exists but is not a reusable role model.
- Current server actions rely on active organisation context and do not distinguish what the actor may do.
- Architecture Checkpoint 1 identifies users, roles, permissions, and audit as the next security foundation.

## Product Scope

In scope:

- platform-defined role enum;
- role assignment on organisation memberships;
- migration rule for existing memberships;
- compatibility with `isOwner`;
- documentation of internal, service, and system actor behaviour.

Out of scope:

- custom roles;
- user invitations;
- self-service organisation management;
- billing roles;
- workflow, document, AI, notification, or reporting role builders.

## Platform Classification

Clada OS platform capability.

Roles are product-neutral groupings that support authorisation across modules. SolarGRANT Pro may consume these roles but must not define platform role names.

## Users And Actors

- Organisation owner: accountable owner of an organisation.
- Organisation admin: operational administrator for an organisation.
- Organisation member: baseline user with limited read access.
- Clada internal administrator: internal staff role assigned through explicit memberships.
- Clada internal support user: constrained internal support role.
- Service actor: future non-human integration actor.
- System actor: platform code running without a human user.

## Functional Requirements

- Each active membership has one platform role.
- Owner memberships retain `isOwner` for compatibility and receive the owner role.
- Existing installer bootstrap memberships receive a documented admin role.
- Existing internal bootstrap membership receives an internal admin role.
- Application code must not rely on role-name checks for protected actions.

## Security Requirements

- Roles must be resolved server side from persisted memberships.
- Client-supplied role names must be ignored.
- Inactive users, organisations, or memberships must receive no effective role.
- Internal roles must not automatically grant access to installer data without an explicit installer-organisation membership or approved override.

## Data Requirements

- Add `OrganisationMembership.role`.
- Keep `OrganisationMembership.isOwner` during compatibility period.
- Do not fabricate real users during migration.

## API Or Service Boundaries

Role values are read by the permission service. Route handlers and server actions should ask for permissions, not roles.

## Failure Behaviour

Missing or inactive membership fails closed. Unknown role values are invalid at schema level.

## Testing Requirements

- role backfill assumptions;
- owner role mapping;
- internal admin role mapping;
- inactive membership receives no effective permissions through the permission service.

## Migration Considerations

Existing owner memberships become `ORGANISATION_OWNER`. Existing default admin installer memberships become `ORGANISATION_ADMIN`. The default internal membership becomes `CLADA_INTERNAL_ADMIN`. All other active memberships default to `ORGANISATION_MEMBER`.

## Acceptance Criteria

- membership roles exist in schema and generated client;
- migration preserves all existing memberships;
- role-to-permission mapping is documented and tested;
- code paths authorize through permissions rather than role-name checks.
