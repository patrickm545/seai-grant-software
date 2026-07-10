# SolarGRANT Pro Protected Workflow Proving Slice

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-2-SGP-PROTECTED-WORKFLOW |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Protect the SolarGRANT Pro lead pipeline-stage change workflow with organisation membership, permission-based authorisation, and actor-aware audit logging.

## Problem

Changing a lead stage mutates operational workflow state and can affect customer follow-up. It currently requires active organisation context but not an explicit permission.

## Evidence

- `updateLeadPipelineStage` is already an operational server action.
- The workflow updates `Lead.pipelineStage`, may update contact/follow-up fields, creates `LeadActivity`, and writes `AuditLog`.
- Existing audit attribution is string-based.

## Product Scope

In scope:

- protect stage changes with `lead.change_status`;
- keep existing UI flow;
- use a reusable service function for tests and server action;
- write actor-aware audit events on success;
- prove same-organisation denial, cross-organisation denial, inactive denial, and unauthenticated denial.

Out of scope:

- full lead workflow engine;
- broad UI redesign;
- custom role builder;
- organisation administration portal;
- public portal role conversion.

## Platform Classification

SolarGRANT Pro module workflow consuming Clada OS platform capabilities.

The workflow is solar-product operational code. Role, permission, authorisation, and audit primitives are platform-owned.

## Users And Actors

- Permitted installer organisation admin changes a lead stage.
- Restricted organisation member attempts the same action and is denied.
- Cross-organisation member attempts access and is denied.
- Unauthenticated or inactive actor is denied.

## Functional Requirements

- The server action resolves organisation context from authenticated server-side state.
- The service requires `lead.change_status`.
- The service checks the lead belongs to the active organisation.
- The service updates the lead only after both checks pass.
- The service writes typed audit details for successful changes.
- Denied requests do not mutate the lead.

## Security Requirements

- Client-submitted `leadId` and `pipelineStage` are inputs only.
- Client-submitted role, permission, user, membership, or organisation values are ignored.
- Cross-organisation failures use safe unavailable behaviour.
- Audit metadata excludes portal tokens, document contents, and excessive personal data.

## Data Requirements

- Uses existing `Lead` and `LeadActivity` records.
- Writes typed `AuditLog` fields.
- Uses `OrganisationMembership.role` for permission resolution.

## API Or Service Boundaries

Initial service:

- `changeLeadPipelineStage({ db, context, leadId, nextStage })`

The server action is a thin adapter from `FormData` to the service.

## Failure Behaviour

Invalid pipeline stage is rejected before mutation. Missing permission, inactive context, missing actor context, or unavailable resource fails closed.

## Testing Requirements

- permitted user can change stage;
- restricted same-organisation user is denied;
- cross-organisation user is denied;
- missing actor context is denied;
- inactive user is denied;
- inactive membership is denied;
- client-supplied permissions cannot bypass enforcement;
- denied actions do not mutate;
- successful action creates correctly attributed audit event.

## Migration Considerations

Existing leads and activities are preserved. New audit attribution fields are added through the audit foundation migration.

## Acceptance Criteria

- stage-change service is permission-aware;
- server action uses the service;
- PostgreSQL integration test proves the full workflow;
- typed audit event includes organisation, user, membership, actor type, resource, action, source, and outcome.
