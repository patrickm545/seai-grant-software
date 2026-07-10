# ADR-0011: Workflow Foundation Architecture

| Field | Value |
| --- | --- |
| Document ID | ADR-0011 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When workflow capabilities expand |
| Last reviewed | 2026-07-10 |

## Context

Clada OS needs reusable workflow mechanics after identity, permissions, and audit foundations. The current SolarGRANT Pro lead pipeline stores state directly on `Lead.pipelineStage` and has no persisted workflow definition, instance, transition, or history model.

## Decision

Introduce a small persisted workflow foundation made of `WorkflowDefinition`, `WorkflowStage`, `WorkflowTransition`, `WorkflowInstance`, and `WorkflowHistory`.

The workflow service remains an in-process platform service. It is not a standalone service or BPMN engine.

## Rationale

This model is large enough to prove reusable workflow state and transition execution while staying smaller than a general workflow automation system.

Definitions and transitions must be persisted so validation is server-side and data-backed. Instances connect organisation-owned resources to a current stage. History records executed transitions for platform reporting and review.

## Consequences

Improves:

- workflow mechanics become reusable across future modules;
- transition validation can be tested independently;
- workflow state and history are no longer only product fields;
- SolarGRANT Pro can consume platform workflow contracts.

Becomes harder:

- product projections such as `Lead.pipelineStage` must stay in sync during the compatibility period;
- seed and migration data must keep definition keys aligned with product adapters;
- future workflow features must resist pressure to become automation scripting too early.

## Alternatives Considered

- Keep only `Lead.pipelineStage`: rejected because it does not create a platform capability.
- Add only a transition history table: rejected because it would record changes without giving a reusable validation model.
- Adopt BPMN or a workflow library: rejected as too broad for the release objective.
- Use event sourcing as the workflow state source: rejected because current platform needs simple state and auditability, not replay.

## Follow-Up

- Implement additive Prisma models and migration.
- Backfill workflow instances for existing leads.
- Keep advanced workflow automation out of scope until later ADRs approve it.
