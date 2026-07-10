# ADR-0008: Authorisation Enforcement Boundary

| Field | Value |
| --- | --- |
| Document ID | ADR-0008 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When protected service boundaries change |
| Last reviewed | 2026-07-10 |

## Context

Tenant-scoped helpers prevent cross-organisation lead access, but Platform Release 1.2 must also enforce action permissions. Middleware and UI controls are insufficient because route handlers and server actions can mutate data directly.

## Decision

Protected operations must enforce authorisation at server-side service or repository boundaries.

The enforcement order is:

1. resolve authenticated actor;
2. resolve active organisation and membership;
3. resolve effective permissions;
4. require the action permission;
5. verify resource ownership in the active organisation;
6. perform the mutation;
7. write audit events for material actions.

Direct Prisma access is allowed only for setup, seed, migrations, public token flows, and carefully reviewed read paths. Protected workflow mutations should use platform service helpers.

## Rationale

Separating action permission from tenant ownership keeps the model secure and understandable. It also lets SolarGRANT Pro consume platform access control without turning module code into the permission engine.

## Consequences

Improves:

- default-deny behaviour;
- testable service boundaries;
- safe cross-organisation failure behaviour;
- future reuse by workflow, document, AI, notification, and reporting capabilities.

Becomes harder:

- server actions need thin adapters around service functions;
- direct Prisma paths must stay visible in review;
- public token routes need explicit separate documentation.

## Alternatives Considered

- Rely on middleware: rejected because server actions and APIs need their own checks.
- Put permission checks only in UI: rejected because hidden buttons are not authorisation.
- Add database row-level security now: deferred until the application context and permission model stabilise.
- Rewrite all data access into repositories now: rejected as too broad for the proving slice.

## Follow-Up

- Protect the lead stage-change workflow.
- Add integration tests using real services.
- Review direct Prisma access during each platform release.
- Reassess row-level security after permissions and audit mature.
