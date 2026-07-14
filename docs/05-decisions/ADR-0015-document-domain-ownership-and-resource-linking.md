# ADR-0015: Document Domain, Ownership and Resource Linking

| Field | Value |
| --- | --- |
| Document ID | ADR-0015 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When generated-document domain, ownership, or resource-link rules change |
| Last reviewed | 2026-07-14 |

## Context

Platform Release 1.4 creates the first reusable Clada OS foundation for governed generated documents. The approved proving slice is an installer-facing SolarGRANT Pro lead assessment summary PDF generated synchronously from existing lead, quote, eligibility, and installer context.

The repository already has document-adjacent SolarGRANT Pro behaviour:

- `LeadDocument` stores homeowner or installer uploaded evidence for a lead, with SolarGRANT Pro document types, upload status, file metadata, optional database bytes, extracted text, and AI fields.
- The homeowner portal upload and download routes are public-token flows scoped through the parent lead.
- Application-pack pages, print-friendly pages, submission-package JSON, portal-fill-preview JSON, quote estimates, and generated quote data are product-specific preparation and review surfaces.
- Platform foundations already exist for `Organisation`, organisation membership, permissions, actor-aware audit, workflow definitions, workflow instances, workflow history, and generic workflow resource identifiers.

Those existing behaviours are useful, but they are not a reusable governed generated-document domain. Release 1.4 must not replace current upload flows, migrate `LeadDocument`, or turn SolarGRANT Pro lead concepts into generic platform columns. It must establish a small platform domain for generated documents while preserving the Clada OS and SolarGRANT Pro boundary.

This ADR is documentation and architecture work only. It does not create Prisma schema, migrations, services, APIs, UI, templates, PDF rendering, storage, tests, seeds, or product functionality.

## Decision

Create a focused generic Clada OS generated-document model made of:

- `DocumentDefinition`;
- `DocumentTemplate`;
- `DocumentTemplateVersion`;
- `Document`;
- `DocumentResourceLink`.

Select a generic resource-link model, with Release 1.4 implementing and testing only `resourceType = lead` and exactly one primary lead link per generated document.

Do not introduce a separate `DocumentGenerationRequest` table in Release 1.4. `Document` represents one generation attempt and its resulting governed document state.

Do not add governed generated-document fields to `LeadDocument`, do not create a SolarGRANT Pro-specific generated-document table, and do not build a broad unified document management model now.

Generated documents are always organisation-owned. Document definitions, templates, and template versions are globally registered, module-owned platform records in Release 1.4; they do not make generated documents globally accessible. Every document read, generation, archive, or download path must resolve server-side organisation context, enforce the relevant permission, and scope the document by `organisationId`.

Release 1.4 preserves these locked directions:

- Release 1.4 focuses on governed generated documents.
- The proving slice is an installer-facing SolarGRANT Pro lead assessment summary PDF.
- Existing `LeadDocument`, portal upload/download, application-pack, submission-package, intake-upload, quote, and workflow behaviour remain unchanged.
- Solar-specific concepts must not leak into the generic platform domain.
- Generated documents belong to exactly one organisation.
- Generated documents reference an immutable template version.
- Release 1.4 uses synchronous generation.
- Release 1.4 uses database-backed file storage behind an abstraction.
- Secure retrieval is authenticated, organisation-scoped, permission-controlled, and server-streamed.
- Hosted migration and document testing remain blocked until TD-015 environment isolation is resolved.

## Core Entities

### DocumentDefinition

`DocumentDefinition` represents a namespaced product-owned document kind, such as `solargrant.lead_assessment_summary` or future `solarfarm.site_assessment_report`.

It is a platform registry record for a document kind. It must not contain SolarGRANT Pro-specific fields, grant rules, lead fields, quote fields, installer wording, SEAI behaviour, or product rendering behaviour.

Release 1.4 definitions are globally registered and module-owned. They are not organisation-owned. This avoids duplicate definitions per tenant while preserving tenant isolation at the generated `Document` layer.

### DocumentTemplate

`DocumentTemplate` represents a template identity associated with one document definition.

The template identity is globally registered and module-owned in Release 1.4. SolarGRANT Pro owns the repository template source and product wording for the proving slice. Clada OS owns registration, active/inactive state, relationship to `DocumentDefinition`, and the rule that generated documents must point to an immutable template version.

Detailed template source storage, renderer choice, merge-schema handling, and activation mechanics belong in ADR-0016.

### DocumentTemplateVersion

`DocumentTemplateVersion` represents the immutable version used to generate a document.

A stored `Document` must reference exactly one template version. Template versions are append-only. Existing activated versions must not be edited in place. A template change creates a new version.

ADR-0016 must decide the exact immutable snapshot or canonical serialized representation, renderer metadata, source checksum, and merge schema details. This ADR decides only that a generated document cannot depend on a mutable template identity alone.

### Document

`Document` represents one generation attempt and its resulting governed document state.

It owns generation status, lifecycle status, organisation ownership, template-version attribution, file metadata, storage metadata, input checksum, idempotency identity, actor attribution, and immutable stored-document state.

Release 1.4 must not create a separate `DocumentGenerationRequest` table unless later repository evidence proves `Document` cannot represent requested, stored, and failed attempts safely.

### DocumentResourceLink

`DocumentResourceLink` links a governed generated document to a platform or product resource without adding product-specific nullable foreign keys to `Document`.

Release 1.4 implements and tests only:

- `resourceType = lead`;
- `relationshipType = primary_subject`;
- `isPrimary = true`;
- exactly one primary lead link per generated document.

The architecture may allow later resource types through future ADRs or feature specifications, but unsupported resource types must not be implemented speculatively.

## Organisation Ownership

Generated `Document` records require `organisationId`.

`DocumentResourceLink` records require `organisationId`.

`DocumentDefinition`, `DocumentTemplate`, and `DocumentTemplateVersion` do not require `organisationId` in Release 1.4 because definitions and product-owned templates are globally registered platform records. Future customer-authored or tenant-owned templates require a new ADR or feature specification before adding organisation ownership to template records.

Generated documents are never globally accessible because their definition or template is globally registered. The access boundary is the generated `Document.organisationId`, not the template registry.

Organisation consistency is enforced in two layers:

1. Database constraints must enforce that `DocumentResourceLink.organisationId` matches the owning `Document.organisationId`, for example with a composite document key and composite foreign key.
2. Service validation must enforce that the referenced resource belongs to the same organisation before the link is created or used.

For `resourceType = lead`, the product adapter or platform service must verify the lead exists inside the actor's active organisation before generation starts and before a document is linked to it. If a lead identifier belongs to another organisation, the service must fail closed with the same safe not-found or unauthorized behaviour used for a missing lead. It must not reveal cross-tenant existence.

Generic resource links cannot provide full database referential integrity to every possible resource table. Release 1.4 must be honest about that trade-off: the database can prove document-link organisation consistency, while resource existence and resource ownership are service-level obligations for generic resources.

## Product Ownership And Namespacing

Document definition keys are globally unique.

The approved key pattern is:

```text
<product-namespace>.<document-name>
```

Examples:

- `solargrant.lead_assessment_summary`;
- `solarfarm.site_assessment_report`.

Namespace rules:

- the product namespace is owned by a product module or approved platform owner;
- the document name describes the document kind without product implementation details beyond the namespace;
- keys use lowercase ASCII letters, digits, underscores, hyphens, and dots;
- each dot-separated segment must start and end with a lowercase letter or digit;
- keys must contain at least one dot;
- keys must not contain spaces, uppercase letters, slashes, path traversal, tenant IDs, customer names, or environment names.

Keys are immutable after use by a template, template version, or generated document. Renaming a document kind requires a new key and migration or compatibility plan.

Do not use database enums for product-specific document kinds. New document kinds are data records with globally unique keys, not Prisma enum members.

Collision prevention uses both database uniqueness on `DocumentDefinition.key` and code review of namespace ownership. Activation and deactivation are registry controls:

- inactive definitions or templates cannot be used for new generation;
- inactive definitions or templates do not invalidate already stored documents;
- existing generated documents remain governed by organisation-scoped permissions and their referenced immutable template version.

## Resource-Link Design

Use a generic `DocumentResourceLink` table.

Do not add nullable product-specific foreign keys such as `leadId`, `quoteId`, or `siteAssessmentId` to the generic `Document` model in Release 1.4.

Resource-link fields should include:

- `organisationId`;
- `documentId`;
- `resourceType`;
- `resourceId`;
- `relationshipType`;
- `isPrimary`;
- `createdAt`.

Release 1.4 resource-link rules:

- `resourceType` is a lowercase string and only `lead` is implemented.
- `resourceId` stores the resource identifier prepared and validated by the product adapter or platform service.
- `relationshipType` is `primary_subject` for the proving slice.
- each generated document has one primary resource link.
- the primary link becomes immutable after the document reaches `STORED`.
- the document and resource link must have the same `organisationId`.
- the service must validate that the lead belongs to the same organisation before link creation.
- unsupported `resourceType` values are rejected.

Deleted or archived product resources must not cascade-delete stored generated documents through the generic link. Existing generated documents remain durable records of what was generated at the time. If a linked lead is deleted or archived in a later release, the document domain should retain the document and link metadata unless an approved retention, erasure, or legal policy says otherwise. The exact handling of product-resource deletion, erasure, and historical display is deferred to future retention/GDPR work.

The trade-off is deliberate. A generic link avoids coupling Clada OS documents to SolarGRANT Pro leads, but it cannot enforce all resource-table foreign keys directly. Release 1.4 mitigates this through organisation consistency constraints, service-level resource validation, tenant-isolation tests, and a narrow allowlist of implemented resource types.

## Status Ownership

The document domain owns generation status:

- `REQUESTED`: generation has been requested and no stored bytes are available.
- `STORED`: generation succeeded and immutable file metadata and storage metadata are complete.
- `FAILED`: generation failed and no downloadable stored document exists for that attempt.

Allowed generation transitions:

- `REQUESTED -> STORED`;
- `REQUESTED -> FAILED`.

`STORED` is terminal for generated bytes. A stored document must never be overwritten in place. A later intentional regeneration creates or reuses records only according to the idempotency rules approved in the generation transactions ADR and feature specification.

The document domain also owns lifecycle status:

- `ACTIVE`: the document is the normal governed state after successful storage.
- `ARCHIVED`: the document is retained but removed from ordinary active use.

Allowed lifecycle transition:

- `ACTIVE -> ARCHIVED`.

Do not introduce implemented `DELETED`, `ERASURE_PENDING`, approval, delivery, signing, review, or workflow states in Release 1.4.

`ARCHIVED` documents remain retained for audit and operational traceability. They are not downloadable by default in Release 1.4. Feature Specification 3, Document Access, Permissions And Audit, must decide whether any narrower privileged archived-document retrieval path is allowed. Physical deletion and erasure automation are deferred.

## Immutability

After a document reaches `STORED`, these values must be immutable:

- organisation;
- document definition;
- template version;
- primary resource link;
- generated bytes;
- storage provider and storage key;
- filename;
- content type;
- size;
- checksum;
- generation input checksum;
- idempotency identity;
- actor attribution;
- stored timestamp;
- title.

Title is immutable in Release 1.4 because the generated assessment is a governed record of what was produced. If users later need a mutable display alias, that should be a separate field approved by a future feature specification.

Failure fields may be written only when the attempt enters `FAILED`. Lifecycle archive fields may be written only for the `ACTIVE -> ARCHIVED` transition. No stored file may be replaced by updating the same row.

## Existing Document Compatibility

Release 1.4 does not migrate, replace, or destructively change current SolarGRANT Pro document-adjacent behaviour.

The compatibility decision is:

- no migration of `LeadDocument` in Release 1.4;
- no replacement of homeowner portal upload or download flows;
- no destructive schema change;
- no dual-writing unless a later feature specification explicitly requires it;
- new governed generated documents use the new `Document` domain;
- uploaded homeowner evidence remains in the existing product model.

These concepts are intentionally different:

- `LeadDocument` records uploaded applicant or installer evidence for a SolarGRANT Pro lead. They are product-owned, lead-scoped, and use SolarGRANT Pro upload categories and review statuses.
- Homeowner portal downloads are public-token flows scoped through the lead, not authenticated organisation-member document downloads.
- Applicant document metadata from intake is public intake metadata and `uploaded://...` references, not proof of platform generated-file storage.
- Document checklist logic in `lib/documents.ts` is SolarGRANT Pro evidence collection, not generic generated-document classification.
- Application packs, print-friendly pages, submission package JSON, and portal-fill-preview JSON are product preparation views or payloads, not persisted governed generated documents.
- Quote and estimate data are SolarGRANT Pro merge inputs and business calculations. The platform document domain may store the generated PDF output and metadata, but it must not own quote calculation or SEAI wording.

Prematurely unifying uploaded evidence, generated PDFs, application-pack views, and quote data would blur product and platform boundaries and increase migration risk before the generated-document foundation proves itself.

## Deletion And Retention

Release 1.4 implements only `ACTIVE` and `ARCHIVED` lifecycle states.

This is enough to keep active generated documents usable while allowing operators to remove a document from ordinary active use. It does not imply physical deletion, GDPR erasure, retention automation, legal hold, records management, or customer-facing deletion rights.

Archived documents remain stored and auditable. Metadata may remain visible to authorized actors where Feature Specification 3 approves it. Download of archived documents is denied by default unless Feature Specification 3 approves a narrower privileged rule.

The model remains compatible with future retention and erasure work because:

- lifecycle status is separate from generation status;
- stored bytes and metadata are explicitly identified;
- resource links are durable and do not require cascade deletion;
- future `DELETED`, `ERASURE_PENDING`, retention policy, erasure audit, or legal-hold states can be added after privacy and operational handling are approved.

Physical deletion must not be implied before policy, operational recovery, audit treatment, storage cleanup, and GDPR handling exist.

## Permission And Audit Boundaries

This ADR does not redesign the existing permission or audit architecture.

Release 1.4 integrates with existing permissions and approved new document permissions:

- `document.read` for governed document metadata;
- `document.generate` for generation requests;
- `document.download` for stored file bytes.

`document.download` remains separate from `document.read`. Metadata access does not imply file-byte access.

All protected document operations must:

1. resolve authenticated actor and active organisation context server side;
2. enforce the required permission;
3. verify resource ownership inside the active organisation;
4. scope reads and writes by `organisationId`;
5. write actor-aware audit events for material lifecycle actions.

Audit events should use:

- `resourceType = document` and `resourceId = <document id>` for document lifecycle and download events;
- metadata identifiers such as document definition key, template version id, generation status, lifecycle status, resource type, resource id, checksum, and file size where useful;
- no raw document contents, raw merge data, portal tokens, signed URLs, storage bytes, secrets, or excessive personal data.

Detailed permission mapping, denied-outcome behaviour, and audit event names belong in Feature Specification 3.

## Dependency Direction

Permitted dependency direction:

```text
SolarGRANT Pro product adapter
  -> Clada OS document domain/service
    -> shared organisation, permission, audit, persistence infrastructure
```

Forbidden dependency direction:

```text
Clada OS document domain/service
  -> SolarGRANT Pro lead, grant, SEAI, quote, or installer-specific modules
```

The generic document service may accept product-prepared identifiers, template keys, template version identifiers, idempotency identities, and validated merge input through contracts. It must not import SolarGRANT Pro lead models, grant rules, quote calculations, SEAI wording, installer-specific business logic, or product UI concerns.

## Schema-Level Guidance

This section is illustrative architecture guidance, not a final Prisma schema and not a migration.

Candidate entities and important fields:

| Entity | Important fields |
| --- | --- |
| `DocumentDefinition` | `id`, `key`, `namespace`, `documentName`, `ownerModule`, `description`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplate` | `id`, `documentDefinitionId`, `key`, `ownerModule`, `isActive`, `createdAt`, `updatedAt` |
| `DocumentTemplateVersion` | `id`, `documentTemplateId`, `version`, immutable snapshot or canonical representation, `sourceChecksumSha256`, `mergeSchemaJson`, `renderer`, `rendererVersion`, `status`, `activatedAt`, `createdAt` |
| `Document` | `id`, `organisationId`, `documentDefinitionId`, `templateVersionId`, `title`, `generationStatus`, `lifecycleStatus`, `idempotencyKey`, `idempotencyOperation`, `inputChecksumSha256`, `storageProvider`, `storageKey`, `fileName`, `contentType`, `sizeBytes`, `checksumSha256`, `failureCode`, `failureCategory`, actor attribution fields, `storedAt`, `failedAt`, `archivedAt`, `archiveReason`, `createdAt`, `updatedAt` |
| `DocumentResourceLink` | `id`, `organisationId`, `documentId`, `resourceType`, `resourceId`, `relationshipType`, `isPrimary`, `createdAt` |

Important relationships:

- `DocumentTemplate` belongs to `DocumentDefinition`.
- `DocumentTemplateVersion` belongs to `DocumentTemplate`.
- `Document` belongs to `Organisation`.
- `Document` references one `DocumentDefinition`.
- `Document` references one `DocumentTemplateVersion`.
- `DocumentResourceLink` belongs to `Document`.
- `DocumentResourceLink.organisationId` must match `Document.organisationId`.

Candidate constraints and indexes:

- unique `DocumentDefinition.key`;
- unique `DocumentTemplate(documentDefinitionId, key)`;
- unique `DocumentTemplateVersion(documentTemplateId, version)`;
- index `Document(organisationId, createdAt)`;
- index `Document(organisationId, documentDefinitionId, lifecycleStatus)`;
- index `Document(generationStatus, createdAt)`;
- composite unique key on `Document(id, organisationId)` to support link consistency;
- composite foreign key from `DocumentResourceLink(documentId, organisationId)` to `Document(id, organisationId)`;
- unique primary resource link per document;
- Release 1.4 allowlist or constraint that implemented links use `resourceType = lead`;
- index `DocumentResourceLink(organisationId, resourceType, resourceId, createdAt)`;
- idempotency uniqueness covering organisation, document definition, template version, primary resource, operation, and idempotency key, with exact details deferred to the generation transactions ADR.

Details deferred to later Release 1.4 documents:

- final Prisma schema names, enums versus string columns for platform-owned statuses, and migration SQL;
- template version snapshot format and renderer metadata, decided by ADR-0016;
- generated file storage table or storage abstraction details, decided by the storage and retrieval ADR;
- idempotency, transaction, retry, and failure behaviour, decided by the generation transactions ADR;
- exact permission mapping, audit action names, and archived-document access behaviour, decided by Feature Specification 3.

## Consequences

Positive consequences:

- reusable across products;
- organisation-scoped generated records;
- product boundaries preserved;
- immutable generated records;
- clean future extension path for more document kinds and resource types;
- no destructive migration of current product workflows;
- generated documents can be audited and attributed to immutable template versions.

Negative consequences:

- temporary coexistence with `LeadDocument`;
- service-level resource validation remains necessary for generic links;
- more tables than a lead-specific solution;
- future migration or wrapping work remains for uploaded evidence if the platform later needs it;
- the generic architecture must be carefully constrained to avoid speculative abstractions.

Risks and mitigations:

| Risk | Mitigation |
| --- | --- |
| Cross-tenant resource links | Store `organisationId` on `Document` and `DocumentResourceLink`, enforce document-link organisation consistency in the database, validate lead ownership in services, and add tenant-isolation tests in implementation. |
| Orphaned generic resource references | Keep Release 1.4 to `resourceType = lead`, validate existence before link creation, retain durable documents if product resources are later archived or deleted, and defer deletion policy to retention/GDPR work. |
| Uncontrolled namespace creation | Use globally unique keys, owner-module review, lowercase key rules, and no database enums for product-specific document kinds. |
| Document/template ambiguity | Require every generated document to reference exactly one immutable template version, not just a mutable template identity. |
| Premature support for unsupported resource types | Reject unsupported resource types in Release 1.4 and require future ADR or feature-spec approval before expanding. |
| Accidental coupling to SolarGRANT Pro | Keep SolarGRANT Pro logic in product adapters, use generic resource links, and forbid platform imports from lead, grant, SEAI, quote, or installer-specific modules. |
| Archive mistaken for deletion | Implement only `ACTIVE` and `ARCHIVED`; state clearly that physical deletion and erasure automation are deferred. |
| Hosted migration or storage testing against shared environments | Treat TD-015 as a hard blocker for hosted migration, preview generation tests, and document-storage tests until environment isolation is verified. |

## Alternatives Considered

### 1. Add governed generated-document fields to LeadDocument

Advantages:

- smallest apparent schema change;
- direct lead relationship already exists;
- reuses existing upload/download familiarity.

Disadvantages:

- mixes uploaded evidence with generated governed documents;
- forces generated-document lifecycle, template-version attribution, idempotency, and storage semantics into a SolarGRANT Pro upload model;
- risks changing existing portal behaviour.

Tenant-isolation impact:

- tenant scoping is available through parent lead, but generated documents would not have first-class organisation ownership.

Product-coupling impact:

- high coupling to SolarGRANT Pro and `LeadDocumentType` enum values.

Migration impact:

- risky because existing uploaded records would share a table with new generated records and may need nullable compatibility fields.

Future-product reuse:

- weak. Future products would inherit lead upload concepts.

Implementation complexity:

- initially low, but long-term complexity increases as incompatible concepts accumulate.

Rejected because it blurs product upload evidence with platform generated documents and threatens existing portal compatibility.

### 2. Create a SolarGRANT Pro-specific generated-document table

Advantages:

- clear lead foreign key and simple referential integrity;
- easier product-specific querying for the first slice;
- less generic design work.

Disadvantages:

- duplicates platform mechanics inside the first product module;
- would likely need to be replaced or generalized for future products;
- invites SolarGRANT Pro lifecycle and document kinds into platform planning later.

Tenant-isolation impact:

- can be safe if organisation ownership is added, but the model remains lead-specific.

Product-coupling impact:

- high. It treats the proving slice as the architecture.

Migration impact:

- additive and low risk for current records, but creates future consolidation work.

Future-product reuse:

- weak. Other products would need their own generated-document tables or a later migration to a generic model.

Implementation complexity:

- moderate now, higher later when extracting shared mechanics.

Rejected because Release 1.4 is explicitly a reusable Clada OS foundation, not a SolarGRANT Pro-only document feature.

### 3. Create a generic Clada OS document model with resource links

Advantages:

- reusable across products;
- generated documents are first-class organisation-owned records;
- keeps SolarGRANT Pro logic in adapters;
- supports immutable template-version attribution;
- avoids destructive migration of existing uploads;
- allows leads as the proving resource without lead-specific platform columns.

Disadvantages:

- more tables than a lead-specific implementation;
- generic resource links need service-level resource validation;
- unsupported resource types must be actively constrained.

Tenant-isolation impact:

- strong when `Document` and `DocumentResourceLink` carry `organisationId`, reads are scoped by organisation, and services validate resource ownership.

Product-coupling impact:

- low if the platform service accepts contracts and does not import SolarGRANT Pro modules.

Migration impact:

- additive, with no `LeadDocument` migration or portal replacement in Release 1.4.

Future-product reuse:

- strong. Future products can register namespaced definitions and link documents to their own resources through approved resource types.

Implementation complexity:

- moderate. Requires careful constraints, service validation, and documentation, but avoids larger future extraction.

Selected because it best matches the approved Release 1.4 objective while keeping the first implementation narrow.

### 4. Build a broad unified document management model now

Advantages:

- could eventually cover uploads, generated files, document review, folders, sharing, retention, search, and collaboration;
- reduces future conceptual duplication if done correctly.

Disadvantages:

- too broad for the approved release;
- would reopen decisions intentionally deferred by the Master Specification;
- would force migration of current portal and upload flows before there is evidence to justify it;
- risks over-abstracting before the generated-document proving slice exists.

Tenant-isolation impact:

- could be strong, but the larger surface increases the chance of access-control mistakes.

Product-coupling impact:

- uncertain. A broad model may either overfit SolarGRANT Pro or become too abstract to guide implementation.

Migration impact:

- high. Existing uploads, portal routes, application-pack logic, and document review statuses would all need migration or compatibility planning.

Future-product reuse:

- potentially high, but speculative before generated-document mechanics prove themselves.

Implementation complexity:

- high and outside Release 1.4 scope.

Rejected because it violates the release's focused ambition and would delay the governed generated-document foundation.

## CTO Approval

| Field | Value |
| --- | --- |
| Status | Approved |
| Reviewer | CTO |
| Date | 2026-07-14 |

The CTO approves:

- the focused generic Clada OS generated-document domain;
- `DocumentDefinition`;
- `DocumentTemplate`;
- `DocumentTemplateVersion`;
- `Document`;
- `DocumentResourceLink`;
- organisation-owned generated documents;
- global, module-owned definitions and templates for Release 1.4;
- generic resource links restricted to `resourceType = lead` and one primary lead link in Release 1.4;
- additive coexistence with `LeadDocument` and current portal, application-pack, intake-upload, quote, and workflow behaviour;
- no separate `DocumentGenerationRequest` table;
- no implementation in this PR.

## Follow-Up

- ADR-0016 must decide template versioning and PDF rendering details.
- A later storage and retrieval ADR must decide database-backed storage details, storage abstraction, checksums, and server-streamed retrieval.
- A later generation transactions ADR must decide idempotency, concurrency, transaction, retry, and failure handling.
- Feature Specification 3 must decide detailed `document.read`, `document.generate`, and `document.download` enforcement, audit action names, denied outcomes, and any archived-document retrieval exception.
- Feature Specification 4 must keep SolarGRANT Pro assessment summary content, merge fields, layout, and disclaimers in the product layer.
- TD-015 environment isolation must be resolved before hosted migrations, preview generation tests, or document-storage tests.
