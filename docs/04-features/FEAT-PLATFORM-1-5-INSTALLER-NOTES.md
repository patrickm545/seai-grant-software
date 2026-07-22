# Platform Release 1.5 - Installer Notes

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-INSTALLER-NOTES |
| Status | Proposed |
| Owner | SolarGRANT Pro Product and Engineering |
| Review cycle | Platform Release 1.5 and pilot feedback |
| Last reviewed | 2026-07-22 |

## Summary

Make installer notes a first-class lead-workspace behaviour using append-only, actor-attributed `LeadActivity` records. Notes remain internal to authorised installer users and appear in both the Notes section and source-aware activity timeline.

## Problem

The application has a legacy `Lead.internalNotes` field and an existing add-note activity action, but note history and authorship need a clear product contract. Mutable note blobs weaken accountability and collaboration readiness.

## Evidence

- `LeadActivity` already supports a note activity type and actor fields.
- The existing add-note action validates non-empty content and a 3,000-character maximum.
- ADR-0013 establishes `LeadActivity` as the SolarGRANT Pro product timeline.
- Product/design guidance requires customer context, notes, next action, auditability, and clear daily work.

## Product Scope

In scope:

- lead-local Notes section and quick-add action;
- append-only plain-text notes with typed actor attribution and timestamp;
- bounded validation, pending/success/error feedback, stable ordering, and pagination when required;
- note-created audit event with safe metadata;
- note entries in the source-aware timeline;
- clearly labelled read-only handling of existing legacy internal-note content.

Out of scope:

- editing/deleting notes in place;
- rich text, attachments, comments, replies, mentions, reactions, customer-visible notes, public portal notes, AI-written notes, or notification delivery;
- migration that duplicates or changes legacy content without an approved idempotent rule.

## Platform Classification

SolarGRANT Pro module feature extending the accepted product activity boundary. It uses Clada OS actor context, permissions, audit, and tenant isolation; no generic platform notes model is introduced.

## User Workflow

1. Authorised installer opens Notes or quick-add from an owned lead.
2. Installer enters plain text within the approved limit.
3. Server validates permission, organisation-owned lead, content, and actor context.
4. Activity and audit records commit atomically.
5. The note appears immediately with author-safe display and timestamp.
6. Historical notes remain read-only.

## Design Requirements

- Preserve entered text on recoverable validation/network failure where practical.
- Show author display, date/time, and internal visibility label.
- Render plain text safely with line breaks; no unsafe HTML or Markdown interpretation.
- Empty state explains that notes are internal and attributed.
- The add control is keyboard accessible, has visible focus, announces result state, and works at 390 px.
- Never imply notes are shared with homeowners.

## Architecture Notes

- Use `LeadActivity` NOTE entries as the canonical new note record.
- Require an approved `note.create` permission or explicitly approved reuse of `lead.update`; `lead.read` is required to list.
- Resolve actor and organisation server side and query through tenant-scoped lead access.
- Retain the existing 3,000-character maximum unless CTO review approves a different bounded value.
- Create `lead.note_created` audit metadata with lead/activity IDs only; exclude note body and customer facts.
- Note creation and audit commit in one transaction.
- Existing `Lead.internalNotes` remains read-only compatibility content during Release 1.5. Do not create a duplicate activity on every read.

## Risks

- Sensitive content leaks to logs or audit.
- Mutable history undermines trust.
- Legacy content is duplicated during migration.
- Notes are mistaken for customer communication.
- Unbounded note lists slow the workspace.

Mitigate with plain text, bounded input, append-only behaviour, safe audit metadata, explicit internal labels, idempotent migration decisions, and pagination.

## Acceptance Criteria

- Authorised users can add a non-empty note of at most the approved length to an owned lead.
- Cross-tenant, restricted, inactive, missing, and tampered contexts are denied with no write.
- A successful note has typed actor context and one required audit event.
- Note content is absent from logs and audit metadata.
- Notes cannot be edited or deleted through normal product UI/API.
- Legacy internal notes remain available without silent duplication or data loss.
- Notes and their timeline projection render safely and accessibly at desktop and 390 px.

## Verification Plan

- unit tests for trimming, empty/length limits, safe rendering, and audit metadata;
- integration tests for permission, tenant isolation, actor attribution, atomic rollback, and legacy compatibility;
- browser tests for add success/failure, stable ordering, keyboard, focus, status announcement, and mobile layout;
- security review proving note bodies do not enter logs/audit.

## Rollout Plan

Refactor the existing add-note path behind the approved protected service without changing historical rows. Add the Notes section and timeline mapping after service tests pass. Pilot with one organisation and monitor validation/support issues without logging note content.

## Documentation Updates

- Release 1.5 Master Specification and sprint plan;
- permission documentation after approval;
- SolarGRANT Pro module/current-state documentation after implementation;
- privacy/retention documentation when commercial policy is completed.
