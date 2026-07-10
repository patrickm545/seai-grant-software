# Platform Release 1.3 Workflow Foundation

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-3 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-10 |

## Purpose

Platform Release 1.3 introduces the first reusable Clada OS Workflow Foundation.

The release must keep workflow mechanics product-neutral while proving the platform capability through the existing SolarGRANT Pro lead pipeline. SolarGRANT Pro may continue to own lead labels, customer language, and domain rules. Clada OS owns workflow definitions, stages, transitions, instances, execution, history, permission checks, organisation ownership checks, and audit attribution.

## Approved Baseline

This release starts from the approved `main` branch at `platform-release-1.2`.

Approved prior tags:

- `platform-release-1.1`
- `architecture-checkpoint-1`
- `platform-release-1.2`

The current branch for this release is `codex/platform-release-1-3-workflow-foundation`.

## Current-State Repository Assessment

Repository review on 2026-07-10 found the following implementation state.

### What Already Exists

- `Lead.pipelineStage` is a Prisma enum field with SolarGRANT Pro stages.
- `lib/crm.ts` owns stage labels, tone, icon helpers, closed-stage helpers, and contact timestamp rules.
- `lib/lead-workflow.ts` provides a protected service boundary for changing a lead pipeline stage.
- `app/installer-review-emerald/actions.ts` calls `changeLeadPipelineStage` from the server action instead of updating the field directly.
- `lib/authorization.ts` combines `requirePermission` with lead organisation ownership checks.
- `lib/lead-access.ts` scopes lead, lead document, and lead activity access by organisation.
- `lib/audit.ts` writes actor-aware audit events with organisation, membership, user, resource, source, outcome, and sanitized metadata.
- `LeadActivity` records operational timeline entries for stage changes.
- PostgreSQL integration tests already prove permitted, restricted, cross-organisation, inactive, missing-context, and tampered-context behaviour for the protected lead stage change.

### Duplicated Workflow Logic

- Workflow state exists directly on `Lead.pipelineStage` rather than through a reusable platform instance.
- Stage definitions are represented in both Prisma enum values and `lib/crm.ts` metadata.
- Stage-change side effects are embedded in `lib/lead-workflow.ts`, including activity wording, last-contacted rules, and closed-stage follow-up clearing.
- UI stage options are built from SolarGRANT Pro helper arrays instead of querying a workflow definition.
- Lead status updates in the detail page remain product workflow edits and are not the selected proving slice for this release.

### Hard-Coded Transitions

- Platform Release 1.2 validates that a requested stage is a member of the lead pipeline enum.
- It does not validate a transition against a reusable transition definition.
- The existing UI effectively permits moving from any valid pipeline stage to any other valid pipeline stage.
- There is no persisted transition graph, workflow instance, or workflow history.

### Product Coupling

- The current workflow service imports SolarGRANT Pro lead-stage labels and business side effects.
- The platform layer has no product-neutral workflow contract.
- Lead activity remains a SolarGRANT Pro timeline model and should not become the generic workflow history model.
- Audit is product-neutral enough to reuse, but workflow metadata is currently lead-specific.

### Extension Points

- `OrganisationContext`, permission helpers, and audit writer can be reused by workflow execution.
- `lead-access` helpers can protect the SolarGRANT Pro proving slice while the generic workflow service protects workflow instance ownership.
- Prisma migrations can backfill workflow instances from existing `Lead.pipelineStage` without fabricating historical workflow transitions.
- Existing PostgreSQL integration test structure can be extended to assert workflow history and audit creation.

### Migration Risks

- Existing leads have a pipeline stage but no workflow instance.
- New lead creation must create or lazily initialize a workflow instance.
- Workflow definitions must be seeded deterministically by migration so transition validation is server-side and data-backed.
- Existing lead history must remain readable; migration must not invent past workflow history.
- `Lead.pipelineStage` may need to remain as a compatibility projection until UI and reporting consume workflow instances directly.
- Direct Prisma updates to `Lead.pipelineStage` outside the service would risk instance and field drift.

## Feature Specifications

- [Workflow Foundation](../04-features/FEAT-PLATFORM-1-3-WORKFLOW-FOUNDATION.md)
- [Workflow Definitions](../04-features/FEAT-PLATFORM-1-3-WORKFLOW-DEFINITIONS.md)
- [Transition Validation](../04-features/FEAT-PLATFORM-1-3-TRANSITION-VALIDATION.md)
- [Workflow History](../04-features/FEAT-PLATFORM-1-3-WORKFLOW-HISTORY.md)
- [SolarGRANT Pro Workflow Proving Slice](../04-features/FEAT-PLATFORM-1-3-SOLARGRANT-PRO-WORKFLOW-PROVING-SLICE.md)

## Architecture Decisions

- [ADR-0011: Workflow Foundation Architecture](../05-decisions/ADR-0011-workflow-foundation-architecture.md)
- [ADR-0012: Workflow Transition Validation Boundary](../05-decisions/ADR-0012-workflow-transition-validation-boundary.md)
- [ADR-0013: Workflow History Model](../05-decisions/ADR-0013-workflow-history-model.md)
- [ADR-0014: Product Workflow Consumption Boundary](../05-decisions/ADR-0014-product-workflow-consumption-boundary.md)

## Workflow Model

The minimum reusable workflow model for this release is:

| Concept | Purpose |
| --- | --- |
| `WorkflowDefinition` | Names a reusable workflow contract and groups stages and transitions. |
| `WorkflowStage` | Defines an allowed state within a workflow definition. |
| `WorkflowTransition` | Defines an allowed move between two stages and the permission required to execute it. |
| `WorkflowInstance` | Connects one organisation-owned resource to one workflow definition and current stage. |
| `WorkflowHistory` | Records executed workflow transition outcomes and actor attribution. |

No BPMN, workflow builder, timers, parallel branches, custom scripting, customer configuration, notification automation, or AI decisioning belongs in this release.

## Schema And Migration Plan

Planned schema changes:

- add workflow definition, stage, transition, instance, and history tables;
- relate workflow instances and history to `Organisation`;
- optionally link workflow history to `AuditLog`;
- seed the SolarGRANT Pro lead pipeline workflow definition, stages, and transitions;
- create one workflow instance for each existing lead using the lead's current pipeline stage;
- keep `Lead.pipelineStage` as a compatibility projection for current UI and reporting;
- do not create synthetic workflow history for historical lead stage values.

Rollback and recovery:

- workflow tables are additive;
- existing lead data remains intact;
- if deployment must roll back, the current product can continue reading `Lead.pipelineStage`;
- deleting workflow foundation data is not required for application rollback, but a database rollback can drop additive tables before any future release depends on them;
- no historical audit, activity, or lead records are deleted.

## SolarGRANT Pro Proving Slice

The selected proving slice is changing a lead's pipeline stage through the new reusable workflow execution service.

Success criteria:

- valid transition succeeds;
- invalid transition is rejected server side;
- same-organisation user without permission is rejected;
- cross-organisation user is rejected;
- successful transition writes workflow history;
- successful transition writes actor-aware audit;
- denied transition leaves lead and workflow instance state unchanged.

## Security Review Checklist

- transition permission enforcement through server-side permission evaluation;
- cross-organisation workflow instance protection;
- cross-organisation lead protection in the proving slice;
- invalid transition rejection before mutation;
- client stage tampering rejected by server-side definition lookup;
- workflow history integrity and actor attribution;
- audit metadata minimisation and sensitive-key sanitisation through the existing audit writer;
- compatibility field drift risk documented and tested where practical.

## Capability Maturity Target

| Capability | Starting maturity | Target maturity |
| --- | --- | --- |
| Workflow Foundation | L1 Documented | L2 after specification, L3 after implementation, L4 only after tests, validation, review, and production migration readiness |

Workflow Foundation must not be marked L5 in this release because it is proved through one product module only.

## Implementation Plan

1. Create Release 1.3 sprint, feature specification, and ADR documentation.
2. Add additive workflow Prisma models and migration.
3. Seed the SolarGRANT Pro lead pipeline workflow definition and backfill instances.
4. Implement reusable workflow definition validation and execution helpers.
5. Refactor `changeLeadPipelineStage` to execute through the workflow service while preserving existing lead field projection, lead activity, and audit behaviour.
6. Ensure new or migrated leads have workflow instances.
7. Add unit tests for definition integrity and transition validation.
8. Expand PostgreSQL integration tests for successful history creation, invalid transition rejection, unauthorized denial, cross-organisation denial, audit event creation, and unchanged denied state.
9. Update platform, product, engineering, sprint, feature, ADR, and technical debt documentation.
10. Run required validation and open a pull request to `main`.

## Implementation Summary

Implemented Platform Release 1.3 workflow foundation:

- additive workflow Prisma models for definitions, stages, transitions, instances, and history;
- migration-seeded `solargrant.lead_pipeline` workflow definition with stage keys matching the existing lead pipeline;
- migration backfill creating workflow instances from existing `Lead.pipelineStage` values without fabricating history;
- reusable workflow service in `lib/workflow.ts` for definition integrity checks, instance initialization, transition validation, execution, history, and audit linkage;
- audit writer now returns the created audit row while preserving existing call sites;
- `changeLeadPipelineStage` now consumes the workflow service and keeps `Lead.pipelineStage` plus `LeadActivity` as SolarGRANT Pro projections;
- public intake and seed paths ensure new leads receive workflow instances.

## Migration Details

Migration:

`prisma/migrations/20260710140000_workflow_foundation/migration.sql`

Strategy:

- create workflow tables additively;
- seed one active workflow definition for SolarGRANT Pro lead pipeline progression;
- seed stages matching existing `LeadPipelineStage` enum values;
- seed a permissive transition graph for valid distinct stage moves to preserve current operational behaviour;
- require `lead.change_status` for seeded lead pipeline transitions;
- backfill workflow instances from current lead stages;
- record `historyBackfilled = false` in migration metadata to make clear that historical transitions were not invented.

Rollback and recovery:

- existing lead records and pipeline stages remain untouched;
- workflow data can be ignored by rolled-back application code because `Lead.pipelineStage` remains;
- no audit, activity, or lead history is deleted or rewritten.

## Automated Tests Added

- `tests/platform/workflow.test.ts`

Expanded tests:

- `tests/platform/migration-sql.test.ts`
- `tests/integration/lead-stage-permissions.integration.test.ts`

PostgreSQL proving-slice coverage:

- valid transition succeeds;
- invalid stage request is rejected server side;
- same-organisation user without permission is denied;
- cross-organisation user is denied;
- successful transition creates workflow history;
- successful transition writes audit metadata with workflow context;
- denied transitions leave lead and workflow instance state unchanged;
- denied transitions do not create extra workflow history.

## Capability Maturity Achieved

| Capability | Achieved maturity | Evidence |
| --- | --- | --- |
| Workflow Foundation | L3 implemented; L4 candidate after PR review and production migration validation | Schema, migration, workflow service, lead proving slice, unit tests, migration tests, and PostgreSQL integration coverage. |

L5 is not achieved because reuse has been proved through only one product module.

## Technical Debt Changes

- Added `TD-011` for `Lead.pipelineStage` projection drift risk.
- Updated `TD-007` to include workflow-aware protected service boundaries.
- Recorded workflow foundation as implemented planned capability gap `PCG-003`.

## Validation Plan

Required validation:

- Node 22;
- Prisma validation;
- Prisma generate;
- migration validation;
- unit tests;
- PostgreSQL integration tests;
- typecheck;
- lint;
- production build;
- documentation validation;
- COM navigation validation;
- internal Markdown links;
- placeholder scan;
- `git diff --check`.

Do not claim a validation step passed if it was skipped or unavailable.

## Validation Results

Validation run on 2026-07-10 under project-local Node `v22.23.1` and pnpm `10.11.0`.

PostgreSQL validation target:

`clada_platform_12_test`

| Check | Result | Notes |
| --- | --- | --- |
| Node 22 | Passed | `.tools/node-v22/node.exe -v` returned `v22.23.1`. |
| Prisma format | Passed | `pnpm exec prisma format` completed before implementation validation. |
| Prisma validate | Passed | Reran with explicit PostgreSQL `DATABASE_URL`. |
| Prisma generate | Passed | `pnpm exec prisma generate`. |
| Migration deploy | Passed | `pnpm test:integration:postgres` applied `20260710140000_workflow_foundation` to the test database. |
| Migration status | Passed | `pnpm exec prisma migrate status` reported schema up to date. |
| Unit tests | Passed | 33 platform tests passed. |
| PostgreSQL integration tests | Passed | 3 integration tests passed, including workflow history and audit proving-slice coverage. |
| Type checking | Passed | `pnpm typecheck` passed after production build regenerated Next type files. |
| Lint | Passed | `pnpm lint`. |
| Production build | Passed | `pnpm build`. |
| Document metadata validation | Passed | 102 Markdown files checked. |
| Markdown internal-link validation | Passed | 102 Markdown files checked. |
| COM navigation validation | Passed | Numbered COM Markdown files are listed from `docs/SUMMARY.md`. |
| Placeholder scan | Passed | Template and documentation-standard placeholders allowlisted. |
| `git diff --check` | Passed | No whitespace errors. |

## Definition Of Done

This release is done when:

- repository assessment, specs, ADRs, migration plan, and workflow architecture are documented;
- workflow schema and migration are additive and preserve existing lead data;
- reusable workflow transition validation and execution exist in code;
- SolarGRANT Pro lead pipeline stage changes consume the workflow service;
- successful transitions write workflow history and audit events;
- denied transitions leave state unchanged;
- unit and PostgreSQL integration tests pass or are explicitly caveated;
- COM indexes and relevant platform, product, engineering, security, debt, and sprint docs are updated;
- validation results are recorded;
- a pull request is opened to `main` and not merged;
- Platform Release 1.4 is not started.

## Related Documents

- [Platform Execution Model and Roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md)
- [Platform Capability Map](../01-platform/PLATFORM_CAPABILITY_MAP.md)
- [Architecture Overview](../03-engineering/ARCHITECTURE_OVERVIEW.md)
- [Technical Debt Register](../03-engineering/TECHNICAL_DEBT_REGISTER.md)
