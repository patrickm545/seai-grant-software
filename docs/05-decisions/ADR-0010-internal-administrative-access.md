# ADR-0010: Internal Administrative Access

| Field | Value |
| --- | --- |
| Document ID | ADR-0010 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When internal access rules change |
| Last reviewed | 2026-07-10 |

## Context

The current app uses one admin password that maps to `user_clada_admin`. Platform Release 1.1 created a Clada internal organisation and installer organisation memberships for this bootstrap user. Platform Release 1.2 must avoid silently granting universal access merely because a user belongs to the Clada internal organisation.

## Decision

Internal administrative access must be explicit, permission-controlled, membership-scoped, and auditable.

For this release:

- `user_clada_admin` receives `CLADA_INTERNAL_ADMIN` in the Clada internal organisation;
- `user_clada_admin` receives `ORGANISATION_ADMIN` in existing installer organisations through the existing bootstrap compatibility membership;
- the internal organisation role alone does not grant access to installer-owned records;
- any future internal override must be represented as an explicit service path or membership-scoped permission and must write audit events.

## Rationale

This preserves current admin usability without creating an invisible superuser rule. It keeps access reviewable and creates a clear path toward real multi-user authentication.

## Consequences

Improves:

- explicit installer-organisation access;
- clearer separation between Clada internal administration and tenant access;
- auditability of protected actions.

Becomes harder:

- support access must be provisioned deliberately;
- future internal override workflows need dedicated design.

## Alternatives Considered

- Grant all Clada internal members universal access: rejected as too broad and hard to audit.
- Remove existing default admin installer memberships immediately: rejected because it would break the current authenticated admin adapter.
- Implement a full support-access workflow now: deferred because invitations, user management, and support tooling are out of scope.

## Follow-Up

- Document bootstrap role assignments in the migration notes.
- Add tests proving internal organisation role alone does not bypass organisation membership.
- Replace bootstrap memberships when real multi-user authentication and administration are implemented.
