# Authorisation Service and Enforcement

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-2-AUTHORISATION |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Add reusable server-side authorisation helpers that combine actor context, organisation context, effective permissions, and resource ownership checks.

Tenant isolation and action permission are separate checks, and both must pass.

## Problem

Release 1.1 scopes lead access to an organisation, but protected actions still need explicit permission checks at service boundaries. Middleware and UI hiding are not security controls.

## Evidence

- Server actions can mutate lead stage, status, notes, documents, portal tokens, and quote pricing.
- Existing route handlers and server actions resolve organisation context but do not ask for permissions.
- Architecture Checkpoint 1 calls out direct Prisma access risks.

## Product Scope

In scope:

- reusable permission assertion helpers;
- organisation-owned lead authorisation helper;
- protected service boundary for the proving slice;
- safe unavailable errors;
- documentation of direct Prisma exceptions.

Out of scope:

- full repository rewrite;
- database row-level security;
- generic policy engine;
- broad UI redesign.

## Platform Classification

Clada OS platform capability with shared-service implementation support.

## Users And Actors

Authenticated organisation members use persisted membership context. Public token actors remain outside this service unless a future token-specific authorisation boundary is added.

## Functional Requirements

- Resolve current actor server side.
- Resolve active organisation and active membership server side.
- Obtain effective permissions from membership role.
- Require a permission before the protected action.
- Confirm the resource belongs to the active organisation.
- Reject unavailable or cross-tenant resources safely.

## Security Requirements

- Do not trust client-supplied IDs beyond lookup inputs.
- Do not trust client-supplied roles, permissions, user IDs, membership IDs, or organisation IDs.
- Missing context and sensitive failures default to denial.
- Permission checks must occur before mutation.
- Resource ownership checks must occur before mutation.

## Data Requirements

The service uses existing organisation ownership fields and new membership roles. No broad resource table is needed for this release.

## API Or Service Boundaries

Initial interfaces:

- `requirePermission(context, permission)`;
- `authorizeLeadAction(db, context, leadId, permission)`;
- `changeLeadPipelineStage({ db, context, leadId, nextStage })`.

## Failure Behaviour

Same-organisation missing permission returns a generic authorisation failure. Cross-organisation or missing record returns unavailable/not found semantics without confirming the target exists elsewhere.

## Testing Requirements

- permitted actor succeeds;
- restricted actor is denied;
- cross-organisation actor is denied;
- unauthenticated or missing context is denied;
- inactive user and membership are denied;
- denied actions do not mutate resources;
- client-supplied permission or organisation values cannot bypass enforcement.

## Migration Considerations

No direct migration is required beyond membership roles. Service adoption is incremental and must start with the proving slice.

## Acceptance Criteria

- proving slice uses service boundary;
- server-side tests cover the boundary;
- public token workflows are documented as separate;
- direct Prisma exceptions remain intentional and reviewed.
