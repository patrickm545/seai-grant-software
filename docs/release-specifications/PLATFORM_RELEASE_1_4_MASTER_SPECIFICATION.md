# Platform Release 1.4 - Document Foundation Master Specification

| Field | Value |
| --- | --- |
| Document ID | REL-PLATFORM-1.4 |
| Status | Draft |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-14 |
| Release | Platform Release 1.4 |
| Approved baseline | 63b08fa87a61569c6ff4adbda730e75d86a9d31e |
| Target branch | codex/platform-release-1.4-master-spec |
| CTO approval | Pending |
| CEO approval | Pending |

## Executive Summary

Platform Release 1.4 should create the first reusable Clada OS document foundation. The release should let product modules create, store, retrieve, secure, audit, and reason about governed business documents without embedding document mechanics inside SolarGRANT Pro.

The recommended proving slice is to generate a professional SolarGRANT Pro lead assessment summary from existing lead data, store it as a governed document record, link it to the lead, audit generation and download activity, and make it available through a secure organisation-scoped download path. This slice is intentionally narrower than a full document management product.

The release must not treat SolarGRANT Pro as the platform. Clada OS should own the reusable document record, template-version attribution, storage metadata, generation status, access control, audit contracts, idempotency, and resource-link mechanics. SolarGRANT Pro should own the lead summary template, grant-specific wording, quote wording, merge-data mapping, branding, and the product surface that invokes generation.

Release 1.4 should not begin implementation until this Master Release Specification receives CTO architecture approval and CEO approval, required ADRs are complete, feature specifications are complete, and sprint scope is approved.

## Business Context

Contractor-led businesses routinely create and manage business documents: assessments, quotes, proposals, contracts, compliance records, reports, application packs, customer correspondence, and evidence records. These documents need consistent ownership, access control, file integrity, auditability, and retrieval across product modules.

SolarGRANT Pro already exposes several document-adjacent workflows:

- customer and public intake document metadata through `LeadDocument`;
- customer portal uploads and downloads;
- document review statuses;
- manual application-pack pages and JSON exports;
- installer quote estimates and generated quote data;
- audit and lead activity records for selected document actions.

Those workflows are useful, but they are not a reusable platform document foundation. They are mostly tied to SolarGRANT Pro leads, grant wording, portal tokens, and application-pack views. The platform needs a small common foundation before later products such as SOLARfarm Pro or future contractor modules create their own reports, proposals, compliance packs, or contracts.

The timing is justified because Platform Releases 1.1 through 1.3 have established the foundations this capability depends on:

- organisation ownership and tenant scoping;
- users, roles, permissions, and actor context;
- actor-aware audit logging;
- reusable workflow definitions, instances, transitions, and history.

Document generation, storage, and retrieval should build on those foundations rather than creating parallel access, audit, or workflow mechanics.

## Strategic Objectives

1. Establish a reusable platform document domain that can support generated business documents across multiple products.
2. Preserve the boundary between product-owned document content and platform-owned document mechanics.
3. Prove the foundation through one useful SolarGRANT Pro slice without turning the release into a full document management system.
4. Create an approval-gated path for ADRs, feature specifications, schema, services, APIs, tests, and sprint planning.
5. Avoid premature external storage vendors, template editors, AI-authored document content, and broad document lifecycle automation.
6. Improve trust by making generated documents organisation-owned, permission-protected, auditable, attributable to a template version, and safe to retrieve.

## Scope

Release 1.4 should include the specification, approval-gated design, and eventual implementation of the following after approval:

- platform document domain model for governed generated documents;
- document type or definition registry with product-neutral mechanics and product namespace support;
- repository-defined or database-registered document templates with immutable template versions;
- generated document record with organisation owner, lifecycle status, generation status, storage metadata, file metadata, checksum, template-version attribution, and actor attribution;
- document-resource links, initially for a generated document linked to a SolarGRANT Pro lead;
- document generation service contract with deterministic merge data, idempotency, duplicate prevention, failure state, and retry rules;
- storage abstraction boundary that can use existing database-backed storage for the proving slice and support future object storage;
- secure organisation-scoped document download path;
- minimum permissions required for generation, metadata read, and download;
- audit events for requested, generated, failed, downloaded, and archived or erased document lifecycle actions where in scope;
- compatibility plan for existing `LeadDocument`, application pack, portal upload, quote, and submission package concepts;
- SolarGRANT Pro lead assessment summary proving slice;
- ADR list and feature-specification list required before implementation;
- validation expectations and sprint breakdown.

## Out Of Scope

The following are not included in Release 1.4 unless CTO and CEO approval explicitly changes the release scope:

- drag-and-drop template editor;
- WYSIWYG document designer;
- customer-authored templates;
- e-signatures;
- digital signing certificates;
- OCR;
- document scanning;
- AI-written document content;
- AI template generation;
- public anonymous document links;
- customer document collaboration;
- comments and annotations;
- real-time collaborative editing;
- Word or Google Docs editing;
- complex approval workflows;
- bulk document generation;
- scheduled generation;
- external document-provider integrations;
- full retention automation;
- full records-management system;
- full document search;
- document folders;
- document sharing between organisations;
- email delivery of generated documents;
- SMS delivery;
- WhatsApp delivery;
- general-purpose form builder;
- Forms Foundation;
- Release 1.5 notification functionality;
- migration of every existing upload and application-pack flow into the new platform model;
- portal-token replacement for customer document upload and download flows;
- broad product UI redesign.

## Platform Responsibilities

Clada OS should own these product-neutral document responsibilities in Release 1.4 or explicitly defer them:

| Responsibility | Release 1.4 recommendation | Reason |
| --- | --- | --- |
| Document definitions or document types | Include minimum registry. | Product modules need namespaced document keys without hard-coding solar concepts into platform mechanics. |
| Document templates | Include as platform-managed records that point to product-owned template sources. | The platform needs attribution and activation mechanics; the product owns content. |
| Immutable template versions | Include. | Generated documents must remain traceable to the exact source version. |
| Generated document records | Include. | This is the central foundation. |
| Source template version attribution | Include. | Required for auditability and deterministic regeneration analysis. |
| Document metadata | Include minimum metadata. | Title, key, content type, size, checksum, status, and timestamps are reusable. |
| Organisation ownership | Include. | Documents contain customer and business data and must be tenant-scoped. |
| Document lifecycle state | Include minimum states. | Active, archived, and erasure/deletion handling need explicit behavior. |
| Storage references | Include. | Retrieval and future object storage require a stable boundary. |
| File metadata | Include. | Filename, content type, size, checksum, and storage key are needed for trust and download. |
| Checksum or integrity metadata | Include SHA-256. | Generated files should be tamper-evident and duplicate-safe. |
| Generation status | Include. | Requested, stored, failed, and retry states need durable tracking. |
| Failure status and failure reason | Include. | Operators need recoverable and supportable failure records. |
| Document access permissions | Include minimal keys. | Generation and download should not rely only on lead access. |
| Audit events | Include minimum required events. | Trust and traceability are platform responsibilities. |
| Service contracts for document generation | Include. | Product modules should call stable platform contracts. |
| Idempotency or duplicate prevention | Include. | Concurrent requests must not produce uncontrolled duplicates. |
| Links between documents and platform resources | Include generic link table or equivalent. | Leads are the first resource; future products need other resources. |
| Retention and deletion foundations | Include basic lifecycle and erasure hooks; defer automation. | Full records management is too broad, but GDPR erasure compatibility is required. |
| Download authorisation | Include. | Prevent insecure direct object references. |
| Product-neutral document-generation interfaces | Include. | Future modules should not consume SolarGRANT Pro implementation details. |

## Product Responsibilities

SolarGRANT Pro should own product-specific document responsibilities:

| Responsibility | SolarGRANT Pro ownership |
| --- | --- |
| Solar-specific document types | Own product namespace values such as `solargrant.lead_assessment_summary`. |
| Grant-related wording | Own all SEAI, grant, eligibility, and manual-assist wording. |
| Quote wording | Own quote assumptions, installer pricing wording, and final customer quote language. |
| Lead and property merge data | Own the mapping from `Lead`, quote, eligibility, and sales-signal fields into the template contract. |
| System recommendations | Own solar recommendation copy and survey caveats. |
| Grant eligibility content | Own grant-specific logic and warnings. |
| Product branding | Own SolarGRANT Pro customer-facing or installer-facing branding. |
| Customer-facing layouts | Own the module-specific look of the generated lead assessment summary. |
| Solar-specific template content | Own the repository template source. |
| Generation timing | Decide when a lead assessment summary should be generated. |
| Product UI invocation | Own the installer/admin control that requests generation. |

Solar-specific concepts must not become platform enum values, platform roles, generic document lifecycle states, or generic service names.

## Architecture

### Current-State Assessment

Repository inspection found these existing capabilities:

| Area | Current state | Release 1.4 treatment |
| --- | --- | --- |
| `LeadDocument` | SolarGRANT Pro lead-owned upload records with type, status, file metadata, storage path/URL, optional `contentBytes`, extracted text, and AI fields. | Leave unchanged for the proving slice. Reuse lessons and plan migration/wrapping through ADR. |
| Portal uploads | `/portal/[token]/documents` validates size, MIME type, and sanitized filenames, then stores bytes in Postgres and records activity/audit. | Reuse validation ideas and storage evidence. Do not make token access the generic download model. |
| Portal downloads | `/portal/[token]/documents/[documentId]` serves DB bytes or redirects to storage URL when token matches parent lead. | Keep as customer-token flow. Do not treat as organisation permission enforcement. |
| Intake applicant documents | Public intake stores metadata and `uploaded://...` references, not file bytes. | Do not use as proof of durable file storage. Preserve compatibility. |
| Document checklist | `lib/documents.ts` has SolarGRANT Pro document labels and required uploaded-document checklist. | Keep product-specific. Platform registry should not absorb those labels. |
| Application pack | `lib/application-pack.ts` and `ApplicationPackView` build a manual SEAI prep view from lead data and documents. | Reuse as product evidence and possible merge-data source. Do not treat it as a governed document record. |
| Print-friendly pack | A Next.js print page renders HTML suitable for browser print. | Existing PDF-friendly UI is not persisted PDF generation. |
| Submission package JSON | `/api/submission-package` emits a structured JSON package for manual review. | Useful source for merge data, not a stored document. |
| Portal fill preview JSON | `/api/portal-fill-preview` emits manual reference fields. | Leave product-specific. |
| Quote estimates | `lib/quote-estimate.ts` and `lib/installer-quote-pricing.ts` produce solar-specific estimate and generated quote JSON. | SolarGRANT Pro owns wording and calculations used in the assessment summary. |
| Permissions | `document.read` and `document.review` exist in the platform permission catalogue. | Extend only with minimum keys needed for generation/download if approved. |
| Audit | `lib/audit.ts` writes actor-aware audit records and sanitizes sensitive keys. | Reuse. Add document-specific audit action names and resource metadata. |
| Workflow | `lib/workflow.ts` supports organisation-scoped transition execution with audit and history. | Document generation should remain workflow-independent in Release 1.4. |
| Storage | Mixed behavior: DB bytes for portal uploads, placeholder upload URLs for intake, storage URL fields, no object storage abstraction. | Define a platform storage boundary. Use database-backed storage for the proving slice unless ADR approves object storage. |

### Recommended Architecture

The recommended architecture is a platform document service consumed by a SolarGRANT Pro product adapter:

```text
SolarGRANT Pro UI or server action
  -> SolarGRANT Pro lead assessment adapter
    -> loads organisation-scoped lead data
    -> builds product-owned merge data
    -> selects product-owned template key/version
    -> calls Clada OS document generation service
      -> checks document generation permission
      -> validates active template version
      -> creates or reuses idempotent document record
      -> renders deterministic file content
      -> writes storage object through platform storage boundary
      -> records checksum and file metadata
      -> links document to lead
      -> writes audit event
```

Dependency direction:

```text
SolarGRANT Pro product adapter
  -> Clada OS document service
    -> shared validation, Prisma, audit, permissions, storage abstraction
      -> Postgres or future object storage
```

Forbidden dependency:

```text
Clada OS document service
  -/-> SolarGRANT Pro lead, grant, quote, SEAI, or installer wording
```

### Options Considered

| Decision | Options | Recommended choice | Owner | ADR required |
| --- | --- | --- | --- | --- |
| Scope of document foundation | Upload review, generated documents, or full DMS. | Generated governed document foundation with compatibility plan for uploads. | CTO and CEO | Yes |
| Template storage | Repository-defined, database-authored, or hybrid. | Hybrid: repository-owned template source plus DB immutable version registry. | CTO | Yes |
| Generated file format | Persisted HTML, persisted PDF, or browser print only. | CTO to decide. Recommended foundation supports content type generically; proving slice may use stored HTML unless PDF renderer ADR is approved. | CTO and CEO | Yes |
| Storage backend | Database bytes, external object storage, or local filesystem. | Database-backed storage through an abstraction for Release 1.4; external object storage deferred unless file size or runtime evidence requires it. | CTO | Yes |
| Resource links | Single nullable lead foreign key or generic link table. | Generic `DocumentResourceLink` with one primary lead link in proving slice. | CTO | Yes |
| Generation execution | Synchronous request, background job, or scheduled job. | Synchronous for the small proving slice with durable failed state; async deferred. | CTO | Yes |
| Idempotency | None, request key only, or deterministic content hash. | Required idempotency key plus checksum; unique active generation by organisation, type, template version, resource, and key. | CTO | Yes |

## Domain Model

### Minimum Concepts

| Concept | Purpose | Release 1.4 recommendation |
| --- | --- | --- |
| Document type or definition | Names a kind of document without owning product copy. | Include as a namespaced registry key. |
| Document template | Product-owned template identity registered with the platform. | Include. |
| Document template version | Immutable version used to produce a document. | Include. |
| Generated document | Durable platform record for a rendered document. | Include as `Document`. |
| Document-resource link | Connects documents to leads or future resources. | Include. |
| Document generation request | Captures idempotent generation attempt. | Combine into `Document` generation fields for Release 1.4 unless ADR requires separate table. |
| Stored file or storage object | File bytes and storage metadata. | Include as fields or associated storage row. |
| Generation status | Tracks requested, stored, failed. | Include. |
| Lifecycle status | Tracks active, archived, deleted or erasure pending. | Include minimum. |

### Recommended Invariants

1. Every platform document belongs to exactly one organisation.
2. Every generated document references exactly one template version.
3. Template versions are immutable after creation.
4. Product-specific document keys are namespaced, for example `solargrant.lead_assessment_summary`.
5. A generated document may link to one or more resources, but Release 1.4 uses one primary lead link.
6. Resource links must carry the same organisation as the document.
7. A stored document must have content type, filename, storage key, size, checksum, and stored timestamp.
8. A failed generation record must not pretend a file exists.
9. A successful stored document must not be overwritten in place.
10. Downloads must be authorised through server-side organisation context and permissions.
11. Audit metadata must not contain raw document contents, merge values, signed URLs, tokens, or customer personal data beyond necessary identifiers.

### Ownership And Attribution

| Field group | Rule |
| --- | --- |
| Organisation ownership | Required on document, template where applicable, resource link, and audit event. Product templates may be globally registered but generated documents are organisation-owned. |
| Creator attribution | Store actor type, user id, membership id, organisation id, source, and created timestamp where available. |
| Mutable fields | Lifecycle status, archived timestamp/reason, failure fields for failed records, download counters only if approved. |
| Immutable fields | Template version, checksum, stored file metadata, generated content bytes, generation input hash, resource link identity after stored success. |
| Versioning | Template versions are append-only; activation moves from one version to another without mutating prior versions. |
| Lifecycle transitions | `REQUESTED -> STORED`, `REQUESTED -> FAILED`, `FAILED -> REQUESTED` through retry or new attempt, `STORED -> ARCHIVED`, `STORED -> ERASURE_PENDING -> DELETED` where erasure is approved. |
| Relationship to leads | Leads remain SolarGRANT Pro resources. The platform document record links through a generic resource link. |
| Multiple resources | Supported by model, but Release 1.4 should only implement one primary lead link unless a feature spec proves more is required. |

## Database Design

No schema or migration is created by this specification. The following is the proposed approval-gated design.

### Proposed Entities

| Entity | Key fields |
| --- | --- |
| `DocumentType` or `DocumentDefinition` | `id`, `key`, `namespace`, `kind`, `ownerModule`, `description`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplate` | `id`, `documentTypeId`, `key`, `ownerModule`, `renderer`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplateVersion` | `id`, `templateId`, `version`, `sourceChecksumSha256`, `mergeSchemaJson`, `rendererVersion`, `status`, `activatedAt`, `createdAt` |
| `Document` | `id`, `organisationId`, `documentTypeId`, `templateVersionId`, `title`, `lifecycleStatus`, `generationStatus`, `idempotencyKey`, `inputChecksumSha256`, `storageProvider`, `storageKey`, `fileName`, `contentType`, `sizeBytes`, `checksumSha256`, `failureCode`, `failureReason`, `createdBy fields`, `storedAt`, `failedAt`, `createdAt`, `updatedAt` |
| `DocumentResourceLink` | `id`, `organisationId`, `documentId`, `resourceType`, `resourceId`, `relationshipType`, `isPrimary`, `createdAt` |

### Constraints And Indexes

Required constraints and indexes should include:

- unique `DocumentType.key`;
- unique `DocumentTemplate(documentTypeId, key)`;
- unique `DocumentTemplateVersion(templateId, version)`;
- unique active template version per template if activation is modelled with an active flag;
- index `Document(organisationId, createdAt)`;
- index `Document(organisationId, documentTypeId, lifecycleStatus)`;
- index `Document(generationStatus, createdAt)` for failed or pending operational review;
- unique idempotency constraint for active generation, likely on `organisationId`, `documentTypeId`, `templateVersionId`, `idempotencyKey`;
- index `DocumentResourceLink(organisationId, resourceType, resourceId, createdAt)`;
- unique primary resource link per document;
- database constraint or service invariant that document and resource link organisation IDs match;
- checksum index if duplicate detection uses file checksum.

### Migration And Backfill Strategy

Release 1.4 implementation should be additive:

1. Create new platform document tables without removing `LeadDocument`.
2. Seed or register the first SolarGRANT Pro lead assessment template definition and immutable version only after ADR approval.
3. Do not backfill historical application packs as generated documents.
4. Do not migrate existing uploaded applicant documents into the platform document model in this release.
5. Optionally create compatibility views or service wrappers in later releases after a migration ADR.
6. Preserve current portal upload/download behavior.

Rollback limitations:

- additive tables can be ignored by rolled-back application code;
- generated document rows and stored bytes may remain unless a database rollback is performed;
- storage writes cannot be rolled back automatically if an external object store is later selected;
- generated documents should not become authoritative legal records until retention and deletion policy is approved.

## Permissions

### Existing Permissions

The current platform catalogue includes:

- `document.read`;
- `document.review`.

`document.read` is currently granted to organisation owners, admins, members, internal admins, and internal support. `document.review` is granted to organisation owners, organisation admins, and internal admins.

### Proposed Minimum Permissions

Release 1.4 should add only the keys required for the proving slice:

| Permission | Meaning | Recommended roles |
| --- | --- | --- |
| `document.generate` | Actor may request a generated document for an organisation-owned resource. | Organisation owner, organisation admin, Clada internal admin. |
| `document.download` | Actor may download stored document file contents. | Organisation owner, organisation admin, Clada internal admin; CTO to decide support/member access. |
| `document.read` | Actor may read document metadata in their organisation. | Keep existing role mapping unless CTO narrows it. |

Deferred permissions:

- `template.read`;
- `template.manage`;
- `document.archive`;
- `document.delete`;
- `document.share`;
- `document.search`.

### Enforcement Points

Permission checks must happen server side at:

- document generation request;
- document metadata read/list;
- secure download route;
- archive/delete action if included;
- template activation or management if implemented later.

Organisation scoping and permission checks are separate gates. Both must pass.

## Security

### Authentication And Authorisation

Authenticated organisation-member flows must resolve `OrganisationContext` server side before any document metadata or file content is read or written. Client-supplied organisation IDs, role names, permission names, resource IDs, template version IDs, and storage keys are not authoritative.

Public token flows remain separate. The existing homeowner portal document routes must not gain organisation permissions and must not become the generic document download model.

### Tenant Isolation

All document queries must be scoped by `organisationId`. Resource links must not allow a document in one organisation to point at a resource in another organisation. Cross-tenant denials should return safe not-found or unauthorized responses without revealing whether another organisation's document exists.

### Sensitive Data Handling

Generated lead assessment summaries may contain customer personal data, property details, quote information, eligibility analysis, and installer context. The platform must:

- avoid logging document contents;
- avoid storing raw merge values in audit metadata;
- avoid logging storage keys if they are sensitive;
- sanitize filenames;
- validate content type and size;
- prevent predictable public URLs;
- use `Cache-Control: private, no-store` for secure downloads unless CTO approves a different policy;
- keep audit metadata identifier-focused.

### Storage And Environment Risk

TD-015 states that Vercel Preview, Production, Development, and local development currently use the same Neon-hosted PostgreSQL database. If Release 1.4 stores generated document bytes in Postgres, Preview generation could write documents into production data. The implementation sprint must include an environment-isolation check and must not run destructive preview tests against shared production data.

TD-016 tracks removal of SMS because unmanaged mobile devices create privacy and retention risk. Release 1.4 must not add SMS delivery of generated documents.

## Services

### Platform Services

The platform should expose internal service contracts equivalent to:

```ts
type GenerateDocumentRequest = {
  context: OrganisationContext;
  documentTypeKey: string;
  templateKey: string;
  templateVersion?: number;
  idempotencyKey: string;
  title: string;
  resourceLinks: Array<{
    resourceType: string;
    resourceId: string;
    relationshipType: 'primary' | 'supporting';
  }>;
  mergeData: unknown;
  output: {
    contentType: string;
    fileName: string;
  };
  source: string;
};
```

Expected output:

```ts
type GenerateDocumentResult = {
  documentId: string;
  generationStatus: 'STORED' | 'FAILED';
  lifecycleStatus: 'ACTIVE';
  templateVersionId: string;
  storageKey?: string;
  checksumSha256?: string;
  sizeBytes?: number;
  reusedExisting: boolean;
  failureCode?: string;
};
```

Required errors:

- `DOCUMENT_TYPE_NOT_FOUND`;
- `DOCUMENT_TEMPLATE_NOT_FOUND`;
- `DOCUMENT_TEMPLATE_VERSION_NOT_ACTIVE`;
- `DOCUMENT_PERMISSION_DENIED`;
- `DOCUMENT_RESOURCE_NOT_FOUND`;
- `DOCUMENT_RESOURCE_NOT_IN_ORGANISATION`;
- `DOCUMENT_IDEMPOTENCY_CONFLICT`;
- `DOCUMENT_RENDER_FAILED`;
- `DOCUMENT_STORAGE_FAILED`;
- `DOCUMENT_DOWNLOAD_NOT_FOUND`;
- `DOCUMENT_DOWNLOAD_DENIED`.

### Product Services

SolarGRANT Pro should expose a product adapter equivalent to:

```ts
type GenerateLeadAssessmentSummaryRequest = {
  context: OrganisationContext;
  leadId: string;
  idempotencyKey: string;
};
```

The adapter owns:

- loading the lead through organisation-scoped access;
- collecting quote estimate and generated quote values;
- mapping lead data into a stable merge-data contract;
- choosing the SolarGRANT Pro template;
- deciding title and filename;
- invoking the platform document service;
- preserving current lead workflow behavior.

The platform document service must not import SolarGRANT Pro lead helper modules.

## APIs

API contracts should remain internal until the feature specifications define UI and route placement.

Minimum contracts likely needed after approval:

| API or action | Purpose | Permission |
| --- | --- | --- |
| Product server action or route to generate lead assessment summary | Invokes SolarGRANT Pro adapter for a lead. | `document.generate` plus organisation-scoped lead access. |
| Platform metadata read/list contract | Lists generated documents for a resource. | `document.read`. |
| Platform download route, for example `/api/documents/[documentId]/download` | Streams stored file content. | `document.download`. |

Request and response shapes must not expose storage keys, raw template source, raw merge values, or signed URLs unless an ADR approves signed URL semantics.

Versioning:

- service contracts should be versioned through template version and document type keys;
- breaking API shape changes require feature-spec and ADR updates;
- generated documents remain immutable even if template versions change.

## Transactions

Document generation includes database writes and storage writes. Storage writes cannot always participate in database transactions.

Recommended transaction strategy:

1. Start a database transaction.
2. Check permissions, organisation scope, resource existence, template version, and idempotency.
3. Create or reuse a `Document` record in `REQUESTED` status.
4. Commit the request record before rendering if rendering may be slow, or keep transaction short if rendering is guaranteed small.
5. Render content outside long-lived database locks.
6. Write file through storage abstraction.
7. Open a short database transaction to mark the document `STORED`, record metadata, create resource links if not already created, and write audit event.
8. If rendering or storage fails, mark the record `FAILED` with sanitized failure reason and write failure audit.

For the proving slice, CTO may approve a shorter single-request strategy only if rendering is fast and storage is database-backed. The feature specification must make the transaction boundary explicit.

## Concurrency

Concurrency risks:

- duplicate clicks on generate;
- concurrent requests from different authorised users;
- template activation while generation is running;
- storage success followed by database update failure;
- failed request retry colliding with prior idempotency key;
- resource deleted during generation;
- stale lead data between merge-data load and storage.

Required strategy:

- caller must provide or server must derive an idempotency key;
- unique constraint must allow only one active document for the same organisation, document type, template version, resource, and idempotency key;
- generation must pin a specific template version before rendering;
- same idempotency key with same inputs should return the existing document result;
- same idempotency key with conflicting input checksum should fail with idempotency conflict;
- storage success followed by database failure must create a compensating failure or cleanup path;
- resource deletion during generation must fail safely before a stored active document is exposed.

## Threat Analysis

| Threat | Mitigation |
| --- | --- |
| Cross-tenant document access | Scope all reads/writes by organisation and test denial. |
| Insecure direct object reference | Download route loads by `documentId` plus organisation context, never storage key alone. |
| Predictable download URLs | Do not expose storage URLs directly; stream through authorised route. |
| Malicious filenames | Sanitize generated and uploaded filenames; strip path separators and control characters. |
| Malicious content type | Renderer sets known content type; uploads keep strict allowlist. |
| Oversized payloads | Set generated output and upload size limits; reject or fail safely. |
| Template injection | Use repository-defined templates and validated merge schema; escape user values by default. |
| HTML/PDF rendering risk | Disable remote assets unless explicitly approved; avoid server-side request forgery. |
| Log leakage | Do not log raw merge data, customer data, document contents, tokens, or storage keys. |
| Audit leakage | Store identifiers, statuses, checksums, and counts only. |
| Privilege escalation | Server ignores client-supplied permission and role values. |
| Duplicate generation | Enforce idempotency and uniqueness. |
| Template activation race | Pin template version at request start. |
| Shared Preview/Production DB | Treat TD-015 as a release risk; require environment check before generating documents in Preview. |
| SMS/document delivery leakage | Do not add SMS delivery; keep TD-016 in view. |
| Employee access risk | Internal access must be membership-scoped, permission-controlled, and auditable. |

## Failure Modes

| Failure | Expected behavior |
| --- | --- |
| Missing organisation context | Reject before document lookup or rendering. |
| Missing permission | Reject before document lookup or rendering. |
| Resource not found | Return safe not-found; do not reveal cross-tenant existence. |
| Template missing/inactive | Fail with typed configuration error. |
| Merge data invalid | Fail before rendering and record sanitized failure if a generation record exists. |
| Renderer error | Mark generation failed; no active stored file is exposed. |
| Storage write failure | Mark generation failed; include sanitized failure code. |
| Database update failure after storage | Attempt cleanup or record orphan cleanup task; feature spec must define exact behavior. |
| Duplicate request | Return existing document when idempotency and input checksum match. |
| Idempotency conflict | Reject and do not overwrite existing document. |
| Download of failed document | Return not found or unavailable. |
| Download after archive | Deny or require explicit archive access; CTO decision required. |

Operational observability should include generated/failure counts, failure codes, and audit events without document contents.

## Testing

Implementation must include tests proportionate to platform persistence and security risk:

- unit tests for document type key validation and namespace rules;
- unit tests for template version immutability and activation rules;
- unit tests for merge-schema validation and missing-data behavior;
- unit tests for filename sanitisation and content type selection;
- unit tests for checksum calculation;
- permission tests for `document.generate`, `document.read`, and `document.download`;
- tenant isolation tests for cross-organisation generation, read, and download denial;
- PostgreSQL integration tests for database constraints, resource link organisation consistency, idempotency uniqueness, failed generation state, and concurrency;
- audit tests confirming no document contents, merge values, tokens, or raw files enter metadata;
- storage tests for successful write, read, checksum verification, and failure handling;
- SolarGRANT Pro regression tests proving existing lead intake, portal uploads, application pack pages, quote data, and workflow stage changes remain compatible;
- migration tests proving additive schema changes and no destructive migration of `LeadDocument`.

Because this task creates documentation only, no implementation tests are added in this branch.

## Validation

This specification branch must run documentation-focused validation only. A production application build is not required unless documentation changes unexpectedly affect build-time behavior.

Required commands for this branch:

- document metadata validation for durable Markdown files;
- internal Markdown link validation;
- COM navigation validation;
- placeholder scan;
- `git diff --check`.

Implementation branches after approval should additionally run:

- `pnpm exec prisma format`;
- `pnpm exec prisma validate`;
- `pnpm exec prisma generate`;
- migration validation from approved baseline;
- `pnpm test`;
- PostgreSQL integration tests;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm build` if runtime code changes or release policy requires it.

Do not claim a check passed unless it ran successfully.

## Migration

Release 1.4 implementation should migrate from the approved baseline additively.

Fresh database deployment:

1. Apply existing migrations through Platform Release 1.3.
2. Apply new document foundation migration after approval.
3. Seed or register initial document type/template/version records through approved migration or seed path.
4. Verify constraints and indexes.
5. Verify the SolarGRANT Pro proving slice can generate one document in a disposable environment.

Approved-baseline deployment:

1. Back up target database before migration.
2. Verify environment isolation, especially TD-015.
3. Apply additive document tables.
4. Do not mutate existing `LeadDocument` rows.
5. Do not backfill generated documents from historical application packs.
6. Verify existing portal upload/download, lead detail, application pack, submission package JSON, workflow stage changes, and quote pricing still work.

Rollback:

- application rollback can ignore additive tables;
- database rollback requires dropping new tables only if no later release depends on them;
- generated documents created before rollback may remain in the database and require documented cleanup if not acceptable.

## Sprint Breakdown

1. Approval gate: CTO reviews and approves architecture decisions in this Master Release Specification.
2. Approval gate: CEO approves business value, proving slice, scope, cost, timing, and deferrals.
3. Create required ADRs.
4. Create required feature specifications.
5. Plan implementation sprint and validation gates.
6. Add additive schema and migrations.
7. Implement template registry and immutable version handling.
8. Implement storage abstraction and generated document persistence.
9. Implement document generation service.
10. Implement secure document download.
11. Implement permissions and audit events.
12. Implement SolarGRANT Pro lead assessment summary proving slice.
13. Add unit, permission, tenant, audit, storage, migration, and PostgreSQL integration tests.
14. Run full validation.
15. Open implementation draft PR.
16. Complete CTO review.
17. Complete CEO approval.
18. Merge only after approval.
19. Tag release only after explicit instruction.
20. Update roadmap only at release close.

## Deliverables

This documentation-only branch delivers:

- this Master Release Specification;
- release-specification index update;
- COM summary navigation update.

Approval-gated implementation deliverables should include:

- ADRs listed below;
- feature specifications listed below;
- additive Prisma schema and migration;
- platform document service;
- template version registry;
- storage abstraction;
- secure download route;
- permissions catalogue update;
- audit events;
- SolarGRANT Pro proving-slice adapter and product surface;
- focused automated tests;
- validation evidence;
- draft implementation PR.

### Required ADR Plan

1. Core document domain model.
2. Template storage and immutable versioning.
3. Generated-file storage strategy.
4. Document generation execution model.
5. Resource-link model.
6. Secure document retrieval.
7. Existing document concept compatibility and migration strategy.
8. Generated output format and renderer choice, if PDF or another renderer is introduced.

### Required Feature-Specification Plan

1. Platform document registry.
2. Template and template-version management.
3. Document generation service.
4. Document persistence and storage.
5. Document permissions and audit.
6. Secure document download.
7. SolarGRANT Pro lead assessment summary proving slice.
8. Existing document compatibility and regression protection.

## Acceptance Criteria

Release 1.4 is acceptable for implementation review only when:

- the Master Release Specification is approved by CTO and CEO;
- required ADRs are complete and linked;
- required feature specifications are complete and linked;
- implementation is limited to approved scope;
- no solar-specific terminology leaks into platform domain model except namespaced product keys;
- document generation is organisation-scoped, permission-protected, audited, and idempotent;
- generated documents are attributable to immutable template versions;
- stored files have content type, filename, size, checksum, and storage metadata;
- failed generation produces a durable, sanitized failure state;
- secure downloads cannot bypass organisation and permission checks;
- existing `LeadDocument`, customer portal, application pack, submission package, quote, workflow, and audit behavior remains compatible;
- tests cover permissions, tenant isolation, audit, idempotency, concurrency, storage, and migration risks;
- validation commands are run and recorded honestly;
- draft PR remains unmerged until CTO review and CEO approval complete.

## Release Planning Checklist

This checklist is pending in the first draft.

| Area | Item | Status |
| --- | --- | --- |
| Business | Customer problem is clear. | Pending |
| Business | Business value is documented. | Pending |
| Business | Reason for timing is justified. | Pending |
| Business | Proving-slice value is accepted. | Pending |
| Business | Commercial or operational risk is understood. | Pending |
| Platform | Reuse by at least two products is credible. | Pending |
| Platform | Clada OS ownership is correct. | Pending |
| Platform | Product isolation is preserved. | Pending |
| Platform | Compatibility with existing platform foundations is clear. | Pending |
| Platform | Future capabilities enabled are documented. | Pending |
| Engineering | Architecture is approved. | Pending |
| Engineering | Schema approach is approved. | Pending |
| Engineering | Permissions are approved. | Pending |
| Engineering | Audit expectations are approved. | Pending |
| Engineering | Tenant isolation strategy is approved. | Pending |
| Engineering | Storage strategy is approved. | Pending |
| Engineering | Transaction strategy is approved. | Pending |
| Engineering | Concurrency strategy is approved. | Pending |
| Engineering | Threat analysis is reviewed. | Pending |
| Engineering | Migration strategy is approved. | Pending |
| Engineering | Test strategy is approved. | Pending |
| Engineering | Observability expectations are approved. | Pending |
| Engineering | Rollback limitations are accepted. | Pending |
| Engineering | Technical debt impact is accepted. | Pending |
| Approval | CTO architecture approval. | Pending |
| Approval | CEO specification approval. | Pending |
| Approval | ADR completion. | Pending |
| Approval | Feature-specification completion. | Pending |
| Approval | Sprint approval. | Pending |
| Approval | Implementation authorisation. | Pending |

## Known Deferrals

Release 1.4 intentionally defers:

- full document management product behavior;
- migration of existing `LeadDocument` uploads;
- generic customer document collaboration;
- external object storage vendor selection unless an ADR proves it is needed now;
- public anonymous document links;
- signed URL infrastructure unless secure retrieval ADR approves it;
- template editor or customer-authored templates;
- AI-authored content;
- OCR and document extraction expansion;
- bulk or scheduled generation;
- workflow-triggered automatic generation;
- notification delivery of generated documents;
- full retention automation;
- full document search;
- folders and sharing between organisations;
- full forms foundation;
- Release 1.5 notification capabilities.

## Technical Debt

No new technical debt is introduced by this documentation-only branch.

Implementation must account for existing technical debt:

- `TD-002`: no CI or single validation command.
- `TD-005`: durable documentation validation script is missing.
- `TD-007`: direct Prisma access remains in some legacy contexts.
- `TD-009`: no database row-level security.
- `TD-011`: `Lead.pipelineStage` remains a workflow compatibility projection.
- `TD-013`: deployment readiness needs migration status checks.
- `TD-015`: Preview, Production, Development, and local development currently share one hosted database.
- `TD-016`: SMS should be removed from intake before wider installer onboarding or commercial scale.

Release 1.4 should not update the technical-debt register merely to track a missing future capability. It should update the register only if implementation introduces, resolves, or accepts material debt.

## Future Releases

This foundation enables later work:

- migration or wrapping of uploaded applicant documents into platform document records;
- product-configured document checklists;
- generated quotes, contracts, proposals, and compliance records;
- SOLARfarm Pro assessment reports;
- roofing, HVAC, plumbing, construction, or landscaping proposals and compliance documents;
- document-aware notifications in Platform Release 1.5 or later;
- module configuration for document types and checklist values;
- AI-assisted document summarisation or extraction under AI governance;
- operational reporting from document generation, upload, review, and download events;
- object storage adoption if file volume or runtime constraints justify it;
- retention and deletion automation after privacy and records policy approval.

## CTO Review

| Field | Value |
| --- | --- |
| Status | Pending |
| Reviewer | CTO |
| Date | Pending |
| Notes | Pending |

### CTO Decisions Still Required

1. Approve generated governed document foundation as the Release 1.4 focus instead of migrating uploaded homeowner documents first.
2. Approve the minimum domain model and whether `DocumentGenerationRequest` is combined into `Document` for Release 1.4.
3. Approve the template strategy: repository-defined template source plus immutable DB version registry.
4. Decide generated output format for the proving slice: stored HTML, stored PDF, or another approved format.
5. Approve rendering library or explicitly defer PDF generation.
6. Approve database-backed storage for Release 1.4 or require object storage ADR before implementation.
7. Approve resource-link model and organisation consistency constraints.
8. Approve idempotency and concurrency strategy.
9. Approve permission keys and role mapping, especially whether `document.download` is separate from `document.read`.
10. Approve audit action names and denied/failure audit policy.
11. Approve secure download design and whether signed URLs are deferred.
12. Approve compatibility strategy for `LeadDocument`, portal uploads, application packs, and submission-package exports.
13. Confirm TD-015 mitigation required before preview or production document generation tests.

## CEO Approval

| Field | Value |
| --- | --- |
| Status | Pending |
| Approver | CEO |
| Date | Pending |
| Notes | Pending |

### CEO Decisions Still Required

1. Confirm business value of generated lead assessment summaries as the proving slice.
2. Confirm the release should prioritise governed generated documents over upload checklist migration.
3. Confirm the customer-facing or installer-facing value of the assessment summary.
4. Confirm acceptable first-slice output format if PDF is deferred or requires extra engineering cost.
5. Confirm scope deferrals, especially template editor, e-signatures, document delivery, and full records management.
6. Confirm no new external storage vendor is required for this release unless CTO evidence changes the recommendation.
7. Confirm commercial risk acceptance around TD-015 until environments are isolated.

## Release Sign-Off

| Field | Value |
| --- | --- |
| Draft PR | Pending |
| CTO review | Pending |
| CEO approval | Pending |
| Merge commit | Pending |
| Release tag | Pending |
| Roadmap update | Pending |

This section must remain pending until release close. This draft does not authorise implementation, merge, release tag, or roadmap completion updates.

