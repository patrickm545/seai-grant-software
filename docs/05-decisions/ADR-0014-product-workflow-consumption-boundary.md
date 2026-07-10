# ADR-0014: Product Workflow Consumption Boundary

| Field | Value |
| --- | --- |
| Document ID | ADR-0014 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When product modules add or migrate workflows |
| Last reviewed | 2026-07-10 |

## Context

SolarGRANT Pro is the first product module and the proof point for Workflow Foundation. The platform must learn from the lead pipeline without absorbing solar-specific business rules.

## Decision

Product modules consume workflow foundation through small adapters. The generic workflow service owns definitions, stages, transitions, instances, validation, history, and audit metadata. Product adapters own product labels, resource-specific projections, and product activity entries.

For Platform Release 1.3, `Lead.pipelineStage` remains a compatibility projection updated only through the lead workflow adapter.

The lead workflow adapter runs projection and `LeadActivity` writes inside the same transaction as workflow instance update, workflow history, and audit event creation. If any later write fails, the projection and workflow instance update roll back together.

## Rationale

This keeps the platform reusable while allowing SolarGRANT Pro to keep current UI and operational language. It also prevents a large UI/reporting migration from obscuring the workflow foundation release.

## Consequences

Improves:

- workflow foundation can be proved through real product usage;
- current SolarGRANT Pro behaviour is preserved;
- product-specific side effects stay out of the platform service;
- the SolarGRANT Pro projection cannot be committed separately from a successful workflow transition through the protected adapter.

Becomes harder:

- projection drift is possible if future code updates `Lead.pipelineStage` directly;
- full UI consumption of `WorkflowInstance` is deferred;
- the first transition graph is intentionally permissive to preserve existing behaviour.

## Alternatives Considered

- Remove `Lead.pipelineStage` immediately: rejected as too risky for current UI, portal progress, reports, and tests.
- Keep workflow entirely product-owned: rejected because it fails the platform release objective.
- Make workflow definitions customer-configurable now: rejected as out of scope and premature before module configuration foundation.

## Follow-Up

- Track projection drift risk in the technical debt register.
- Consider moving UI stage reads to workflow instances after the foundation proves stable.
- Reassess transition strictness after operational usage evidence.
