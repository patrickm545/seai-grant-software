# Documentation Standard

| Field | Value |
| --- | --- |
| Document ID | GOV-DOC-STD-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-08 |

This standard defines how Clada Systems documentation is written, reviewed, referenced, and maintained.

## Required Metadata

Every durable document must include metadata near the top:

| Field | Requirement |
| --- | --- |
| Document ID | Stable identifier using the document ID convention |
| Status | Draft, Proposed, Active, Superseded, or Archived |
| Owner | Role or team accountable for accuracy |
| Review cycle | Expected review cadence |
| Last reviewed | ISO date, `YYYY-MM-DD` |

Templates may include additional fields such as related ADRs, sprint, feature owner, risk level, or version.

## Document IDs

Use concise prefixes:

- `GOV`: governance
- `COM`: operating manual index and navigation
- `COMP`: company
- `PROD`: product
- `DES`: design
- `ENG`: engineering
- `FEAT`: feature specifications
- `ADR`: architecture decisions
- `SPRINT`: sprint planning
- `RES`: research
- `ARCHIVE`: archived material

IDs should be stable. Rename files only when clarity improves; do not change document IDs for cosmetic reasons.

## Status Lifecycle

- Draft: being written and not yet authoritative.
- Proposed: ready for review.
- Active: approved and authoritative.
- Superseded: replaced by a newer document but retained for traceability.
- Archived: no longer active and preserved for history.

Only Active documents govern implementation.

## Naming Conventions

- Governance documents at the root of `docs/` use uppercase filenames.
- Folder README files explain scope and navigation.
- ADR files use `ADR-0001-short-title.md`.
- Feature specs use `FEAT-short-title.md` after approval.
- Sprint files use `FOUNDATION_RELEASE_1_MILESTONE_1.md` or a similarly explicit release and milestone name.
- Avoid vague names such as `notes.md`, `misc.md`, or `new.md`.

## Writing Standards

Write concise engineering language. Avoid marketing language, filler, and private conversation references.

Every durable document should answer:

1. Why does this exist?
2. What does it decide or define?
3. How should someone use it?
4. What happens next?

Use headings, short sections, and links. Prefer concrete rules over broad aspirations.

## Cross References

Documents should link to higher-authority documents and any implementation-relevant peers. When a document depends on an ADR, feature spec, sprint, or research artifact, link to it directly.

Broken references are documentation defects.

## Versioning

Use Git history for ordinary document versioning. Add an explicit version field only when the document is externally shared, contractually important, or released as a stable operating artifact.

Material policy changes require an ADR.

## Definition Of Done

A documentation change is done when:

1. Metadata is present and accurate.
2. The document has a clear owner and status.
3. The content is specific enough to guide action.
4. References are valid.
5. Related docs are updated.
6. The change preserves Clada OS terminology.
7. The document can be understood without private chat history.
