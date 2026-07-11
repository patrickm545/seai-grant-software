# Transition Validation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-3-TRANSITION-VALIDATION |
| Status | Specified |
| Owner | Clada Systems Platform Engineering |
| Review cycle | Every workflow platform release |
| Last reviewed | 2026-07-10 |

## Summary

Validate requested workflow transitions server-side using the current workflow instance stage, requested next stage, persisted transition definition, required permission, organisation ownership, and audit context.

## Problem

Clients can currently submit a stage value, and the server verifies only that it belongs to the lead pipeline enum. The platform does not yet enforce explicit allowed transitions or reusable workflow permissions.

## Evidence

- Platform Release 1.2 introduced permission checks for lead stage changes.
- No `WorkflowTransition` model exists yet.
- The roadmap requires Workflow Foundation before document, notification, and reporting foundations.

## Product Scope

In scope:

- load workflow instance by organisation context;
- reject unknown requested stages;
- reject inactive or missing transition definitions;
- evaluate transition-required permission through `requirePermission`;
- update state only after validation passes;
- guard the update against concurrent stale transitions;
- reject stale transitions with typed workflow execution errors;
- return typed errors for invalid workflow requests;
- preserve unchanged state when validation fails.

Out of scope:

- field-level conditional validation;
- customer-defined transition rules;
- dynamic policy language;
- automated workflow actions.

## Platform Classification

Clada OS platform capability with existing permissions shared service support.

## User Workflow

An actor submits a requested next stage. The server decides whether the transition is valid. The client never decides validity.

## Design Requirements

Errors should be safe and operationally useful. Cross-organisation denial should not reveal another organisation's data.

## Architecture Notes

- The workflow service owns transition validation.
- Product adapters may own resource-specific side effects.
- Permissions remain server-side and role-derived; client-supplied permission values are ignored.
- Denied transitions must not mutate workflow instance state, lead projection state, history, or product activity.
- Transition execution requires `Prisma.TransactionClient`; callers must either own an interactive transaction or use an adapter that owns one.
- The service performs an optimistic conditional update matching workflow instance id, workflow definition id, organisation id, and the current stage observed during validation.
- The service verifies exactly one workflow instance row was updated before invoking product side effects.
- A stale transition throws `WORKFLOW_TRANSITION_STALE` before product projection, workflow history, audit, or product activity writes.

## Risks

- If validation happens after product side effects, denied requests could partially mutate state.
- If callers bypass the transaction boundary, workflow state and product projection could become inconsistent.
- If transition definitions are too permissive, the graph proves less operational constraint.
- If definitions are too restrictive, the release could remove existing workflow behaviour.

## Verification Plan

- Unit tests for allowed and rejected transitions.
- Unit tests for permission validation.
- PostgreSQL integration tests for valid, invalid, unauthorised, cross-organisation, unchanged denied, concurrent stale, and rollback transitions.

## Rollout Plan

Start with the SolarGRANT Pro lead pipeline service. Keep transition execution behind the existing server action and service boundary.

## Documentation Updates

- ADR-0012;
- sprint validation results;
- security review notes.
