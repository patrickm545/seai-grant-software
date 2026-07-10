# ADR-0012: Workflow Transition Validation Boundary

| Field | Value |
| --- | --- |
| Document ID | ADR-0012 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When workflow execution rules change |
| Last reviewed | 2026-07-10 |

## Context

Client requests must not decide whether a workflow transition is valid. The server must verify the current stage, requested next stage, transition definition, required permission, organisation ownership, and audit attribution before mutation.

## Decision

Workflow transition validation lives in the reusable workflow service. Product adapters may prepare resource-specific context and apply resource-specific side effects, but they do not decide whether a transition is allowed.

The workflow service validates before product mutations and writes history and audit only after successful execution.

## Rationale

Central validation prevents repeated transition logic across modules and protects against client tampering. Keeping product side effects outside the generic service prevents SolarGRANT Pro details from becoming platform rules.

## Consequences

Improves:

- server-side transition checks are reusable and testable;
- permission enforcement is consistent with Platform Release 1.2;
- denied transitions leave state unchanged.

Becomes harder:

- product adapters need a narrow integration point for side effects;
- denied-attempt audit strategy must be handled carefully so rollback does not erase intentional audit writes;
- transition graph changes require migration discipline.

## Alternatives Considered

- Let each product service validate transitions: rejected because it duplicates workflow logic.
- Let the client disable invalid controls only: rejected because client state is not authoritative.
- Put SolarGRANT Pro stage rules in the generic workflow service: rejected because it couples platform to the first module.

## Follow-Up

- Add unit tests for validation.
- Add PostgreSQL tests for denied no-mutation behaviour.
- Reassess denied-attempt audit persistence in a future hardening release.
