# Actor and Membership Model

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-1-ACTOR-MEMBERSHIP |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Create the minimum user and organisation membership foundation needed to resolve who is acting and whether they may use an organisation context.

This release intentionally avoids full roles and permissions. Platform Release 1.2 will deepen access control and audit.

## Problem

The current application authenticates an admin session but does not map that session to a durable user, organisation membership, or actor context. Tenant-aware access cannot be enforced safely without a user-to-organisation membership check.

## Evidence

- `lib/admin-auth.ts` validates a signed cookie only.
- `AuditLog.actor` and `LeadActivity.createdByRole` are strings.
- No `User` or membership model exists.
- Platform Release 1.2 depends on this identity foundation for roles, permissions, and audit.

## Product Scope

In scope:

- minimal `User` model;
- organisation membership model;
- active/inactive membership state;
- owner flag for future ownership;
- actor context resolution for human user, service, and system actor concepts;
- default internal admin user for current admin authentication.

Out of scope:

- full permissions;
- invitations;
- password storage or authentication replacement;
- service-account credential management;
- full audit actor foreign keys.

## Platform Classification

Clada OS platform capability.

The model supports future roles, permissions, audit, service actors, and workflow attribution without replacing authentication during this release.

## User Workflow

1. Existing admin login creates the same signed admin cookie.
2. Server-side identity code maps a valid admin session to the configured default internal user.
3. The active organisation context is accepted only if the user has an active membership.
4. System actions such as seed data or lead score calculation may use documented system actor context.

## Design Requirements

No broad UI is required. User and membership administration is explicitly deferred.

## Architecture Notes

- `User` represents an authenticated human identity, not organisation ownership.
- `OrganisationMembership` connects a user to an organisation.
- Actor context is a runtime concept in this release, not a full audit event model.
- Human, system, and service actors are documented so the future audit model has room to grow.

## Risks

- Current admin authentication cannot distinguish multiple real admins.
- A default internal user is acceptable for this release only as an adapter.
- Membership without roles could be mistaken for complete authorization.

## Verification Plan

- Test valid membership context.
- Test missing user context.
- Test missing organisation context.
- Test invalid and inactive membership rejection.
- Test client-supplied organisation IDs cannot bypass membership validation.

## Rollout Plan

Seed one internal Clada user and memberships needed by the current default installer workflow. Later releases can migrate this adapter to real user-auth provider identities.

## Documentation Updates

- Actor model ADR.
- Existing authentication integration ADR.
- Platform Release 1.1 sprint record.
