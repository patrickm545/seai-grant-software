# SolarGRANT Pro Workflow Proving Slice

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-3-SOLARGRANT-PRO-WORKFLOW-PROVING-SLICE |
| Status | Specified |
| Owner | Clada Systems Platform and SolarGRANT Pro Engineering |
| Review cycle | Every workflow platform release |
| Last reviewed | 2026-07-10 |

## Summary

Migrate SolarGRANT Pro lead pipeline progression to the reusable workflow service while preserving current user-facing behaviour.

## Problem

Lead pipeline progression is the clearest current workflow, but it is implemented as a product field update. Platform Release 1.3 needs a real product proving slice that uses the platform workflow engine without pulling solar-specific rules into the platform.

## Evidence

- Lead stage changes already have a protected server action.
- Existing integration tests cover permissions and audit for the slice.
- The release objective names the lead pipeline as the proving workflow.

## Product Scope

In scope:

- create a workflow definition for the lead pipeline;
- backfill one workflow instance per existing lead;
- execute lead stage changes through the generic workflow service;
- keep lead activity and `Lead.pipelineStage` projection for current UI;
- keep workflow instance, `Lead.pipelineStage`, workflow history, audit, and activity writes atomic;
- add transition history assertions.

Out of scope:

- redesigning the lead detail UI;
- migrating lead `status` edits into workflow foundation;
- changing SEAI eligibility or grant rules;
- changing customer portal progress behaviour beyond the stage projection remaining current.

## Platform Classification

SolarGRANT Pro module proving slice consuming a Clada OS platform capability.

## User Workflow

An installer dashboard user changes a lead's sales stage. The request reaches the existing server action, which calls the lead workflow adapter. The adapter delegates validation and execution to the workflow service, then writes the lead projection and SolarGRANT Pro activity entry.

## Design Requirements

Existing stage controls should continue to work. The platform service must reject invalid stage values and unauthorised actor contexts server-side.

## Architecture Notes

- The proving slice uses `lead.change_status` as the transition permission.
- Product labels remain in `lib/crm.ts`.
- `Lead.pipelineStage` remains a projection until a later release migrates UI and reporting to workflow instances directly.
- Current broad stage movement behaviour is preserved by seeding a permissive transition graph for valid stage keys.
- `changeLeadPipelineStage` owns an interactive transaction when called with a root Prisma client and passes the transaction client to the workflow service.
- The workflow service updates the workflow instance with a current-stage guard before the adapter writes `Lead.pipelineStage` and `LeadActivity`.
- If a competing transition wins first, the stale request returns `WORKFLOW_TRANSITION_STALE` and creates no successful workflow history, audit event, or activity row.

## Risks

- Keeping the projection field creates drift risk.
- Existing tests that create leads directly need workflow instances or lazy initialization.
- A permissive graph proves the engine mechanics but not a mature operational process model.

## Verification Plan

- valid transition succeeds;
- invalid transition fails;
- same-organisation member without permission fails;
- cross-organisation actor fails;
- audit event is written;
- workflow history is written;
- denied transition leaves lead and workflow instance state unchanged.
- concurrent stale transition creates no successful history or audit record.
- later write failure rolls back lead projection, workflow instance, history, audit, and activity.

## Rollout Plan

Deploy migration and code together. Existing leads gain workflow instances. New lead intake creates or lazily receives an instance before its first transition.

## Documentation Updates

- SolarGRANT Pro module document;
- sprint document;
- capability map;
- technical debt register.
