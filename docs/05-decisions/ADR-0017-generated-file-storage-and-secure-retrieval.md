# ADR-0017: Generated File Storage and Secure Retrieval

| Field | Value |
| --- | --- |
| Document ID | ADR-0017 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When generated-file storage, retrieval, integrity, or provider strategy changes |
| Last reviewed | 2026-07-15 |

## Context

Platform Release 1.4 needs a safe, narrow storage and retrieval decision before the first SolarGRANT Pro pilot implementation. [ADR-0015](ADR-0015-document-domain-ownership-and-resource-linking.md) established the governed document domain, organisation ownership, lifecycle, permissions boundary, and immutable generated-document identity. [ADR-0016](ADR-0016-template-versioning-and-pdf-rendering.md) established immutable template versions, React PDF behind a renderer abstraction, runtime attribution, and the rule that stored PDF bytes are the authoritative output.

The first 5-10 pilot installers are expected within approximately two to three weeks. The selected architecture must therefore make generated PDFs trustworthy without creating a general-purpose media or document-management platform.

Repository evidence is:

| Area | Current evidence | Treatment in this ADR |
| --- | --- | --- |
| Database | Prisma uses PostgreSQL. `LeadDocument.contentBytes` already demonstrates database-backed bytes. | Use a separate generated-file record with PostgreSQL bytes for Release 1.4. |
| Existing uploads | `LeadDocument` owns SolarGRANT Pro upload categories, review states, optional bytes, paths, URLs, extraction and AI fields. | Do not reuse or migrate it. |
| Upload controls | `lib/documents.ts` limits uploads to 4 MiB, allowlists MIME types, and strips paths, control characters and unsafe filename characters. | Adopt a separate PDF-only generated-file policy and the same conservative 4 MiB ceiling. |
| Portal retrieval | `/portal/[token]/documents/[documentId]` scopes an uploaded document through a homeowner portal token and can return bytes or redirect to a storage URL. | Do not reuse this public-token model for governed generated files. |
| Identity and tenancy | `OrganisationContext` is resolved server side from authenticated membership; tenant-aware access helpers scope records by organisation. | Resolve trusted context and scope every governed document lookup by `organisationId`. |
| Permissions | `requirePermission` provides the reusable server-side enforcement boundary. `document.download` is approved by the Release 1.4 specification but not yet implemented. | Require `document.download` separately from metadata read. |
| Audit | Actor-aware `writeAuditEvent` records organisation, actor, resource, source and outcome and filters sensitive metadata keys. | Reuse and strengthen this boundary for safe storage and download events. |
| Routes and runtime | Next.js App Router route handlers return `Response` or `NextResponse`; file routes declare the Node.js runtime. The application is deployed on Vercel. | Use an authenticated Node.js server route and a bounded byte response; no local filesystem. |
| Environment isolation | TD-015 records shared hosted database risk. | Hosted migration and storage testing remain blocked until environment isolation is proven. |

This ADR is architecture and documentation only. It does not create schema, migrations, services, APIs, routes, UI, renderer code, storage code, templates, dependencies, tests, seeds, environment variables, production configuration, or release tags.

## Locked Decisions

This ADR does not reopen these approved decisions:

- `Document` represents one governed generation attempt.
- Generated documents are organisation-owned and reference one immutable `DocumentTemplateVersion`.
- Generated PDF bytes and their successful metadata are immutable and are never overwritten in place.
- Release 1.4 output is `application/pdf`; filenames are sanitised and end in `.pdf`.
- File size and a SHA-256 output checksum are stored.
- Generation is synchronous.
- Generated-file storage is database-backed behind a platform-owned abstraction.
- Local filesystem storage is forbidden in deployed environments; external object storage is deferred.
- Downloads are authenticated, organisation-scoped and permission-controlled.
- Existing `LeadDocument`, portal, intake, application-pack, submission-package, quote and workflow behaviour remains unchanged.
- Archived documents are retained and are not downloadable by default.
- Release 1.4 has no public generated-document links, signed URLs, physical deletion, retention automation, or GDPR erasure workflow.
- Hosted storage testing remains blocked until TD-015 is resolved.

## Decision Summary

| Decision area | Selected approach |
| --- | --- |
| Storage model | A separate one-to-one platform generated-file record behind a provider-neutral abstraction. |
| Release 1.4 provider | PostgreSQL-backed provider storing exact PDF bytes in the generated-file record. |
| Governed ownership | `Document` owns organisation, identity, attribution, lifecycle, generation state and queryable immutable file metadata. |
| Binary ownership | The generated-file record owns exact bytes and storage-specific state and metadata. |
| Storage key | Platform-generated opaque unique identifier for one physical storage object; never edited or reused to reference different bytes. |
| Maximum size | 4 MiB (`4 * 1024 * 1024` bytes) over the final stored PDF bytes. |
| Integrity | SHA-256 over the exact post-normalisation bytes that are stored and served; mismatch fails closed. |
| Retrieval | Authenticated Node.js server route, trusted organisation context, `document.download`, tenant-scoped `Document` lookup, internal storage read and safe audit. |
| Download states | Only `STORED + ACTIVE` is downloadable in Release 1.4. |
| HTTP delivery | Bounded server byte response for the pilot; `application/pdf`, safe attachment filename, `nosniff`, and `Cache-Control: private, no-store`. |
| Compensation | Only incomplete pre-`STORED` writes may be removed. A `STORED` object is never overwritten or compensated away. |
| Future storage | A later approved migration may create a verified physical object with a new provider and key, then move the active locator without changing product adapters, governed document identity, or generated checksum. |

## Architecture Diagrams

### Generation And Database Storage

```text
REQUESTED Document
  -> render PDF outside a long database lock
  -> normalise PDF metadata if the feature specification requires it
  -> validate PDF content type and final size <= 4 MiB
  -> calculate SHA-256 over the final bytes
  -> transaction: write GeneratedFile bytes and immutable metadata
               + finalise Document metadata
               + transition Document to STORED
               + write success audit evidence
  -> return document ID, never a storage key or public URL
```

### Secure Authenticated Retrieval

```text
authenticated request for document ID
  -> resolve trusted actor and organisation context
  -> require document.download
  -> query Document by id + organisationId
  -> require STORED + ACTIVE
  -> resolve GeneratedFile internally
  -> verify complete metadata, existence, size and SHA-256
  -> return bounded PDF response with private/no-store headers
  -> write safe download audit event
```

### Product, Platform And Storage Dependency Direction

```text
SolarGRANT Pro adapter
  -> Clada OS document service
    -> GeneratedFileStorage interface
      -> PostgreSQLGeneratedFileStorage
        -> Prisma/PostgreSQL

Forbidden:
GeneratedFileStorage -> lead, quote, grant, SEAI or installer concepts
```

### Future Storage Adapter Replacement

```text
Today:   Document service -> GeneratedFileStorage -> PostgreSQL provider
Future:  Document service -> GeneratedFileStorage -> approved object-storage provider
                                                \-> checksum-verified migration process

SolarGRANT Pro adapter and authorised download contract do not change.
```

## Storage Model

Select a separate one-to-one platform generated-file record, called `GeneratedFile` illustratively in this ADR. The implementation feature specification may approve a similarly explicit product-neutral name.

`Document` remains the governed business record. `GeneratedFile` remains a deliberately narrow persistence record for one immutable generated PDF. A unique relationship enforces at most one generated-file record per `Document`; a document may temporarily have none while `REQUESTED` or after a failed attempt, and must have exactly one complete record before becoming `STORED`.

The Release 1.4 provider stores bytes in PostgreSQL. This is appropriate for a pilot because:

- output is one bounded PDF per attempt;
- the hard 4 MiB limit prevents open-ended row growth;
- a small installer cohort produces a modest bounded file volume;
- database bytes and document finalisation can share the strongest practical transaction boundary;
- deployment does not depend on an ephemeral local filesystem;
- backup and restore keep bytes and their relational metadata together;
- no external provider, credentials, DPA, signed URL policy, or operational integration is needed before the pilot.

This decision does not endorse database byte storage at unlimited scale. Pilot metrics must track count, total bytes, latency, database growth and integrity failures.

## Record And Metadata Ownership

### `Document`

`Document` owns governed, organisation-scoped and queryable metadata:

- organisation ownership;
- document definition and immutable template version;
- primary resource link;
- title;
- generation status and lifecycle status;
- generation input checksum;
- renderer runtime fingerprint and approved runtime attribution;
- user-facing sanitised filename ending in `.pdf`;
- `application/pdf` content type;
- final size in bytes;
- generated PDF output checksum;
- actor attribution;
- stored timestamp or, for a failed attempt, failed timestamp and sanitised failure category.

These successful-output values become immutable when the document enters `STORED`. They support tenant-scoped queries, audit review and trusted retrieval without exposing the storage provider record.

### `GeneratedFile`

The generated-file record owns storage concerns:

- exact immutable PDF bytes for the PostgreSQL provider;
- provider identifier for the Release 1.4 physical object and active locator;
- opaque storage key that is immutable for the lifetime of the specific physical object it identifies;
- storage state, limited to the minimum states needed to distinguish an incomplete write from a complete stored object;
- byte length;
- SHA-256 checksum of the stored bytes;
- storage timestamp;
- safe provider metadata only where operationally necessary;
- unique one-to-one relationship to `Document`.

Size and checksum are intentionally present on both records. On `Document` they are immutable governed output evidence; on `GeneratedFile` they are storage integrity evidence. They must be equal before `STORED`. This small duplication prevents storage implementation details from becoming the document query model and makes a later provider migration verifiable.

In Release 1.4, the generated-file record identifies the one physical PostgreSQL object and therefore also supplies the active locator. A future approved migration may introduce a new physical object and a new active locator, but it must not edit the original object's provider/key pair to mean different bytes. The prior provider/key attribution must remain in immutable migration audit evidence or an approved storage-location history. The governed `Document` identity, size, and generated PDF checksum remain unchanged.

Do not duplicate title, template, resource, actor, lifecycle, merge data, homeowner data, filename, content type, or product concepts on `GeneratedFile`. Do not expose raw generated-file database models to product code.

## Storage Abstraction

Use a small product-neutral internal contract equivalent to:

```ts
type ImmutableFileWrite = {
  storageKey: string;
  bytes: Uint8Array;
  contentType: 'application/pdf';
  expectedSizeBytes: number;
  expectedChecksumSha256: string;
};

type StoredFileMetadata = {
  provider: string;
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
  storedAt: Date;
};

interface GeneratedFileStorage {
  writeImmutable(input: ImmutableFileWrite): Promise<StoredFileMetadata>;
  readImmutable(storageKey: string): Promise<{
    bytes: Uint8Array;
    metadata: StoredFileMetadata;
  }>;
  exists(storageKey: string): Promise<boolean>;
  verifyIntegrity(storageKey: string, expected: {
    sizeBytes: number;
    checksumSha256: string;
  }): Promise<'verified' | 'missing' | 'mismatch'>;
  compensateIncompleteWrite(storageKey: string): Promise<void>;
}
```

The actual implementation may combine reads and integrity calculation to avoid a second database read. The contract must:

- contain no SolarGRANT Pro, lead, quote, grant or installer concepts;
- return no public or signed URL;
- expose no raw Prisma model;
- reject overwriting an existing key;
- use the PostgreSQL provider in Release 1.4;
- permit compensation only when the owning document has not reached `STORED`;
- allow a future adapter only after a new ADR or explicit architecture approval.

Because the pilot cap is 4 MiB, a bounded `Uint8Array`/`Buffer` read and response is simpler and safer than premature chunking. The interface may later gain a streaming implementation without changing product adapters, but Release 1.4 must never accumulate unbounded content.

## Storage Keys

Storage keys are generated by the platform, preferably from a cryptographically strong random UUID or equivalent opaque identifier with a non-sensitive provider namespace. Storage keys are immutable identifiers for individual physical storage objects. A key is immutable for the lifetime of the specific physical object it identifies, is never edited or reused to reference different bytes, and a successfully stored physical object is never overwritten.

The active physical locator is the provider/key pair currently used by the platform to retrieve the verified bytes. It is distinct from both the immutable identity of an individual physical object and the immutable governed document content identity. No provider/key migration is implemented in Release 1.4. A future approved migration may create a new verified physical object with a new provider and opaque key, then update the active locator while preserving the previous provider/key attribution in immutable migration audit evidence or storage-location history. The original physical object's key remains historically immutable even when it is no longer the active locator. The governed `Document` identity and generated PDF checksum do not change.

A storage key must not contain:

- customer names, email addresses or homeowner details;
- lead names, grant data or user-provided identifiers;
- filenames, paths or path fragments supplied by a user;
- organisation names or other sensitive organisation data.

Keys are internal storage locators only. They are not access tokens, are not accepted from clients, are not placed in download URLs, are not returned to product UI, and are not sufficient to authorise a read. Possession of a key never grants download access.

## File Size Limits

Release 1.4 sets a strict maximum of 4 MiB (`4,194,304` bytes) for the final generated PDF. This matches the repository's existing bounded document-upload ceiling and is conservative for a short assessment PDF, synchronous Vercel execution and PostgreSQL byte storage.

Rules:

- validate the final rendered, post-normalisation byte length before a successful storage write;
- validate the provider-reported/stored byte length again before finalising `STORED`;
- never buffer more than the configured maximum plus only the small constant overhead required to detect an overflow;
- fail with `FILE_SIZE_LIMIT_EXCEEDED` when the final output exceeds the limit;
- never transition an oversized output to `STORED`;
- do not record successful file metadata while storage is incomplete;
- do not add chunked upload, multipart upload, range requests or background processing for the proving slice.

The implementation feature specification must define how the renderer is stopped or its output rejected at the boundary. Raising the limit requires evidence from real pilot PDFs and a reviewed database, memory, response and Vercel impact assessment.

## Checksums And Integrity

Use SHA-256 over the exact final PDF bytes stored and served to authorised users.

The order is:

1. Render the PDF.
2. Apply any approved deterministic PDF metadata normalisation.
3. Validate content type and size.
4. Calculate SHA-256 over those exact final bytes.
5. Store those exact bytes and the checksum.
6. Copy the verified size and checksum into immutable `Document` output metadata before `STORED`.

If no normalisation is specified, renderer output bytes are final. Normalisation must never occur after checksum calculation or during download.

The generated output checksum on `Document` proves the governed content bytes. The generated-file checksum proves physical storage integrity. Retrieval or diagnostics may calculate SHA-256 while reading and compare the actual bytes with both immutable values. Any missing value, size mismatch or checksum mismatch fails closed: corrupted or uncertain bytes are not returned.

Checksums have different purposes:

| Evidence | Purpose |
| --- | --- |
| Template snapshot checksum | Identifies the immutable declarative template snapshot. |
| Generation input checksum | Identifies the canonical validated merge input used for the attempt without exposing it. |
| Renderer runtime fingerprint | Attributes the effective renderer, interpreter, fonts, assets and runtime environment; it does not guarantee byte regeneration. |
| Generated PDF output checksum | Identifies the exact authoritative PDF bytes produced and stored for the document. |
| Storage integrity verification | Recomputes or otherwise verifies actual stored bytes against immutable size and output checksum evidence. |

No checksum is an access token or authorisation mechanism.

## Write And Compensation Flow

The practical pilot flow is:

```text
REQUESTED Document
-> render PDF
-> normalise if specified
-> validate application/pdf and <= 4 MiB
-> calculate SHA-256
-> write GeneratedFile record and bytes
-> finalise immutable Document metadata and resource link
-> transition Document to STORED
-> write audit evidence
```

Rendering occurs outside long-running database locks. For the PostgreSQL provider, generated-file insertion, document finalisation, the `REQUESTED -> STORED` transition and the success audit should use one database transaction where repository implementation supports it. Transaction rollback then removes the inserted bytes and prevents a partially finalised `STORED` record.

Failure handling:

- If rendering or validation fails, no generated-file record is successfully stored; the attempt may transition `REQUESTED -> FAILED` with a sanitised code.
- If storage fails, the transaction rolls back and the document may transition to `FAILED` in a controlled follow-up write.
- If storage succeeds inside the transaction but document finalisation or success audit fails, roll back the transaction, including bytes.
- If a provider operation occurs outside the finalisation transaction in a future adapter, a failed finalisation leaves an incomplete pre-`STORED` object eligible for controlled compensation.
- A retry that finds an incomplete generated-file record must verify document state and may remove or replace only that incomplete pre-`STORED` record under the generation transaction rules.
- Orphan detection and manual cleanup may target only objects with no successfully `STORED` owner. Cleanup must be idempotent, audited and organisation-safe.
- A successfully `STORED` generated file is never deleted, overwritten, or replaced through compensation.

Audit success is part of the preferred transaction boundary. If required audit evidence cannot be written, do not expose a newly `STORED` document as successful. Exact retry ownership, locks and idempotency are deferred to generation-transactions work; this ADR does not design a distributed transaction system.

## Secure Retrieval

Use a platform-controlled authenticated server route equivalent to `/api/documents/[documentId]/download`. The client supplies only the governed document ID.

The route must:

1. authenticate the user;
2. resolve trusted actor, membership and active organisation context server side;
3. require `document.download`;
4. query `Document` by both `id` and trusted `organisationId`;
5. require generation status `STORED` and lifecycle status `ACTIVE`;
6. resolve the one-to-one generated-file record internally;
7. verify complete metadata, object existence, byte length and integrity as required;
8. return the bounded PDF bytes with safe headers;
9. write an actor-aware `download succeeded` audit event.

Client-supplied organisation IDs, roles, permissions, provider names, storage keys and filenames are not authoritative. The route must prevent insecure direct object reference by never loading a document by unscoped ID and never loading bytes from a client-supplied storage key.

Missing, cross-tenant and unauthorised requests use the repository's safe not-found or unauthorised treatment without revealing whether another organisation owns the ID. Denied attempts may be audited with only safe request and actor context. The route must not reuse the homeowner public-token route, redirect to a storage provider, or create a public URL.

Document bytes, merge data and customer content must not appear in logs or audit metadata.

## Download State Rules

| Generation state | Lifecycle state | Download rule |
| --- | --- | --- |
| `REQUESTED` | Any | Not downloadable. |
| `FAILED` | Any | Not downloadable. |
| `STORED` | `ACTIVE` | Downloadable only with trusted organisation scope and `document.download`. |
| `STORED` | `ARCHIVED` | Not downloadable by default in Release 1.4. |

A possible narrowly privileged archived retrieval path is deferred to the Document Access, Permissions and Audit feature specification. This ADR neither implements nor assumes it.

## HTTP And Streaming Rules

For the bounded PostgreSQL pilot provider, return a server-owned byte response from the Node.js route. A 4 MiB maximum makes one bounded database read and response practical and avoids inventing chunked database storage. If the framework can stream the already bounded bytes without changing integrity behaviour, that is allowed; it is not required.

Successful responses require:

- `Content-Type: application/pdf`;
- `Content-Disposition: attachment` with a sanitised filename ending in `.pdf`;
- an ASCII-safe fallback filename and standards-compatible encoded filename when needed;
- `X-Content-Type-Options: nosniff`;
- `Cache-Control: private, no-store`;
- no public CDN cacheability, provider redirect, signed URL, or raw storage key.

Filenames must be reduced to a leaf name, strip control characters and path separators, remove unsafe header characters, apply a bounded length, and enforce exactly one safe `.pdf` suffix. A filename is display metadata, never a storage path.

Missing, incomplete or corrupt bytes return a sanitised unavailable/not-found response as approved by the access feature specification. Responses must not contain raw stack traces, Prisma errors, database errors or provider errors. Range requests are not required for Release 1.4.

## Privacy And Caching

Generated assessments may contain homeowner personal data, property data, eligibility analysis, quotes and installer context. They must remain inside authenticated server retrieval and the approved persistence boundary.

Use `Cache-Control: private, no-store` for every successful generated-document download and error response that could otherwise disclose document existence. Do not use public CDN caching, browser-persistent application caches, public links, signed URLs, client-side storage keys, or provider redirects.

Operational code must avoid request-body, response-body and byte logging. Provider metadata is allowlisted, not copied wholesale. Error responses and audit metadata use identifiers and sanitised categories only.

## Audit And Observability

Release 1.4 must emit or measure these safe events:

- storage attempted;
- storage succeeded;
- storage failed;
- integrity failure;
- download succeeded;
- download denied;
- storage object missing;
- archived document download denied.

Exact action names belong in the access and storage feature specifications and should follow the repository's dotted naming style.

Allowed metadata includes safe document, organisation, actor, membership and template-version IDs; size; checksum; provider category; failure category; and an opaque provider key only when an approved operational use outweighs disclosure risk. Storage keys should normally remain out of general logs and audit metadata.

Logs and audit must not include PDF bytes, merge data, homeowner details, customer personal data, authentication or portal tokens, signed URLs, environment secrets, raw exception text, stack traces, provider credentials, database connection information, or unrestricted provider metadata.

Operational metrics should include counts, latency bands, byte totals, failure categories, missing-object counts and checksum mismatch counts. Metrics must not use customer content as labels.

## Failure Model

Use typed, sanitised categories at the platform boundary:

| Code | Meaning |
| --- | --- |
| `FILE_SIZE_LIMIT_EXCEEDED` | Final PDF bytes exceed 4 MiB. |
| `UNSUPPORTED_CONTENT_TYPE` | Output is not the required PDF content type. |
| `STORAGE_WRITE_FAILED` | Immutable bytes could not be persisted completely. |
| `STORAGE_OBJECT_MISSING` | Metadata points to no readable stored object. |
| `CHECKSUM_MISMATCH` | Actual bytes do not match immutable size or SHA-256 evidence. |
| `STORAGE_METADATA_INCOMPLETE` | Required provider, key, size, checksum, timestamp or relationship data is absent or inconsistent. |
| `DOCUMENT_NOT_DOWNLOADABLE` | Document state does not permit download. |
| `ACCESS_DENIED` | Authentication, permission or organisation access failed. |
| `STORAGE_PROVIDER_UNAVAILABLE` | The configured provider cannot currently complete the operation. |

Feature specifications may map these to existing public service codes such as `DOCUMENT_STORAGE_FAILED`, `DOCUMENT_DOWNLOAD_NOT_FOUND` or `DOCUMENT_DOWNLOAD_DENIED`, but the storage boundary must preserve a safe typed cause without exposing raw provider errors.

Generation failures may transition `REQUESTED -> FAILED`. Only sanitised failure code, category and failed timestamp may be stored on `Document`; never raw provider or database text. Retrieval failures do not mutate a valid immutable `STORED` document. They fail the request, emit safe operational evidence, and trigger investigation or repair outside the download transaction.

## Future Object-Storage Compatibility

This ADR does not select or implement an object-storage vendor.

Future compatibility rests on:

- a provider-neutral `GeneratedFileStorage` interface;
- immutable document output size and SHA-256 identity;
- separate active storage provider and opaque key attribution;
- immutable provider/key identity for each individual physical object;
- preserved prior provider/key attribution in migration audit evidence or storage-location history;
- no product dependence on provider models, URLs or credentials;
- checksum verification before and after any physical migration;
- a new ADR or explicit architecture approval before introducing a provider.

Three concepts remain distinct:

| Concept | Meaning | May change during physical migration? |
| --- | --- | --- |
| Document content identity | The governed `Document`, template attribution, input evidence and generated output checksum. | No. |
| Generated checksum | SHA-256 of the exact authoritative PDF bytes. | No. |
| Physical object identity | The immutable provider/key pair for one stored object containing specific bytes. | No; that key is never edited or reused to identify different bytes. |
| Active physical locator | The provider/key pair currently used by the platform to retrieve the verified bytes. | Yes; an approved migration may point it to a newly created and verified physical object. |

A later migration must create a new physical object with a new opaque key, copy the exact bytes, verify size and SHA-256 at the target, preserve prior provider/key attribution in immutable migration audit evidence or storage-location history, atomically change the active physical locator, and retain the same document ID and generated checksum. The original object's key remains historically immutable even if that object is no longer active. The migration must not edit a key in place, overwrite a successfully stored object, regenerate the document, or rewrite the PDF. No provider/key migration is implemented in Release 1.4, and any future migration requires a new ADR or explicit architecture approval. Detailed migration tooling, replication and multi-region design are deferred.

## Lifecycle And Cleanup

- There is no user-facing delete or physical purge of `STORED` documents in Release 1.4.
- `ARCHIVED` means retained, not erased.
- No retention schedule, legal hold, GDPR erasure workflow or automated cleanup of stored business records is introduced.
- Cleanup is permitted only for incomplete or orphaned pre-`STORED` writes after state and ownership checks.
- Cleanup must never delete bytes belonging to a `STORED` document.
- Test and preview environments must not use the production database.
- Hosted destructive, migration and storage tests remain blocked until TD-015 isolation and database fingerprints are satisfied.

## Existing Repository Compatibility

This decision is additive and leaves all current product behaviour unchanged:

- no migration, reuse, reinterpretation or dual-write of `LeadDocument`;
- no change to homeowner portal upload or public-token download routes;
- no change to public intake upload references;
- no change to application-pack views or print pages;
- no change to submission-package JSON or portal-fill-preview JSON;
- no change to quote estimates, generated quote calculations or SEAI logic;
- no change to lead workflow stages or transitions;
- no automatic document generation on workflow transitions.

Existing filename sanitisation and upload limit are evidence, not a shared generated-file implementation. The governed download route must use authenticated organisation context and must not inherit the portal route's redirect capability.

## Alternatives Considered

| Alternative | Pilot speed | Security and tenancy | Database/operations | Transactions and audit | Vercel fit | Future migration | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Store bytes directly on `Document` | Fastest schema shape. | Can be safe when tenant-scoped, but mixes governed metadata with binary persistence. | Larger hot/query row and broader accidental byte selection risk. | Strong single-row transaction; storage concerns leak into domain model. | Works within a strict cap. | Harder to change provider without reshaping `Document`. | Rejected. |
| Separate database-backed generated-file record | Fast and small. | Clear internal boundary; one-to-one ownership and tenant access through `Document`. | Keeps binary off normal document queries; simple backup/restore. | Strong PostgreSQL transaction and clear integrity evidence. | Works with bounded Node.js response and no filesystem. | Provider fields and checksum support migration. | Selected. |
| Reuse `LeadDocument` | Superficially fast. | Public-token and lead-scoped semantics are wrong for governed organisation documents. | Mixes uploads, AI fields, review states and generated files. | Weak domain attribution and future portability. | Existing route works but has redirect behaviour unsuitable here. | Couples platform storage to SolarGRANT Pro. | Rejected. |
| Local filesystem | Low local effort. | Difficult durable isolation and cleanup; paths risk leakage. | Ephemeral/non-durable in deployed serverless environments; poor backup. | Cannot provide reliable shared transaction boundary. | Incompatible with deployed Vercel runtime. | Poor. | Forbidden. |
| External object storage now | More scalable. | Could be safe but requires provider policy, credentials and access design. | Adds vendor, DPA, environment and operational work before pilot evidence. | Cross-system compensation is more complex. | Technically viable. | Strong at scale. | Deferred. |
| Database provider behind abstraction | Slightly more work than bytes directly on `Document`. | Strong boundary, no public URLs and tenant access remains in document service. | Simple pilot operations and bounded row size. | Best practical transaction handling and auditability now. | Compatible with PostgreSQL and bounded server response. | Adapter can be replaced after approved checksum-verified migration. | Selected combined approach. |

The selected approach optimises for safe implementation in two to three weeks. It adds one narrow record and one narrow interface, not media folders, attachments, sharing, previews, transformations, multi-file support, search, user deletion, or provider management.

## Consequences

Positive consequences:

- immutable bytes are separated from governed document queries;
- storage and document finalisation can share a PostgreSQL transaction;
- secure retrieval remains entirely behind platform authentication, permission and tenant scope;
- no new external service blocks the pilot;
- exact bytes are independently verifiable through SHA-256;
- future provider replacement does not change SolarGRANT Pro adapters.

Costs and constraints:

- PDF bytes increase PostgreSQL storage, backup size and restore time;
- database reads allocate a bounded buffer for each download;
- size and checksum exist in two records and must be transactionally consistent;
- synchronous generation and download remain constrained by the 4 MiB limit and Vercel execution characteristics;
- object storage migration later requires explicit approval and verified tooling.

## Risk Table

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cross-tenant IDOR | Customer document disclosure. | Trusted context, `document.download`, query by `id + organisationId`, safe denial tests. |
| Storage key treated as access | Bypass of document permissions. | Never accept or expose keys; authorise only through `Document`. |
| Corrupt or partial bytes served | Untrustworthy business record. | Transactional write, complete metadata checks, size and SHA-256 verification, fail closed. |
| Database growth | Cost and performance degradation. | 4 MiB cap, pilot metrics, bounded cohort, later provider ADR when evidence requires it. |
| Large response memory | Function pressure or timeout. | Strict 4 MiB cap, no unbounded buffering, concurrency/load validation. |
| Audit failure after storage | Missing evidence for a material action. | Include success audit in preferred transaction; do not expose success when it fails. |
| Cleanup deletes a valid document | Permanent record loss. | Compensation restricted to verified pre-`STORED` objects; no purge path for `STORED`. |
| Filename/header injection | Malicious response headers or paths. | Leaf-only sanitisation, control/header character removal, bounded `.pdf` filename. |
| Public or cached response | Sensitive file persists outside control. | Authenticated route, no redirects/URLs, `private, no-store`, `nosniff`. |
| Shared hosted database | Production data damage during testing. | Maintain TD-015 gate for hosted migrations and storage tests. |
| Provider details leak into product | Costly future migration. | Neutral interface and DTOs; no raw Prisma model or URL in product contracts. |
| Metadata or locator divergence | Integrity ambiguity or a key appearing to identify different bytes. | Require generated-file and `Document` size/checksum equality before `STORED`; never edit or reuse a physical-object key; preserve locator changes in approved immutable history. |

## Deferred Decisions

This ADR does not decide:

- full idempotency semantics or idempotency-key ownership;
- concurrency locks, distributed retries or orphan scheduling;
- background jobs or scheduled generation;
- object-storage vendor, signed URLs or public links;
- retention schedules, GDPR erasure or legal hold;
- archive UI or a privileged archived retrieval path;
- broad document-management UI, email or SMS delivery;
- range requests, chunked storage or multipart upload;
- multi-file documents, attachments or version replacement;
- PDF layout, merge fields or regeneration semantics beyond immutable replacement rules.

## Items Requiring Feature Specifications

### Platform Document Registry And Templates

- Confirm fields and constraints shared with `DocumentTemplateVersion` and `Document`.
- Preserve immutable template snapshot and checksum meanings.

### Document Generation, Persistence And Storage

- Finalise generated-file naming, fields, states and one-to-one constraints.
- Specify the 4 MiB enforcement point, PDF signature/content validation and normalisation policy.
- Specify write DTOs, PostgreSQL provider behaviour, transaction boundary and typed error mapping.
- Specify checksum calculation and retrieval-time verification frequency.
- Specify safe operational metrics and pre-`STORED` orphan handling.

### Document Access, Permissions And Audit

- Add and map `document.download` through existing permission conventions.
- Specify the authenticated route, safe HTTP status behaviour and exact audit action names.
- Specify filename encoding and safe response headers.
- Decide only if needed whether a narrow privileged archived retrieval path exists.

### SolarGRANT Pro Lead Assessment Summary

- Define the product title and filename source before platform sanitisation.
- Keep product merge data and lead lookup outside storage contracts.
- Confirm expected PDF sizes remain well below 4 MiB.

## Items Requiring Generation Transactions Work

- idempotency identity and retry ownership;
- concurrency control for duplicate attempts;
- exact transaction sequence for `REQUESTED`, render, storage, audit and finalisation;
- recovery when a retry finds an incomplete generated-file record;
- responsibility and timing for pre-`STORED` orphan detection and compensation;
- safe handling when audit persistence fails;
- proof that a `STORED` record can never be overwritten or compensated away.

## Items Requiring Implementation

After CTO approval and feature-spec approval, implementation must add only the approved proving-slice pieces:

- additive Prisma schema and migration for the document domain and generated-file record;
- PostgreSQL generated-file provider behind the neutral interface;
- PDF size, filename, content-type and checksum controls;
- transaction and compensation behaviour;
- authenticated organisation-scoped download route;
- `document.download` permission mapping and actor-aware audit events;
- unit, PostgreSQL integration, tenant isolation, permission, integrity, response-header and regression tests;
- operational metrics suitable for the pilot.

Acceptance of this ADR approves the architecture decision only. Implementation begins through the separately governed SolarGRANT Pro Pilot Readiness Sprint and approved feature specifications, not through this documentation close-out.

## Validation Expectations

Documentation validation for this ADR requires:

- durable-document metadata validation;
- internal Markdown link validation;
- COM navigation validation;
- placeholder scan with repository templates allowlisted;
- `git diff --check` and staged `git diff --cached --check`.

Later implementation validation must cover:

- success at the exact 4 MiB boundary and safe failure above it;
- exact-byte SHA-256 and metadata equality;
- missing, incomplete and corrupt object failure without byte disclosure;
- cross-organisation and missing-permission denial;
- all download-state combinations;
- safe headers and filename injection cases;
- transaction rollback and pre-`STORED` compensation;
- proof that `STORED` bytes cannot be updated or deleted through normal services;
- portal, intake, application-pack, quote and workflow regression safety;
- bounded memory and representative pilot concurrency on the supported Vercel runtime;
- hosted database isolation before any hosted storage test.

## Follow-Up

1. Proceed next to the SolarGRANT Pro Pilot Readiness Sprint rather than additional planned architecture work, unless implementation exposes a genuine material blocker.
2. Complete the four Release 1.4 feature specifications.
3. Complete generation transactions, idempotency and failure-handling work at implementation-specification level.
4. Resolve TD-015 before hosted migrations or generated-document storage tests.
5. Begin implementation only through the explicitly approved sprint scope; do not create a release tag as part of this ADR close-out.
