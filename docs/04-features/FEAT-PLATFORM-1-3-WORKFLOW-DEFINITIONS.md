# Workflow Definitions

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-3-WORKFLOW-DEFINITIONS |
| Status | Specified |
| Owner | Clada Systems Platform Engineering |
| Review cycle | Every workflow platform release |
| Last reviewed | 2026-07-10 |

## Summary

Persist workflow definitions, stages, and transitions so Clada OS can validate workflow state server-side.

## Problem

The current lead pipeline stage list is an enum and helper array. It cannot describe allowed transitions, required transition permissions, terminal states, or reusable platform workflow contracts.

## Evidence

- `LeadPipelineStage` exists as a product enum.
- `lib/crm.ts` owns SolarGRANT Pro stage metadata.
- `lib/lead-workflow.ts` checks enum membership but not a data-backed transition definition.

## Product Scope

In scope:

- workflow definition key and label;
- ordered stages;
- initial and terminal stage markers;
- allowed transitions between stages;
- transition-level required permission;
- metadata fields for future display and migration context.

Out of scope:

- customer-editable definitions;
- runtime scripting;
- branching conditions;
- dynamic forms;
- version promotion UI.

## Platform Classification

Clada OS platform capability.

Definitions are the reusable contract that product modules consume.

## User Workflow

Platform engineers define a workflow in migration-controlled data. Product services request transitions by definition key and stage key. The workflow service validates the request against persisted definitions.

## Design Requirements

Definitions should be simple, inspectable, and deterministic in migrations. They should not require a new administration UI in this release.

## Architecture Notes

- The first definition key is `solargrant.lead_pipeline`.
- Stage keys mirror current `LeadPipelineStage` values for safe migration.
- Transition permissions use existing platform permission names.
- The persisted graph is permissive for the first proving slice to preserve current operational behaviour.

## Risks

- Definition data can become stale if product enums change without migration.
- Too many metadata fields would overfit future needs.
- Too few integrity checks could allow invalid definitions.

## Verification Plan

- Unit tests for duplicate stages, missing initial stages, missing transition endpoints, and unknown permissions.
- Migration SQL tests for table creation and initial workflow seed data.
- Prisma validation and generate.

## Rollout Plan

Create the workflow definition and stage graph in the Platform Release 1.3 migration. Do not expose definition editing.

## Documentation Updates

- sprint document;
- ADR-0011;
- ADR-0012;
- platform capability map;
- technical debt register if definition/UI drift remains.
