# Actor-Aware Audit Foundation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-2-AUDIT |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Upgrade audit writes from string attribution to typed actor, organisation, membership, resource, source, and outcome attribution while preserving existing records.

## Problem

Existing audit and activity records are useful but not strong enough for secure multi-user operations. They cannot reliably answer who acted, under which organisation and membership, what resource was affected, and whether the action succeeded.

## Evidence

- `AuditLog.actor` is a string.
- `LeadActivity.createdBy` and `LeadActivity.createdByRole` are strings.
- Audit metadata sometimes carries `organisationId`, but it is not a first-class indexed field.
- Architecture Checkpoint 1 treats string-based audit attribution as high-priority technical debt for Platform Release 1.2 completion.

## Product Scope

In scope:

- typed audit fields;
- actor type enum;
- outcome enum;
- organisation, user, and membership attribution;
- resource type and resource ID;
- source and metadata boundaries;
- compatibility wrapper for legacy calls;
- proving-slice typed audit events.

Out of scope:

- event sourcing;
- SIEM replacement;
- analytics warehouse;
- retention automation;
- full migration of every historical string field out of the UI.

## Platform Classification

Clada OS platform capability.

Audit is shared infrastructure for workflow, documents, notifications, AI, reporting, and future modules.

## Users And Actors

Actor types:

- human user;
- system;
- service;
- public token.

Public token actors are token-scoped and do not gain organisation permissions.

## Functional Requirements

- New audit events include action, actor type, organisation ID where available, membership ID where relevant, user ID where relevant, resource type, resource ID, outcome, source, timestamp, and non-sensitive metadata.
- Existing audit rows remain readable.
- Legacy `actor` remains populated for compatibility during the migration period.
- Metadata must not contain secrets, tokens, document contents, or excessive customer data.

## Security Requirements

- Audit metadata must be minimised.
- Portal tokens must not be stored in audit metadata.
- Denied events may be recorded where they do not reveal cross-tenant record existence.
- Audit writes should not accept client-supplied actor attribution as authoritative.

## Data Requirements

- Add typed optional fields to `AuditLog`.
- Add optional actor attribution fields to `LeadActivity` for compatibility where useful.
- Backfill organisation and resource fields from existing lead relationships where possible.

## API Or Service Boundaries

The audit service exposes:

- `writeAuditEvent` for typed audit writes;
- `buildAuditActorFromContext` for authenticated contexts;
- a compatibility `writeAuditLog` wrapper until all legacy call sites migrate.

### Current Audit Event Catalogue Amendment - Platform Release 1.5 PR 2

| Action | Outcome | Actor/source | Resource | Allowed metadata | Explicit exclusions |
| --- | --- | --- | --- | --- | --- |
| `lead.created` | `SUCCEEDED` only after the full manual-create transaction commits | authenticated `HUMAN_USER`, trusted user/membership/organisation, source `manual_installer` | created lead | origin, Installer ID, creator membership ID, optional assignee membership ID, and boolean follow-up/note presence | customer name, phone, email, address, Eircode, note body, duplicate candidates, request payload |

Validation or authorisation denial creates no successful `lead.created` event. Public intake retains its existing public/homeowner actor compatibility event and now stores explicit `HOMEOWNER_INTAKE` origin on the lead.

## Failure Behaviour

Audit write failure inside a protected mutation transaction should fail the transaction for material state changes.

## Testing Requirements

- audit actor construction;
- metadata sanitisation;
- successful proving-slice audit attribution;
- organisation and membership ownership on audit events;
- legacy compatibility writes remain possible.

## Migration Considerations

Existing rows are backfilled best-effort:

- `leadId` becomes `resourceId`;
- `resourceType` becomes `lead` when `leadId` exists;
- `organisationId` is derived from the lead when available;
- `actorType` is inferred from legacy actor strings;
- `outcome` defaults to `SUCCEEDED`.

Rows without enough context keep nullable typed fields and legacy strings.

## Acceptance Criteria

- typed audit schema exists;
- typed audit writer exists;
- proving-slice success writes a typed audit event;
- sensitive metadata filtering is tested;
- remaining compatibility debt is documented.
