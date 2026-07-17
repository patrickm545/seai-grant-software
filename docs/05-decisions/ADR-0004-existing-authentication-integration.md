# ADR-0004: Adapt Existing Admin Authentication Into Identity Context

| Field | Value |
| --- | --- |
| Document ID | ADR-0004 |
| Status | Superseded by ADR-0018 |
| Owner | Clada Systems Engineering |
| Review cycle | Before replacing authentication |
| Last reviewed | 2026-07-10 |

## Context

The repository currently uses an admin password and signed session cookie. The release objective explicitly excludes full authentication replacement and enterprise SSO, but organisation context still needs a user identity.

## Decision

Keep the existing admin authentication provider for Platform Release 1.1.

Adapt a valid admin session to a default internal Clada user record configured by environment or development defaults. Server-side identity code validates that this user has active membership in the requested organisation before resolving active organisation context.

## Rationale

This preserves existing product behavior and avoids mixing authentication replacement into the first identity foundation. It also creates a clear integration boundary so a future provider can map authenticated identities into the same `User` and membership model.

## Consequences

Improves:

- reduced release scope;
- stable current admin login behavior;
- a provider-neutral path for future auth work.

Becomes harder:

- multiple human admins cannot be distinguished until authentication is upgraded;
- audit actor strings remain approximate until Platform Release 1.2.

## Alternatives Considered

- Replace authentication now: rejected as out of scope and too risky for this release.
- Trust the admin cookie without a user record: rejected because membership validation needs a durable user.
- Use client-supplied user details: rejected because identity must be server-derived.

## Follow-Up

- Document the adapter in the identity feature spec.
- Ensure route handlers and server actions re-check context server side.
- Plan user-provider mapping in Platform Release 1.2 or a future authentication release.
