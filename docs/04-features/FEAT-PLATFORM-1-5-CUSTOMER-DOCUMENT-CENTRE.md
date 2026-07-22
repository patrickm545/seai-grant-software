# Platform Release 1.5 - Customer Document Centre

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-DOCUMENT-CENTRE |
| Status | Proposed |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Platform Release 1.5 and pilot feedback |
| Last reviewed | 2026-07-22 |

## Summary

Present every permitted customer-related document from the lead workspace through one clearly classified Document Centre. Uploaded evidence and governed generated documents share a product read surface but retain separate records, status vocabulary, permissions, storage, audit, and lifecycle semantics.

## Problem

Installers need to know what has been received, what is missing or needs review, and what professional output exists. Current document actions are distributed and technical exports can compete with daily document work.

## Evidence

- Product UX audit finding PUX-023 and document/pilot-readiness findings.
- Existing `LeadDocument` upload/review/portal behaviour.
- ADR-0015 requires uploaded evidence and governed generated documents to remain distinct.
- ADR-0017 requires authenticated, organisation-scoped, separately permitted generated-file retrieval.

## Delivery Gate

This feature is Release 1.5 PR 7 and must not begin until the missing Release 1.4 governed generated-document implementation has completed its own separately approved implementation PR sequence and has been reviewed and merged into `main`.

Existing uploaded `LeadDocument` evidence may be surfaced before PR 7 only where an approved Release 1.5 PR 1–6 workspace scope requires it. Any such surface must explicitly label the records as uploaded evidence and must not imply that governed generated-document capability exists.

PR 7 must consume the authoritative implementation governed by ADR-0015, ADR-0016, and ADR-0017. It must not introduce a temporary substitute or duplicate or partially recreate generated-document models, services, storage, rendering, retrieval, permissions, integrity evidence, or audit contracts.

## Product Scope

In scope:

- lead-local document summary counts and actionable status;
- uploaded-evidence list with category, safe filename, source, date, review status, and permitted action;
- governed generated-document list from the separately reviewed and merged Release 1.4 implementation;
- visually distinct Uploaded Evidence and Generated Documents groupings;
- missing/required checklist guidance from existing SolarGRANT Pro rules;
- source-specific view/download/review/generate actions and timeline entries;
- pagination or bounded lists and truthful unavailable/empty states.

Out of scope:

- one unified persistence table or lifecycle enum;
- migration/dual-write of `LeadDocument`;
- document editing, folders, bulk operations, full-text search, e-signature, sharing, OCR expansion, public generated links, or retention automation;
- changing template, PDF renderer, storage, checksum, or secure retrieval decisions;
- showing internal JSON exports as primary customer documents.

## Platform Classification

SolarGRANT Pro module composition feature consuming the existing product upload domain and, after the delivery gate is satisfied, the authoritative Clada OS generated-document capability. No new generic document architecture is introduced.

## User Workflow

1. Installer opens Documents for an owned lead.
2. A summary shows received, needs-review, missing, and generated-document counts only when those counts are supported by authoritative records.
3. Installer reviews uploaded evidence using existing product rules.
4. Because PR 7 cannot start before the Release 1.4 implementation merges, the installer uses that authoritative capability to view metadata, generate an approved document, or download immutable bytes when permission permits.
5. Successful material actions appear in the product timeline and required audit records.

## Design Requirements

- Source type is always visible; identical labels must not imply identical lifecycle semantics.
- Status text uses product-readable labels mapped from the authoritative source record.
- The default view prioritises missing/needs-review evidence and professional outputs; technical exports are secondary.
- Filenames are safely rendered and truncated without hiding extensions.
- File type, size, date, actor/source, and action availability are accessible without relying on icons alone.
- Empty states distinguish no uploads, no generated documents, and generated-document capability unavailable.
- Download/generation feedback is explicit and recoverable.

## Architecture Notes

- The read model is a discriminated union such as `uploaded_evidence` and `generated_document`.
- Every query begins with trusted organisation and lead ownership.
- Uploaded evidence continues through `LeadDocument` services/token boundaries.
- Generated documents are selected through organisation-scoped `DocumentResourceLink` and metadata services only when implemented.
- File bytes never pass through the aggregate read model; generated downloads use ADR-0017's protected route.
- Never expose storage locators, `contentBytes`, portal tokens, raw extraction text, AI payloads, or audit metadata to the default client model.
- Stable pagination ordering includes timestamp, source type, and ID.

## Risks

- Release 1.4 runtime capability is absent from current `main`, so PR 7 is blocked even after PR #34 is re-approved and merged.
- Mixed document types mislead users or weaken access rules.
- Cross-tenant links create IDOR exposure.
- Large lists or bytes are eager-loaded into the workspace.
- Internal/technical artifacts dominate customer work.

The CTO baseline gate, source discrimination, separate services/permissions, bounded metadata queries, and explicit product hierarchy mitigate these risks.

## Acceptance Criteria

- Uploaded evidence remains fully compatible and tenant-scoped.
- PR 7 begins only after the separately approved Release 1.4 implementation sequence is completed, reviewed, and merged into `main`.
- Governed documents come only from that authoritative Release 1.4 implementation.
- No temporary substitute or duplicated/partial generated-document architecture exists in Release 1.5.
- Each item displays its source type and authoritative status.
- Metadata read does not imply file-byte access.
- Cross-tenant lead/document/link identifiers are denied safely.
- Generated bytes, checksums, and template-version references remain immutable.
- Empty/unavailable/error states never imply a document exists when it does not.
- Existing portal upload/download flows remain unchanged.

## Verification Plan

- unit tests for discriminated mapping, status labels, counts, filenames, ordering, and empty states;
- permission and tenant-isolation integration tests for both document sources;
- generated-download tests required by ADR-0017 when available;
- portal upload/download and review regression tests;
- browser checks at desktop and 390 px;
- performance checks proving no file bytes are loaded for listing;
- baseline dependency verification recorded before implementation.

## Rollout Plan

Before PR 7, an earlier approved workspace PR may surface existing uploaded `LeadDocument` evidence only as clearly classified uploaded evidence. Separately complete, review, and merge the Release 1.4 governed generated-document implementation PR sequence. Only then branch and implement PR 7 as a composition of uploaded evidence and the authoritative generated-document capability. Never create a local substitute or partial Release 1.4 implementation inside Release 1.5.

## Documentation Updates

- Release 1.5 Master Specification and sprint plan;
- Release 1.4 sign-off/baseline record when resolved by its owners;
- SolarGRANT Pro module/current-state documentation after implementation;
- pilot onboarding/support runbook.
