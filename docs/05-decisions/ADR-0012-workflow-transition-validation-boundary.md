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

Transition execution requires an active `Prisma.TransactionClient`. The SolarGRANT Pro lead adapter owns the transaction when called with a root `PrismaClient`, or participates in the caller's transaction when a transaction client is supplied.

Concurrency is protected with an optimistic conditional update. The workflow service updates the instance only when the persisted `currentStageId`, `workflowDefinitionId`, and `organisationId` still match the stage and context used during validation. Exactly one row must be updated. If no row is updated, execution fails with typed `WORKFLOW_TRANSITION_STALE` and product projection, workflow history, audit, and product activity writes are not performed.

## Rationale

Central validation prevents repeated transition logic across modules and protects against client tampering. Keeping product side effects outside the generic service prevents SolarGRANT Pro details from becoming platform rules.

The transaction-client boundary prevents a generic transition call from silently writing workflow state separately from product projection, workflow history, audit, or product activity.

## Consequences

Improves:

- server-side transition checks are reusable and testable;
- permission enforcement is consistent with Platform Release 1.2;
- denied transitions leave state unchanged;
- concurrent transitions from the same original stage cannot both succeed;
- stale transitions are operationally typed and leave no successful history or audit trail.

Becomes harder:

- product adapters need a narrow integration point for side effects;
- denied-attempt audit strategy must be handled carefully so rollback does not erase intentional audit writes;
- workflow transition callers must operate inside an interactive transaction;
- transition graph changes require migration discipline.

## Alternatives Considered

- Let each product service validate transitions: rejected because it duplicates workflow logic.
- Let the client disable invalid controls only: rejected because client state is not authoritative.
- Put SolarGRANT Pro stage rules in the generic workflow service: rejected because it couples platform to the first module.

## Follow-Up

- Add unit tests for validation.
- Add PostgreSQL tests for denied no-mutation behaviour and stale transition races.
- Reassess denied-attempt audit persistence in a future hardening release.
