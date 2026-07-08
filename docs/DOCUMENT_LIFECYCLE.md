# Document Lifecycle

| Field | Value |
| --- | --- |
| Document ID | GOV-DOC-LIFE-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-08 |

This lifecycle keeps documentation accurate enough to govern implementation.

## Lifecycle Stages

1. Identify need: define the decision, workflow, risk, or knowledge gap.
2. Research: gather evidence when the subject affects customers, compliance, architecture, or operational risk.
3. Draft: write the document with metadata, scope, references, and next actions.
4. Review: check for correctness, terminology, maintainability, and conflicts with higher-authority documents.
5. Activate: set status to Active when it becomes authoritative.
6. Implement: use the active document to guide code, design, operations, or sprint execution.
7. Verify: confirm implementation and documentation still agree.
8. Maintain: review on cadence and update when reality changes.
9. Archive or supersede: preserve historical context without letting old guidance govern current work.

## When Documentation Must Change

Update documentation before or with any change that affects:

- product behaviour
- platform architecture
- data model or data retention
- security, privacy, or compliance posture
- customer-facing commitments
- operational workflow
- release process
- AI usage or automation boundaries

## Review Expectations

Review depth should match risk. A copy edit does not need an ADR. A platform-level decision, workflow change, integration, data model change, or automation stance does.

Reviewers should check:

1. Does this comply with the Constitution?
2. Does it preserve Clada OS terminology?
3. Is the owner clear?
4. Is the status correct?
5. Are references valid?
6. Does implementation need to change?

## Archiving

Archived documents live in `docs/99-archive/` unless there is a stronger contextual reason to keep them beside their replacement. Archived files should include the date archived and a link to the active replacement.

Do not delete historical decisions that explain why the system exists in its current form.
