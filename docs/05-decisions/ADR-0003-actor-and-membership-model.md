# ADR-0003: Minimal Actor And Membership Model

| Field | Value |
| --- | --- |
| Document ID | ADR-0003 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before Platform Release 1.2 |
| Last reviewed | 2026-07-10 |

## Context

The current application authenticates an admin session but does not persist users or membership. Platform Release 1.1 needs enough identity structure to validate organisation context without building the full roles, permissions, and audit foundation planned for Platform Release 1.2.

## Decision

Add a minimal `User` model and `OrganisationMembership` model.

For this release:

- authenticated user means the human identity mapped from the existing admin authentication adapter;
- human actor means a runtime action context derived from a user;
- system actor means platform code acting without a human user, such as seed or scoring behavior;
- service actor means a future non-human integration actor, documented but not fully credentialed in this release;
- organisation member means a user with an active membership in an organisation.

Do not add complex roles or permissions yet. Membership includes an ownership marker only so organisation ownership can be represented without implementing Platform Release 1.2 access control.

## Rationale

Tenant scoping requires a durable user-to-organisation relationship. A minimal model allows server-side membership validation now and leaves room for richer roles and audit later.

## Consequences

Improves:

- server-side validation of active organisation context;
- future user, role, permission, and audit foundations;
- clarity between authentication and organisation ownership.

Becomes harder:

- the existing admin login must be adapted to a default user record;
- membership must not be mistaken for full authorization.

## Alternatives Considered

- Keep identity entirely implicit: rejected because tenant validation would be weak.
- Build full RBAC now: rejected as out of scope for Platform Release 1.1.
- Create an actor table now: deferred until audit requirements are fully specified in Platform Release 1.2.

## Follow-Up

- Add tests for membership validation.
- Upgrade audit actor storage in Platform Release 1.2.
- Replace the default admin-user adapter when a full auth provider is introduced.
