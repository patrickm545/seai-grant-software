# Platform Release 1.4 - Document Foundation Master Specification

| Field | Value |
| --- | --- |
| Document ID | REL-PLATFORM-1.4 |
| Status | Approved |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-14 |
| Release | Platform Release 1.4 |
| Approved baseline | 63b08fa87a61569c6ff4adbda730e75d86a9d31e |
| Target branch | codex/platform-release-1.4-master-spec |
| CTO approval | Approved |
| CEO approval | Approved |

## Executive Summary

Platform Release 1.4 will create the first reusable Clada OS document foundation for governed generated documents. The release will let product modules generate, store, retrieve, secure, audit, and reason about generated business documents without embedding document mechanics inside SolarGRANT Pro.

The approved proving slice is to generate and securely download a professional SolarGRANT Pro lead assessment summary PDF from existing lead data, store it as a governed Clada OS document record, link it to the lead, audit generation and download activity, and make it available only through an authenticated, authorised server route. This slice is intentionally narrower than a full document management product.

The release must not treat SolarGRANT Pro as the platform. Clada OS should own the reusable document record, template-version attribution, storage metadata, generation status, access control, audit contracts, idempotency, and resource-link mechanics. SolarGRANT Pro should own the lead summary template, grant-specific wording, quote wording, merge-data mapping, branding, and the product surface that invokes generation.

The first assessment summary is primarily installer-facing. It should help the installer review the lead and prepare for customer follow-up. It must not imply binding quotation, grant approval, technical site survey, financial advice, guaranteed savings, or contract status.

Although this Master Release Specification has CTO architecture approval and CEO approval, Release 1.4 implementation must not begin until required ADRs are complete, feature specifications are complete, sprint scope is approved, and explicit implementation authorisation is granted.

PR #12 may merge after CTO and CEO approval and successful documentation validation so this Master Release Specification becomes the authoritative repository baseline for subsequent ADR and feature-specification work. Merging PR #12 does not authorise implementation. The later Platform Release 1.4 implementation PR must remain unmerged until CTO review, CEO approval, testing, validation, and release sign-off are complete.

## Business Context

Contractor-led businesses routinely create and manage business documents: assessments, quotes, proposals, contracts, compliance records, reports, application packs, customer correspondence, and evidence records. These documents need consistent ownership, access control, file integrity, auditability, and retrieval across product modules.

SolarGRANT Pro already exposes several document-adjacent workflows:

- customer and public intake document metadata through `LeadDocument`;
- customer portal uploads and downloads;
- document review statuses;
- manual application-pack pages and JSON exports;
- installer quote estimates and generated quote data;
- audit and lead activity records for selected document actions.

Those workflows are useful, but they are not a reusable platform generated-document foundation. They are mostly tied to SolarGRANT Pro leads, grant wording, portal tokens, and application-pack views. Platform Release 1.4 will not prioritise migration of homeowner-uploaded documents. Existing `LeadDocument`, portal upload/download, application pack, submission package, and intake upload behaviour must remain unchanged during this release.

The timing is justified because Platform Releases 1.1 through 1.3 have established the foundations this capability depends on:

- organisation ownership and tenant scoping;
- users, roles, permissions, and actor context;
- actor-aware audit logging;
- reusable workflow definitions, instances, transitions, and history.

Generated-document creation, storage, and retrieval should build on those foundations rather than creating parallel access, audit, or workflow mechanics.

## Strategic Objectives

1. Establish a reusable platform document domain that can support governed generated business documents across multiple products.
2. Preserve the boundary between product-owned document content and platform-owned document mechanics.
3. Prove the foundation through one useful SolarGRANT Pro slice without turning the release into a full document management system.
4. Create an approval-gated path for ADRs, feature specifications, schema, services, APIs, tests, and sprint planning.
5. Avoid premature external storage vendors, template editors, AI-authored document content, and broad document lifecycle automation.
6. Improve trust by making generated documents organisation-owned, permission-protected, auditable, attributable to a template version, and safe to retrieve.

## Scope

Release 1.4 should include the specification, approval-gated design, and eventual implementation of the following after approval:

- platform document domain model for governed generated documents;
- document definition registry with product-neutral mechanics and product namespace support;
- repository-owned product templates registered by Clada OS with immutable template versions;
- generated document record with organisation owner, lifecycle status, generation status, storage metadata, file metadata, checksum, template-version attribution, and actor attribution;
- document-resource links, initially for a generated document linked to a SolarGRANT Pro lead;
- document generation service contract with deterministic merge data, idempotency, duplicate prevention, failure state, and retry rules;
- deterministic PDF generation for the SolarGRANT Pro proving slice, using `application/pdf`, sanitized `.pdf` filenames, file size, and SHA-256 checksum metadata;
- database-backed generated-file storage behind a platform storage abstraction, with future object-storage compatibility;
- secure organisation-scoped document download path;
- minimum permissions required for generation, metadata read, and download;
- audit events for requested, generated, failed, downloaded, and archived document lifecycle actions where in scope;
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
- prioritised migration of homeowner-uploaded documents;
- implemented GDPR erasure or retention automation states;
- portal-token replacement for customer document upload and download flows;
- local filesystem storage in deployed environments;
- broad product UI redesign.

## Platform Responsibilities

Clada OS should own these product-neutral document responsibilities in Release 1.4 or explicitly defer them:

| Responsibility | Release 1.4 recommendation | Reason |
| --- | --- | --- |
| Document definitions | Include minimum registry. | Product modules need namespaced document keys without hard-coding solar concepts into platform mechanics. |
| Document templates | Include as platform-managed registrations for product-owned repository template sources. | The platform needs attribution and activation mechanics; the product owns content. |
| Immutable template versions | Include activated snapshots or canonical serialized representations. | Generated documents must remain traceable to the exact source version, even if repository files later change or disappear. |
| Generated document records | Include. | This is the central foundation. |
| Source template version attribution | Include. | Required for auditability and deterministic regeneration analysis. |
| Document metadata | Include minimum metadata. | Title, key, content type, size, checksum, status, and timestamps are reusable. |
| Organisation ownership | Include. | Documents contain customer and business data and must be tenant-scoped. |
| Document lifecycle state | Include minimum states. | Release 1.4 uses `ACTIVE` and `ARCHIVED`; GDPR erasure and retention processes remain future-compatible but unimplemented. |
| Storage references | Include database-backed generated-file storage behind an abstraction. | Retrieval and future object storage require a stable boundary; local filesystem storage is forbidden for deployed environments. |
| File metadata | Include. | Sanitized `.pdf` filename, `application/pdf`, size, checksum, and storage key are needed for trust and download. |
| Checksum or integrity metadata | Include SHA-256. | Generated files should be tamper-evident and duplicate-safe. |
| Generation status | Include. | Requested, stored, failed, and retry states need durable tracking. |
| Failure status and failure metadata | Include. | Failed records need sanitized failure code, safe operational category, and failed timestamp without provider error text or personal data. |
| Document access permissions | Include minimal keys. | Generation and download should not rely only on lead access. |
| Audit events | Include minimum required events. | Trust and traceability are platform responsibilities. |
| Service contracts for document generation | Include. | Product modules should call stable platform contracts. |
| Idempotency or duplicate prevention | Include. | Concurrent requests must not produce uncontrolled duplicates. |
| Links between documents and platform resources | Include generic link table or equivalent. | Leads are the first resource; future products need other resources. |
| Retention and deletion foundations | Keep architecture compatible; do not implement lifecycle states beyond `ACTIVE` and `ARCHIVED`. | Full records management, retention automation, and GDPR erasure workflows require later policy and implementation approval. |
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
| Installer-facing layouts | Own the professional SolarGRANT Pro PDF design, including disclaimers and product-specific presentation. |
| Solar-specific template content | Own the repository template source. |
| Generation timing | Decide when a lead assessment summary should be generated. |
| Product UI invocation | Own the installer/admin control that requests generation. |
| Assessment-summary disclaimers | Own disclaimers that the PDF is not a binding quote, grant approval, site survey, financial advice, guaranteed savings statement, or contract. |

Solar-specific concepts must not become platform enum values, platform roles, generic document lifecycle states, or generic service names.

The lead assessment summary is installer-facing in Release 1.4. It helps the installer review the lead and prepare customer follow-up. It may later evolve into a customer-facing assessment, but this release must not imply that the generated document is a binding quotation, formal grant approval, technical site survey, financial advice, guaranteed savings statement, or contract.

## Architecture

### Current-State Assessment

Repository inspection found these existing capabilities:

| Area | Current state | Release 1.4 treatment |
| --- | --- | --- |
| `LeadDocument` | SolarGRANT Pro lead-owned upload records with type, status, file metadata, storage path/URL, optional `contentBytes`, extracted text, and AI fields. | Leave unchanged in Release 1.4. Reuse lessons and plan any future migration/wrapping through ADR. |
| Portal uploads | `/portal/[token]/documents` validates size, MIME type, and sanitized filenames, then stores bytes in Postgres and records activity/audit. | Reuse validation ideas and storage evidence. Do not make token access the generic download model. |
| Portal downloads | `/portal/[token]/documents/[documentId]` serves DB bytes or redirects to storage URL when token matches parent lead. | Keep as customer-token flow. Do not treat as organisation permission enforcement. |
| Intake applicant documents | Public intake stores metadata and `uploaded://...` references, not file bytes. | Do not use as proof of durable file storage. Preserve compatibility. |
| Document checklist | `lib/documents.ts` has SolarGRANT Pro document labels and required uploaded-document checklist. | Keep product-specific. Platform registry should not absorb those labels. |
| Application pack | `lib/application-pack.ts` and `ApplicationPackView` build a manual SEAI prep view from lead data and documents. | Reuse as product evidence and possible merge-data source. Do not treat it as a governed document record. |
| Print-friendly pack | A Next.js print page renders HTML suitable for browser print. | Existing PDF-friendly UI is not persisted PDF generation. |
| Submission package JSON | `/api/submission-package` emits a structured JSON package for manual review. | Useful source for merge data, not a stored document. |
| Portal fill preview JSON | `/api/portal-fill-preview` emits manual reference fields. | Leave product-specific. |
| Quote estimates | `lib/quote-estimate.ts` and `lib/installer-quote-pricing.ts` produce solar-specific estimate and generated quote JSON. | SolarGRANT Pro owns wording and calculations used in the assessment summary. |
| Permissions | `document.read` and `document.review` exist in the platform permission catalogue. | Add approved `document.generate` and `document.download`; keep `document.download` separate from `document.read`. |
| Audit | `lib/audit.ts` writes actor-aware audit records and sanitizes sensitive keys. | Reuse. Add document-specific audit action names and resource metadata. |
| Workflow | `lib/workflow.ts` supports organisation-scoped transition execution with audit and history. | Document generation should remain workflow-independent in Release 1.4. |
| Storage | Mixed behavior: DB bytes for portal uploads, placeholder upload URLs for intake, storage URL fields, no object storage abstraction. | Define a platform storage boundary. Use database-backed generated-file storage for the proving slice; external object storage is deferred until evidence requires it. |

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
      -> renders deterministic PDF content
      -> writes database-backed storage object through platform storage boundary
      -> records checksum and file metadata
      -> links document to lead
      -> writes audit event
```

Template strategy:

- SolarGRANT Pro owns the repository template source and product wording.
- Clada OS owns template registration and immutable version attribution.
- Each activated template version must preserve an immutable snapshot or canonical serialized representation sufficient to prove exactly what produced the document.
- A checksum or repository path alone is not sufficient if the referenced source can later change or disappear.
- Existing template versions must never be edited in place.
- A new template change creates a new version.
- Generated documents permanently reference the exact template version used.
- The template format and renderer-specific representation remain subject to the renderer ADR.

PDF output rules:

- the proving-slice deliverable is a persisted PDF document;
- stored HTML is not the approved installer-facing deliverable;
- the PDF must be generated deterministically from approved merge data;
- the PDF must use a professional SolarGRANT Pro layout;
- the generated file must be immutable after storage;
- the content type must be `application/pdf`;
- the filename must be sanitized and end in `.pdf`;
- size and SHA-256 checksum must be recorded;
- download must happen only through an authenticated, authorised server route.

Storage strategy:

- Release 1.4 uses database-backed generated-file storage behind a platform storage abstraction.
- This is acceptable because the first proving slice produces a small number of bounded PDF documents.
- The feature specification must define a strict maximum generated PDF size, storage abstraction contracts, safe streaming, checksum calculation, content-type enforcement, file metadata, failure behaviour, and future object-storage compatibility.
- External object storage is deferred until volume, file size, performance, or operating-cost evidence requires it.
- Local filesystem storage is forbidden for deployed environments.

Dependency direction:

```text
SolarGRANT Pro product adapter
  -> Clada OS document service
    -> shared validation, Prisma, audit, permissions, storage abstraction
      -> Postgres-backed generated-file storage or future object storage
```

Forbidden dependency:

```text
Clada OS document service
  -/-> SolarGRANT Pro lead, grant, quote, SEAI, or installer wording
```

Workflow behaviour:

- document generation remains independent of the workflow engine;
- a SolarGRANT Pro product surface may invoke generation while viewing a lead;
- Release 1.4 must not automatically generate documents on workflow transitions;
- Release 1.4 must not change lead pipeline stages;
- Release 1.4 must not require new workflow definitions;
- Release 1.4 must not write workflow history for ordinary document generation.

### Options Considered

| Decision | Options | Recommended choice | Owner | ADR required |
| --- | --- | --- | --- | --- |
| Scope of document foundation | Upload review, generated documents, or full DMS. | Locked: governed generated documents with existing upload behaviours unchanged. | CTO and CEO | Yes |
| Template storage | Repository-defined, database-authored, or hybrid. | Locked: SolarGRANT Pro owns repository template source; Clada OS owns registration and immutable activated template snapshots. | CTO | Yes |
| Generated file format | Persisted HTML, persisted PDF, or browser print only. | Locked: persisted PDF for the proving slice. Renderer/library selection remains an ADR decision. | CTO | Yes |
| Storage backend | Database bytes, external object storage, or local filesystem. | Locked: database-backed generated-file storage behind a platform abstraction for Release 1.4; local filesystem forbidden in deployed environments. | CTO | Yes |
| Resource links | Single nullable lead foreign key or generic link table. | Locked: generic `DocumentResourceLink`, with only `resourceType = lead` and one primary lead link implemented and tested in Release 1.4. | CTO | Yes |
| Generation execution | Synchronous request, background job, or scheduled job. | Locked: synchronous generation with durable `REQUESTED`, `STORED`, and `FAILED` states. | CTO | Yes |
| Idempotency | None, request key only, or deterministic content hash. | Locked: caller-supplied idempotency key combined with organisation, document definition, template version, primary resource, and operation. | CTO | Yes |

Renderer/library selection remains unresolved and must be evaluated in ADR 2 using Vercel compatibility, deterministic output, maintenance burden, cold-start and bundle impact, security, typography and layout quality, testability, licensing, and support for page breaks, headers, footers, and tables.

## Domain Model

### Minimum Concepts

| Concept | Purpose | Release 1.4 direction |
| --- | --- | --- |
| `DocumentDefinition` | Represents a namespaced product-owned document kind, such as `solargrant.lead_assessment_summary` or future `solarfarm.site_assessment_report`. | Include. |
| `DocumentTemplate` | Represents a template identity for a document definition. | Include. |
| `DocumentTemplateVersion` | Represents an immutable activated template snapshot/version. | Include. |
| `Document` | Represents one generation attempt and its final generated-document state. | Include; do not create a separate `DocumentGenerationRequest` table in Release 1.4. |
| `DocumentResourceLink` | Provides product-neutral links between documents and resources. | Include; implement and test only `resourceType = lead` with one primary lead link per generated document. |

Generation statuses are limited to `REQUESTED`, `STORED`, and `FAILED`.

Lifecycle statuses are limited to `ACTIVE` and `ARCHIVED`.

### Recommended Invariants

1. Every platform document belongs to exactly one organisation.
2. Every generated document references exactly one template version.
3. Template versions are immutable after creation.
4. Product-specific document keys are namespaced, for example `solargrant.lead_assessment_summary`.
5. A generated document may be architecturally compatible with multiple resource links, but Release 1.4 implements and tests only one primary lead link.
6. Resource links must carry the same organisation as the document.
7. A stored document must have `application/pdf`, sanitized `.pdf` filename, storage key, size, SHA-256 checksum, and stored timestamp.
8. A failed generation record must not pretend a file exists and must contain only sanitized failure code, safe operational category, and failed timestamp.
9. A successful stored document must not be overwritten in place.
10. Downloads must be authorised through server-side organisation context and permissions.
11. Audit metadata must not contain raw document contents, merge values, signed URLs, tokens, or customer personal data beyond necessary identifiers.
12. Existing activated template versions must never be edited in place; each template change creates a new version.
13. Each activated template version must preserve an immutable snapshot or canonical serialized representation sufficient to prove exactly what produced the document; a checksum or repository path alone is not sufficient.

### Ownership And Attribution

| Field group | Rule |
| --- | --- |
| Organisation ownership | Required on document, template where applicable, resource link, and audit event. Product templates may be globally registered but generated documents are organisation-owned. |
| Creator attribution | Store actor type, user id, membership id, organisation id, source, and created timestamp where available. |
| Mutable fields | Lifecycle status between `ACTIVE` and `ARCHIVED`, archived timestamp/reason, and failure fields before or when a record enters `FAILED`. |
| Immutable fields | Template version, checksum, stored file metadata, generated PDF bytes, generation input hash, idempotency identity, and primary resource link identity after stored success. |
| Versioning | Template versions are append-only; activation moves from one version to another without mutating prior versions. |
| Generation transitions | `REQUESTED -> STORED` or `REQUESTED -> FAILED`. A retry may reuse the same active attempt only where the feature specification permits; a different idempotency key may intentionally create a new immutable generated assessment. |
| Lifecycle transitions | `ACTIVE -> ARCHIVED`. `DELETED` and `ERASURE_PENDING` are not implemented Release 1.4 lifecycle states. |
| Relationship to leads | Leads remain SolarGRANT Pro resources. The platform document record links through a generic resource link. |
| Multiple resources | Architecture-compatible only. Release 1.4 implements and tests only `resourceType = lead`. |

## Database Design

No schema or migration is created by this specification. The following is the proposed approval-gated design.

### Proposed Entities

| Entity | Key fields |
| --- | --- |
| `DocumentDefinition` | `id`, `key`, `namespace`, `kind`, `ownerModule`, `description`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplate` | `id`, `documentDefinitionId`, `key`, `ownerModule`, `renderer`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplateVersion` | `id`, `templateId`, `version`, immutable template snapshot or canonical serialized representation, `sourceChecksumSha256`, `mergeSchemaJson`, `rendererVersion`, `status`, `activatedAt`, `createdAt` |
| `Document` | `id`, `organisationId`, `documentDefinitionId`, `templateVersionId`, `title`, `lifecycleStatus`, `generationStatus`, `idempotencyKey`, `idempotencyOperation`, `inputChecksumSha256`, `storageProvider`, `storageKey`, `fileName`, `contentType`, `sizeBytes`, `checksumSha256`, `failureCode`, `failureCategory`, `createdBy fields`, `storedAt`, `failedAt`, `createdAt`, `updatedAt` |
| `DocumentResourceLink` | `id`, `organisationId`, `documentId`, `resourceType`, `resourceId`, `relationshipType`, `isPrimary`, `createdAt` |

### Constraints And Indexes

Required constraints and indexes should include:

- unique `DocumentDefinition.key`;
- unique `DocumentTemplate(documentDefinitionId, key)`;
- unique `DocumentTemplateVersion(templateId, version)`;
- unique active template version per template if activation is modelled with an active flag;
- index `Document(organisationId, createdAt)`;
- index `Document(organisationId, documentDefinitionId, lifecycleStatus)`;
- index `Document(generationStatus, createdAt)` for failed or pending operational review;
- unique idempotency constraint for active generation on organisation, document definition, template version, primary resource, operation, and idempotency key;
- index `DocumentResourceLink(organisationId, resourceType, resourceId, createdAt)`;
- unique primary resource link per document;
- Release 1.4-only constraint or service invariant that the primary link uses `resourceType = lead`;
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

Hosted migration gate:

- Production must use its own database.
- Preview must use a separate database or isolated Neon branch.
- Development and local environments must not point at the production database.
- Database fingerprints must be documented and verified before migration.
- Destructive or stress tests must never run against production customer data.

Local Release 1.4 implementation may begin before hosted database isolation is complete, but hosted migration, preview generation tests, and document-storage tests may not.

Rollback limitations:

- additive tables can be ignored by rolled-back application code;
- generated document rows and stored bytes may remain unless a database rollback is performed;
- database-backed storage writes require compensation if a later database update fails;
- generated documents should not become authoritative legal records until retention and deletion policy is approved.

## Permissions

### Existing Permissions

The current platform catalogue includes:

- `document.read`;
- `document.review`.

`document.read` is currently granted to organisation owners, admins, members, internal admins, and internal support. `document.review` is granted to organisation owners, organisation admins, and internal admins.

### Approved Minimum Permissions

Release 1.4 uses only the keys required for the proving slice:

| Permission | Meaning | Initial role mapping |
| --- | --- | --- |
| `document.read` | Actor may view governed document metadata. | Organisation owner, organisation admin, organisation member, Clada internal admin, and internal support. |
| `document.generate` | Actor may request a generated document for an organisation-owned resource. | Organisation owner, organisation admin, and Clada internal admin when operating within authorised organisation context. |
| `document.download` | Actor may access stored file bytes. | Organisation owner, organisation admin, and Clada internal admin when operating within authorised organisation context. |

Deferred permissions:

- `template.read`;
- `template.manage`;
- `document.archive`;
- `document.delete`;
- `document.share`;
- `document.search`.

`document.download` must remain separate from `document.read`. Organisation members and internal support receive metadata read only by default. Internal support download requires an explicitly approved support process outside this release's default role mapping.

The existing `document.review` permission remains available for current document-review behaviour but is not part of the governed generated-document proving slice.

Template-management permissions are not added in Release 1.4 because templates are repository-owned and deployment-managed.

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
- set `Content-Type: application/pdf`;
- set safe `Content-Disposition`;
- use `Cache-Control: private, no-store` for secure downloads;
- keep audit metadata identifier-focused.

### Storage And Environment Risk

TD-015 states that Vercel Preview, Production, Development, and local development currently use the same Neon-hosted PostgreSQL database. This is a Release 1.4 blocker for hosted migrations, preview generation tests, and document-storage tests.

Before any Release 1.4 migration, preview generation test, or document-storage test runs against hosted infrastructure:

- Production must use its own database.
- Preview must use a separate database or isolated Neon branch.
- Development and local environments must not point at the production database.
- Database fingerprints must be documented and verified.
- Destructive or stress tests must never run against production customer data.

Release 1.4 implementation may begin locally before isolation is finished, but hosted migration and generated-document testing may not.

TD-016 tracks removal of SMS because unmanaged mobile devices create privacy and retention risk. Release 1.4 must not add SMS delivery of generated documents.

## Services

### Platform Services

The platform should expose internal service contracts equivalent to:

```ts
type GenerateDocumentRequest = {
  context: OrganisationContext;
  documentDefinitionKey: string;
  templateKey: string;
  templateVersion?: number;
  idempotencyKey: string;
  operation: 'generate_lead_assessment_summary';
  title: string;
  resourceLinks: Array<{
    resourceType: 'lead';
    resourceId: string;
    relationshipType: 'primary';
  }>;
  mergeData: unknown;
  output: {
    contentType: 'application/pdf';
    fileName: string;
  };
  source: string;
};
```

Expected output:

```ts
type GenerateDocumentResult = {
  documentId: string;
  generationStatus: 'REQUESTED' | 'STORED' | 'FAILED';
  lifecycleStatus: 'ACTIVE';
  templateVersionId: string;
  storageKey?: string;
  checksumSha256?: string;
  sizeBytes?: number;
  reusedExisting: boolean;
  failureCode?: string;
  failureCategory?: string;
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
- ensuring the PDF includes approved installer-facing disclaimers;
- preserving current lead workflow behavior.

The platform document service must not import SolarGRANT Pro lead helper modules.

## APIs

API contracts should remain internal until the feature specifications define UI and route placement.

Minimum contracts likely needed after approval:

| API or action | Purpose | Permission |
| --- | --- | --- |
| Product server action or route to generate lead assessment summary | Invokes SolarGRANT Pro adapter for a lead. | `document.generate` plus organisation-scoped lead access. |
| Platform metadata read/list contract | Lists generated documents for a resource. | `document.read`. |
| Platform download route, for example `/api/documents/[documentId]/download` | Streams stored PDF file content. | `document.download`. |

Request and response shapes must not expose storage keys, raw template source, raw merge values, public links, or signed URLs. Public links and signed URLs are deferred.

The download route must:

- resolve actor and organisation context server side;
- scope the document by organisation;
- enforce `document.download`;
- reject non-`STORED` or archived documents as defined by the feature specification;
- never accept a storage key from the client;
- set safe `Content-Disposition`;
- set `Content-Type: application/pdf`;
- use private/no-store caching;
- stream bytes safely;
- write an audit event for successful download;
- avoid exposing whether another organisation's document exists.

Versioning:

- service contracts should be versioned through template version and document definition keys;
- breaking API shape changes require feature-spec and ADR updates;
- generated documents remain immutable even if template versions change.

## Transactions

Document generation is synchronous in Release 1.4. It includes database writes and database-backed storage writes behind a platform abstraction. Rendering must not hold long-running database locks.

Required generation strategy:

1. Validate organisation context and permission.
2. Validate the linked lead belongs to the organisation.
3. Resolve the approved active template version.
4. Create or reuse the idempotent `Document` attempt.
5. Render outside long-running database locks.
6. Write the PDF through the storage abstraction.
7. Calculate file metadata and SHA-256 checksum.
8. Mark the document `STORED`.
9. Write the primary lead resource link and audit event.
10. Return the governed document identifier.

If rendering or storage fails, the document must become `FAILED` and record only sanitized failure code, safe operational category, and failed timestamp. It must not store provider error text, document contents, raw merge data, or customer personal data in failure fields.

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

- caller must provide an idempotency key;
- the idempotency identity combines organisation, document definition, template version, primary resource, operation, and idempotency key;
- unique constraints or equivalent transactional guards must allow only one active attempt for the same idempotency identity;
- generation must pin a specific template version before rendering;
- concurrent requests using the same idempotency identity must return the same stored document or the same active attempt rather than create duplicates;
- same idempotency identity with conflicting input checksum should fail with idempotency conflict;
- a different idempotency key may intentionally generate a new immutable version of the assessment summary;
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
| PDF rendering risk | Disable remote assets unless explicitly approved; avoid server-side request forgery; choose renderer through ADR using Vercel compatibility, determinism, security, layout quality, testability, licensing, and maintenance criteria. |
| Log leakage | Do not log raw merge data, customer data, document contents, tokens, or storage keys. |
| Audit leakage | Store identifiers, statuses, checksums, and counts only. |
| Privilege escalation | Server ignores client-supplied permission and role values. |
| Duplicate generation | Enforce idempotency and uniqueness. |
| Template activation race | Pin template version at request start. |
| Shared Preview/Production DB | Treat TD-015 as a release blocker for hosted migration, preview generation tests, and document-storage tests until database isolation and fingerprints are verified. |
| SMS/document delivery leakage | Do not add SMS delivery; keep TD-016 in view. |
| Employee access risk | Internal access must be membership-scoped, permission-controlled, and auditable. |
| Local filesystem storage | Forbid local filesystem storage in deployed environments; use database-backed storage through the platform abstraction. |

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
| Duplicate request | Return the same stored document or same active attempt for the same idempotency identity. |
| Idempotency conflict | Reject and do not overwrite existing document. |
| Download of failed document | Return not found or unavailable. |
| Download after archive | Deny unless the access feature specification approves a narrower archived-document retrieval rule. |

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
- storage tests for successful database-backed write, safe streaming read, content-type enforcement, maximum PDF size enforcement, checksum verification, and failure handling;
- renderer tests for deterministic PDF output, page breaks, headers, footers, tables, and approved disclaimer presence once the renderer ADR selects an implementation;
- SolarGRANT Pro regression tests proving existing lead intake, portal uploads, application pack pages, quote data, and workflow stage changes remain compatible;
- migration tests proving additive schema changes and no destructive migration of `LeadDocument`;
- hosted testing gate proving Production, Preview, Development, and local database fingerprints are isolated before hosted migration or generated-document storage tests run.

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

Hosted migration and generated-document storage tests must not run until the TD-015 environment-isolation gate is satisfied.

Do not claim a check passed unless it ran successfully.

## Migration

Release 1.4 implementation should migrate from the approved baseline additively.

Fresh database deployment:

1. Apply existing migrations through Platform Release 1.3.
2. Verify environment isolation if the target is hosted infrastructure.
3. Apply new document foundation migration after approval.
4. Seed or register initial document definition/template/version records through approved migration or seed path.
5. Verify constraints and indexes.
6. Verify the SolarGRANT Pro proving slice can generate one PDF document in a disposable environment.

Approved-baseline deployment:

1. Back up target database before migration.
2. Verify environment isolation and database fingerprints, especially TD-015.
3. Apply additive document tables.
4. Do not mutate existing `LeadDocument` rows.
5. Do not backfill generated documents from historical application packs.
6. Verify existing portal upload/download, lead detail, application pack, submission package JSON, workflow stage changes, and quote pricing still work.

Hosted migration may not proceed unless Production uses its own database, Preview uses a separate database or isolated Neon branch, Development/local does not point at production, and fingerprints are documented.

Rollback:

- application rollback can ignore additive tables;
- database rollback requires dropping new tables only if no later release depends on them;
- generated documents created before rollback may remain in the database and require documented cleanup if not acceptable.

## Sprint Breakdown

1. Completed approval gate: CTO approved architecture decisions in this Master Release Specification on 2026-07-14.
2. Completed approval gate: CEO approved business value, proving slice, scope, cost, timing, and deferrals on 2026-07-14.
3. Create required ADRs.
4. Create required feature specifications.
5. Plan implementation sprint and validation gates.
6. Complete or document local-only status for the TD-015 environment-isolation prerequisite.
7. Add additive schema and migrations.
8. Implement template registry and immutable version handling.
9. Implement storage abstraction and generated document persistence.
10. Implement synchronous document generation service.
11. Implement secure server-streamed PDF download.
12. Implement permissions and audit events.
13. Implement SolarGRANT Pro lead assessment summary proving slice.
14. Add unit, permission, tenant, audit, storage, migration, renderer, and PostgreSQL integration tests.
15. Run full validation.
16. Open implementation draft PR.
17. Complete implementation review after the implementation PR is ready.
18. Complete final release approval after implementation review.
19. Merge implementation only after approval.
20. Tag release only after explicit instruction.
21. Update roadmap only at release close.

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
- database-backed generated-file storage;
- secure server-streamed PDF download route;
- permissions catalogue update;
- audit events;
- SolarGRANT Pro proving-slice adapter and product surface;
- focused automated tests;
- validation evidence;
- draft implementation PR.

### Required ADR Plan

1. Document Domain, Ownership And Resource Linking.
   Cover domain model, organisation ownership, lifecycle, product namespaces, resource links, and existing-document compatibility.
2. Template Versioning And PDF Rendering.
   Cover repository-owned templates, immutable database snapshots, activation, merge schema, renderer evaluation and choice, and deterministic PDF output.
3. Generated File Storage And Secure Retrieval.
   Cover database-backed storage, storage abstraction, file limits, checksums, server-streamed downloads, and future object-storage migration.
4. Generation Transactions, Idempotency And Failure Handling.
   Cover synchronous execution, transaction boundaries, idempotency, concurrency, storage compensation, durable failure state, and retry behaviour.

Permissions and audit requirements should be specified within the relevant feature specifications using the existing Platform Release 1.2 architecture. Do not create a separate permissions or audit ADR unless a genuine architectural conflict is discovered.

### Required Feature-Specification Plan

1. Platform Document Registry And Templates.
   Includes document definitions, templates, immutable versions, activation, and namespacing.
2. Document Generation, Persistence And Storage.
   Includes generation service, PDF rendering integration, document record, idempotency, failure state, database storage, and checksums.
3. Document Access, Permissions And Audit.
   Includes metadata access, secure download, permission enforcement, organisation isolation, audit events, and error behaviour.
4. SolarGRANT Pro Lead Assessment Summary.
   Includes lead merge-data contract, product template, PDF design, product invocation surface, document listing/download from the lead, compatibility, and regression tests.

Existing-document compatibility requirements must be included across these specifications and in regression testing rather than becoming a separate feature.

## Acceptance Criteria

Release 1.4 is acceptable for implementation review only when:

- the Master Release Specification is approved by CTO and CEO;
- required ADRs are complete and linked;
- required feature specifications are complete and linked;
- implementation is limited to approved scope;
- no solar-specific terminology leaks into platform domain model except namespaced product keys;
- document generation is organisation-scoped, permission-protected, audited, and idempotent;
- generated documents are attributable to immutable template versions;
- stored files are immutable PDFs with `application/pdf`, sanitized `.pdf` filenames, size, SHA-256 checksum, and storage metadata;
- failed generation produces a durable, sanitized failure state;
- secure downloads cannot bypass organisation and separate `document.download` permission checks;
- Production, Preview, Development, and local database isolation is verified before hosted migrations, preview generation tests, or document-storage tests run;
- existing `LeadDocument`, customer portal, application pack, submission package, quote, workflow, and audit behavior remains compatible;
- tests cover permissions, tenant isolation, audit, idempotency, concurrency, storage, and migration risks;
- validation commands are run and recorded honestly;
- no Release 1.4 implementation may begin until the required ADRs, feature specifications, sprint scope, and explicit implementation authorisation are complete.

## Release Planning Checklist

This checklist records approval status for the Master Release Specification. ADR completion, feature-specification completion, sprint approval, and implementation authorisation remain pending.

| Area | Item | Status |
| --- | --- | --- |
| Business | Customer problem is clear. | Approved |
| Business | Business value is documented. | Approved |
| Business | Reason for timing is justified. | Approved |
| Business | Proving-slice value is accepted. | Approved |
| Business | Commercial or operational risk is understood. | Approved |
| Platform | Reuse by at least two products is credible. | Approved |
| Platform | Clada OS ownership is correct. | Approved |
| Platform | Product isolation is preserved. | Approved |
| Platform | Compatibility with existing platform foundations is clear. | Approved |
| Platform | Future capabilities enabled are documented. | Approved |
| Engineering | Architecture is approved. | Approved |
| Engineering | Schema approach is approved. | Approved |
| Engineering | Permissions are approved. | Approved |
| Engineering | Audit expectations are approved. | Approved |
| Engineering | Tenant isolation strategy is approved. | Approved |
| Engineering | Hosted environment database isolation is verified before hosted migration or generated-document testing. | Pending |
| Engineering | Storage strategy is approved. | Approved |
| Engineering | Transaction strategy is approved. | Approved |
| Engineering | Concurrency strategy is approved. | Approved |
| Engineering | Threat analysis is reviewed. | Approved |
| Engineering | Migration strategy is approved. | Approved |
| Engineering | Test strategy is approved. | Approved |
| Engineering | Observability expectations are approved. | Pending |
| Engineering | Rollback limitations are accepted. | Pending |
| Engineering | Technical debt impact is accepted. | Approved |
| Approval | CTO architecture approval. | Approved |
| Approval | CEO specification approval. | Approved |
| Approval | ADR completion. | Pending |
| Approval | Feature-specification completion. | Pending |
| Approval | Sprint approval. | Pending |
| Approval | Implementation authorisation. | Pending |

## Known Deferrals

Release 1.4 intentionally defers:

- full document management product behavior;
- migration of existing `LeadDocument` uploads;
- generic customer document collaboration;
- external object storage until volume, file size, performance, or operating-cost evidence requires it;
- public anonymous document links;
- signed URL infrastructure;
- template editor or customer-authored templates;
- AI-authored content;
- OCR and document extraction expansion;
- bulk or scheduled generation;
- workflow-triggered automatic generation;
- workflow history writes for ordinary document generation;
- notification delivery of generated documents;
- implemented `DELETED` or `ERASURE_PENDING` document lifecycle states;
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
- `TD-015`: Preview, Production, Development, and local development currently share one hosted database. This is a hard Release 1.4 gate for hosted migrations, preview generation tests, and document-storage tests.
- `TD-016`: SMS should be removed from intake before wider installer onboarding or commercial scale.

Release 1.4 should not update the technical-debt register merely to track a missing future capability. It should update the register only if implementation introduces, resolves, or accepts material debt.

## Future Releases

This foundation enables later work:

- migration or wrapping of uploaded applicant documents into platform document records;
- product-configured document checklists;
- governed generated quotes, contracts, proposals, and compliance records;
- SOLARfarm Pro assessment reports;
- roofing, HVAC, plumbing, construction, or landscaping proposals and compliance documents;
- document-aware notifications in Platform Release 1.5 or later;
- module configuration for document types and checklist values;
- AI-assisted document summarisation or extraction under AI governance;
- operational reporting from document generation, upload, review, and download events;
- object storage adoption if volume, file size, performance, or operating-cost evidence justifies it;
- retention and deletion automation after privacy and records policy approval.

## CTO Review

| Field | Value |
| --- | --- |
| Status | Approved |
| Reviewer | CTO |
| Date | 2026-07-14 |
| Notes | The amended architecture is approved. Release 1.4 is limited to the governed generated-document foundation and the installer-facing SolarGRANT Pro lead assessment PDF proving slice. Renderer selection, exact PDF size limit, and detailed assessment design remain approval-gated ADR or feature-specification decisions. |

### CTO Decisions Still Required

1. Select the PDF renderer/library through the Template Versioning And PDF Rendering ADR.
2. Approve the exact generated PDF size limit in the Document Generation, Persistence And Storage feature specification.
3. Approve the exact SolarGRANT Pro assessment summary content, layout, merge fields, and disclaimer wording.
4. Confirm final member, internal admin, and internal support permission mapping only if implementation evidence requires adjustment from this specification.

## CEO Approval

| Field | Value |
| --- | --- |
| Status | Approved |
| Approver | CEO |
| Date | 2026-07-14 |
| Notes | Business value, installer-facing audience, non-binding positioning, scope, deferrals, and release priority are approved. Exact document content, visual design, merge fields, and final disclaimer wording will be reviewed in Feature Specification 4 before implementation. |

### CEO Decisions Recorded

1. The installer-facing SolarGRANT Pro lead assessment summary provides useful business value by giving installers a consistent professional overview before customer follow-up.
2. The assessment should include approved existing lead, property, energy, recommendation, grant-context, indicative commercial, and next-action information.
3. The tone must be professional, factual, clear, and non-binding.
4. The PDF must clearly state that it is not a binding quotation, formal grant approval, technical site survey, financial advice, guaranteed savings statement, or contract.
5. The documented scope deferrals are approved, including homeowner-upload migration, template editor, e-signatures, public links, document delivery, workflow-triggered generation, and full records management.
6. Platform Release 1.4 remains the current roadmap priority.

## Release Sign-Off

| Field | Value |
| --- | --- |
| Master Specification PR | PR #12 |
| CTO review | Approved |
| CEO approval | Approved |
| Release 1.4 implementation merge commit | Pending |
| Release tag | Pending |
| Roadmap update | Pending |

This section must remain pending until release close. Merging PR #12 records the approved Master Release Specification only; it must not populate the Release 1.4 implementation merge commit, release tag, or roadmap completion fields, and it does not authorise implementation.
