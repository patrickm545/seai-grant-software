# Workflow History

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-3-WORKFLOW-HISTORY |
| Status | Specified |
| Owner | Clada Systems Platform Engineering |
| Review cycle | Every workflow platform release |
| Last reviewed | 2026-07-10 |

## Summary

Record reusable workflow transition history for executed workflow transitions. History must include workflow instance, previous stage, next stage, actor, organisation, timestamp, metadata, and outcome.

## Problem

SolarGRANT Pro has `LeadActivity` and `AuditLog`, but there is no product-neutral workflow history. Lead activity is useful for product timeline display, while audit supports trust and compliance. Workflow history needs to represent reusable state changes without duplicating either model's purpose.

## Evidence

- `LeadActivity` currently records "Pipeline stage changed" for lead timelines.
- `AuditLog` records actor-aware events.
- Future workflow reporting needs transition history independent of SolarGRANT Pro lead activity.

## Product Scope

In scope:

- workflow history table;
- previous and next stage references and immutable stage keys;
- composite workflow definition and organisation constraints for history references;
- actor type, user, membership, and organisation attribution;
- metadata and outcome;
- optional link to the audit event written for the same transition.

Out of scope:

- full event sourcing;
- replaying workflow state from history;
- replacing product activity timelines;
- fabricating history from existing `Lead.pipelineStage` values.

## Platform Classification

Clada OS platform capability supported by the audit event shared service.

## User Workflow

When a transition executes successfully, the workflow service writes one history entry and one audit event in the same transaction.

## Design Requirements

History should support operational review and future reporting. It should not expose sensitive raw documents, tokens, secrets, or provider payloads in metadata.

## Architecture Notes

- `WorkflowHistory` records workflow facts.
- `AuditLog` records broader trust and compliance facts.
- `LeadActivity` remains a product timeline for SolarGRANT Pro.
- The first release records successful transition history only; denied attempts are asserted through no-mutation tests and audit strategy can be expanded later if needed.
- `WorkflowHistory.workflowInstanceId`, `workflowDefinitionId`, and `organisationId` must match the owning workflow instance.
- Transition and stage foreign keys include `workflowDefinitionId` so a history row cannot point at a transition or stage from a different definition.
- `previousStageKey` and `nextStageKey` remain denormalised service-written strings; they are not database-checked against the referenced stage key because they preserve execution-time context.

## Risks

- Duplicating too much audit data could confuse support users.
- Linking history to audit requires the audit writer to return the created audit row.
- Metadata can leak sensitive data if callers bypass sanitisation.
- Denied-attempt history remains deferred until the platform defines whether rejected requests should be durable workflow facts or audit-only records.

## Verification Plan

- Unit tests for history metadata construction where applicable.
- PostgreSQL integration tests that successful lead transitions create workflow history and audit records, stale transitions create none, and contradictory history references are rejected.
- Metadata sanitisation remains covered by audit tests.

## Rollout Plan

Add history as an additive table. Do not backfill historical rows. Begin recording history for new stage transitions after deployment.

## Documentation Updates

- ADR-0013;
- architecture overview;
- technical debt register for any denied-attempt history limitations.
