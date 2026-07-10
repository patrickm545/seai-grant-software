# Platform Permission Model

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-2-PERMISSIONS |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Create a reusable permission catalogue and role-to-permission mapping for server-side authorisation.

Permissions describe actions on resource families. They are the unit of enforcement.

## Problem

Organisation context proves where an actor belongs, not what they are allowed to do. Protected workflows need explicit permissions so future modules can share access-control rules without copying SolarGRANT Pro assumptions.

## Evidence

- Lead reads and writes are tenant-scoped but not permission-scoped.
- The stage-change workflow mutates operational state with customer implications.
- Platform Release 1.2 requires default-deny permission evaluation.

## Product Scope

In scope:

- explicit permission catalogue;
- role-to-permission mapping;
- permission naming rules;
- effective permission resolution;
- default-deny behaviour;
- tests for catalogue and mapping integrity.

Out of scope:

- custom permission builders;
- policy scripting;
- ABAC;
- billing permissions;
- marketplace or public SDK permissions.

## Platform Classification

Clada OS platform capability.

SolarGRANT Pro consumes permissions such as `lead.change_status`, but the platform owns the permission naming and evaluation contract.

## Users And Actors

Human users receive effective permissions from their active membership role. System and service actors receive only explicitly assigned runtime permissions.

## Functional Requirements

- Permissions use lower-case dotted action names.
- Resource family comes first, followed by an action, for example `lead.change_status`.
- Role mappings are defined in code and tested.
- Permission checks fail closed for missing actor, missing membership, inactive context, unknown permission, or unmapped role.
- Service and system actors do not implicitly inherit human permissions.

## Security Requirements

- Client-supplied permission values are never authoritative.
- Internal administrative exceptions must use explicit permissions.
- Permission checks must happen server side before protected mutations.
- Cross-tenant resource ownership checks remain separate from action permission checks.

## Data Requirements

No separate permission table is required in this release. The catalogue is code-defined so the first platform boundary remains small and reviewable.

## API Or Service Boundaries

The permission service exposes:

- get effective permissions;
- check a permission;
- require a permission;
- test whether a permission belongs to the catalogue.

## Failure Behaviour

Default-deny errors should not reveal whether another organisation's record exists.

## Testing Requirements

- catalogue has no duplicate permissions;
- role mappings contain only known permissions;
- inactive context returns no permissions;
- missing permission throws an authorisation error;
- client-supplied permission values cannot bypass persisted role mapping.

## Migration Considerations

No permission rows are migrated. The membership-role migration provides the data needed for permission resolution.

## Acceptance Criteria

- permission catalogue and role mapping exist;
- permission evaluation is unit tested;
- proving-slice mutation calls `requirePermission`;
- docs define naming, ownership, default-deny, service/system actor, and future extension rules.
