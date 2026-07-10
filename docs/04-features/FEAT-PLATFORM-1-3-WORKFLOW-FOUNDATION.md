# Workflow Foundation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-3-WORKFLOW-FOUNDATION |
| Status | Specified |
| Owner | Clada Systems Platform Engineering |
| Review cycle | Every workflow platform release |
| Last reviewed | 2026-07-10 |

## Summary

Create the first reusable Clada OS workflow foundation. The platform must represent workflow definitions, stages, transitions, instances, transition execution, history, permission checks, organisation ownership, and audit attribution.

The first consumer is SolarGRANT Pro's lead pipeline. SolarGRANT Pro proves the capability without making the platform depend on solar-specific grant rules.

## Problem

Operational state currently lives directly on product records such as `Lead.pipelineStage`. That makes stage changes easy to render, but it does not give Clada OS reusable transition validation, history, or workflow contracts for future products.

## Evidence

- Platform Release 1.2 protected lead stage changes with permissions and audit.
- The capability map identifies workflow status tracking as a platform capability.
- The roadmap schedules Workflow Foundation immediately after identity, permissions, and audit.
- Current code has product-specific stage helpers and no persisted transition graph.

## Product Scope

In scope:

- reusable workflow model;
- reusable transition execution service;
- database-enforced workflow referential consistency;
- transaction-bound transition execution;
- workflow instance ownership by organisation;
- workflow-aware audit metadata;
- workflow history for executed transitions;
- SolarGRANT Pro lead pipeline proving slice;
- tests and release documentation.

Out of scope:

- BPMN;
- visual workflow builder;
- customer-configurable workflows;
- conditional workflow designer;
- parallel execution;
- timers and SLA engine;
- notification engine;
- document engine;
- AI workflow decisions;
- custom scripting.

## Platform Classification

Clada OS platform capability.

Workflow status tracking is explicitly listed in the capability map and is needed by future document, notification, reporting, and AI governance capabilities.

## User Workflow

1. An authorised actor requests a stage change for an organisation-owned resource.
2. The server loads the workflow instance and definition.
3. The server validates the requested stage and transition.
4. The server evaluates the required permission.
5. The server updates the workflow instance and any product compatibility projection.
6. The server records workflow history and audit attribution.
7. The product UI reflects the new stage.

## Design Requirements

No broad UI redesign is required for this release. Existing SolarGRANT Pro stage controls may remain while their server action consumes the workflow service.

## Architecture Notes

- Workflow definition data is persisted so validation is data-backed, not client-decided.
- Workflow stage, transition, instance, and history relationships use composite keys where required to prevent cross-definition or cross-organisation contradictions.
- Workflow execution must require organisation context.
- Workflow execution must run inside a transaction and use a stale-transition guard before product side effects, history, audit, or activity are written.
- Permission checks use the existing Platform Release 1.2 permission catalogue.
- Audit writes use the existing audit writer.
- Product-specific side effects remain in product workflow adapters.

## Risks

- `Lead.pipelineStage` and workflow instance current stage can drift if future code bypasses the service.
- Concurrent transition requests can race unless every transition uses the guarded transaction boundary.
- A transition graph that is too restrictive could remove working SolarGRANT Pro behaviour.
- A generic workflow model can become too broad if it absorbs automation features too early.

## Verification Plan

- Unit tests for workflow definition integrity and transition validation.
- PostgreSQL integration tests for valid, invalid, unauthorised, cross-organisation, cross-definition, stale concurrent, and rollback transitions.
- Migration tests for additive workflow tables and lead instance backfill.
- Audit and history assertions in the proving slice.

## Rollout Plan

Ship additively. Backfill workflow instances from existing lead pipeline stages. Keep `Lead.pipelineStage` as a compatibility projection for the current UI. Do not fabricate past workflow history.

## Documentation Updates

- sprint document;
- workflow feature specs;
- ADRs;
- platform capability map;
- platform roadmap;
- architecture overview;
- SolarGRANT Pro module document;
- technical debt register;
- COM summary and indexes.
