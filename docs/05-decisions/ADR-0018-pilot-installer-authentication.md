# ADR-0018: Database-Backed Pilot Installer Authentication

| Field | Value |
| --- | --- |
| Document ID | ADR-0018 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Last reviewed | 2026-07-16 |

## Context

ADR-0004 deliberately retained a shared admin password as a temporary identity adapter. The SolarGRANT Pro pilot now requires distinct human users, verified installer organisations, refresh-safe sessions, immediate logout invalidation, and server-derived tenant context for 5–10 installer customers.

## Decision

Extend the existing Prisma `User`, `Organisation`, and `OrganisationMembership` foundation. Store Argon2id password hashes on users and opaque session-token hashes in a database-backed `AuthSession`. Enforce one membership per user in PostgreSQL. Resolve every authenticated installer request through `requirePilotContext()` and reject any user or organisation that is inactive, invalid, or unverified.

Administrative provisioning is the only account-creation path. Existing platform roles are retained and presented as the pilot labels Owner, Admin, and Sales.

## Consequences

Logout can invalidate the active session, account and organisation state is checked on every trusted request, and tenant selection is not delegated to the browser. The implementation adds one native Argon2 dependency and database session cleanup will be needed operationally over time.

Public signup, invitations, password reset, MFA, SSO, organisation switching, and a broad identity platform remain deferred.

## Supersedes

This decision supersedes ADR-0004 for installer authentication. The durable user, membership, authorisation, and tenant decisions in ADR-0002, ADR-0003, ADR-0005, ADR-0007, and ADR-0008 remain active.
