# ADR-0016: Template Versioning and PDF Rendering

| Field | Value |
| --- | --- |
| Document ID | ADR-0016 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | When template versioning, renderer strategy, or generated-document rendering contracts change |
| Last reviewed | 2026-07-15 |

## Context

Platform Release 1.4 creates the first governed generated-document foundation for Clada OS. [ADR-0015](ADR-0015-document-domain-ownership-and-resource-linking.md) established the document domain, organisation ownership, resource linking, lifecycle states, and the rule that every generated document references one immutable template version.

This ADR decides the second architecture layer for the release:

- how templates are owned and versioned;
- how immutable template evidence is preserved;
- how the first PDF renderer is selected;
- how merge-field contracts behave;
- how renderer independence is preserved;
- how existing SolarGRANT Pro quote, report, application-pack, print, and upload behaviour remains compatible.

This ADR is documentation and architecture only. It does not create Prisma schema, migrations, services, APIs, UI, template files, renderer libraries, generated-file storage, tests, seeds, or product functionality.

The governing documents for this decision are:

- [Constitution](../CONSTITUTION.md);
- [The Clada Way](../THE_CLADA_WAY.md);
- [Operating Principles](../OPERATING_PRINCIPLES.md);
- [Release Governance](../release-governance/README.md);
- [Platform Release 1.4 Master Specification](../release-specifications/PLATFORM_RELEASE_1_4_MASTER_SPECIFICATION.md);
- [ADR-0015](ADR-0015-document-domain-ownership-and-resource-linking.md);
- repository implementation evidence.

The repository currently has no installed PDF renderer dependency. `package.json` uses Next.js 15, React 19, Node 22, Prisma, Zod, and product-specific document-adjacent code. Existing evidence includes:

| Area | Repository evidence | Architectural treatment |
| --- | --- | --- |
| Uploaded documents | `LeadDocument`, portal upload/download routes, accepted MIME types, filename sanitisation, optional DB bytes, upload statuses. | Leave unchanged. These are SolarGRANT Pro uploaded evidence, not governed generated PDFs. |
| Application packs | `lib/application-pack.ts`, `ApplicationPackView`, and print-friendly application-pack pages. | Reuse as product evidence and possible merge-data source. Do not treat the HTML print page as the platform renderer. |
| Submission package | `/api/submission-package` and `buildSubmissionPackage`. | Reuse as product-owned merge-data evidence. Do not persist as a generated PDF. |
| Portal fill preview | `/api/portal-fill-preview`. | Leave product-specific and JSON-only. |
| Quote generation | `lib/quote-estimate.ts` and `lib/installer-quote-pricing.ts`. | SolarGRANT Pro owns calculations and wording. Generated PDFs may consume approved outputs as merge data. |
| Permissions | `document.read` and `document.review` exist; Release 1.4 expects `document.generate` and `document.download`. | Permission detail belongs in feature specs, with download separate from metadata read. |
| Audit | `lib/audit.ts` has actor-aware audit and sensitive metadata filtering. | Reuse audit boundary; do not log raw template source, raw merge values, or generated contents. |
| Runtime | Vercel deployment, Next.js Node routes, no renderer dependency. | Select a Node-compatible renderer behind a platform abstraction. |

External renderer evidence considered:

- React PDF official docs describe browser/server PDF generation, Node APIs such as `renderToBuffer` and `renderToStream`, page wrapping, fonts, styling, SVG primitives, and React 19 peer compatibility.
- Vercel's Puppeteer guidance says serverless Puppeteer needs specific configuration because the standard Puppeteer package is too large for function bundle limits and requires `puppeteer-core` plus a minimal Chromium package.
- Puppeteer and Playwright official docs both expose `page.pdf()` for Chromium print-to-PDF output.
- Chrome Headless supports `--print-to-pdf`.
- PDFKit and pdf-lib are MIT-licensed JavaScript PDF libraries, but their core strengths differ from a reusable template renderer.

## Locked Decisions

This ADR does not reopen these approved decisions:

- `DocumentDefinition`, `DocumentTemplate`, `DocumentTemplateVersion`, `Document`, and `DocumentResourceLink` exist.
- Generated documents are organisation-owned.
- Templates are globally registered and module-owned in Release 1.4.
- The Release 1.4 proving slice is the installer-facing SolarGRANT Pro Lead Assessment Summary PDF.
- Generated documents are immutable.
- Release 1.4 uses synchronous generation.
- Release 1.4 uses database-backed generated-file storage behind a storage abstraction.
- Existing `LeadDocument` behaviour remains unchanged.
- SolarGRANT Pro product logic must not leak into the generic document platform.

## Decision Summary

| Decision area | Selected approach |
| --- | --- |
| Template ownership | SolarGRANT Pro owns source wording, branding, merge-data mapping, and layout intent. Clada OS owns template lifecycle, version identity, activation, immutable attribution, and rendering contracts. |
| Template storage | Hybrid repository source plus immutable database snapshot. |
| Template model | Governed Release 1.4 templates use a constrained declarative template definition, not arbitrary React/TypeScript renderer code. |
| Template versioning | Append-only `DocumentTemplateVersion` records, immutable after activation, with canonical snapshot checksums and source provenance. |
| Activation | One active template version per template for new generation. Activation changes the current pointer only; generated documents keep their original version. |
| Replacement | Any content, schema, asset, branding, layout, or renderer-contract change creates a new template version. |
| Rollback | Reactivate a prior immutable version for future generation without editing it. Existing generated documents remain unchanged. |
| Renderer | Use React PDF through a Clada OS renderer abstraction for Release 1.4. |
| Renderer independence | Product adapters call the platform document service with template keys and merge data. They never import renderer libraries directly. |
| Renderer runtime fingerprint | Every PDF generation attempt calculates and persists a canonical runtime fingerprint for the effective executable rendering environment. Activated template versions record the approved expected runtime identity or immutable runtime fingerprint contract. |
| Merge contracts | Validate typed required and optional merge variables before rendering. Missing required fields fail generation before renderer invocation. |
| Regeneration | A stored generated PDF is never replaced. Intentional regeneration creates a new immutable `Document` unless an idempotent request returns the same existing attempt. |

## Architecture Diagrams

### Ownership Boundary

```text
SolarGRANT Pro
  owns:
    - assessment wording
    - SolarGRANT Pro branding
    - lead, quote, eligibility, and installer merge mapping
    - product layout intent
    - installer-facing disclaimers

        calls with template key + validated merge data
        v

Clada OS document platform
  owns:
    - document definition/template registry
    - template version identity
    - activation state
    - immutable snapshot attribution
    - renderer abstraction
    - generated document contract
```

### Generation Flow

```text
SolarGRANT Pro lead assessment adapter
  -> loads organisation-scoped lead, quote, and installer context
  -> maps product data to the approved merge contract
  -> requests generation for template key and active version
    -> Clada OS validates permission and resource ownership
    -> resolves immutable DocumentTemplateVersion snapshot
    -> resolves expected runtime fingerprint or runtime fingerprint contract
    -> canonicalises actual runtime metadata and checks compatibility
    -> validates merge data against the snapshot merge schema
    -> interprets the declarative template snapshot
    -> calls DocumentRenderer contract with an interpreted render tree
      -> React PDF adapter renders PDF bytes
    -> storage abstraction persists generated bytes
    -> Document records template version, actual runtime fingerprint, checksums, file metadata, and resource link
```

### Template Activation And Rendering Pipeline

```text
SolarGRANT Pro repository template definition
  -> validated canonical declarative template snapshot
    -> immutable DocumentTemplateVersion
      -> Clada OS template interpreter
        -> React PDF renderer adapter
          -> PDF bytes
```

### Renderer Independence

```text
Product adapter
  -> DocumentGenerationService
    -> TemplateVersionRepository
    -> MergeContractValidator
    -> TemplateInterpreter interface
    -> DocumentRenderer interface
      -> react_pdf adapter in Release 1.4
      -> future renderer adapter
    -> GeneratedFileStorage interface
```

SolarGRANT Pro depends on `DocumentGenerationService` and template/merge contracts, not on `@react-pdf/renderer`, Chromium, PDFKit, or any renderer-specific component model.

## Template Ownership

SolarGRANT Pro owns:

- declarative template definition in the repository;
- product wording;
- product branding;
- merge-data mapping from lead, quote, eligibility, installer, and sales-signal data;
- visual layout intent for the assessment summary;
- product-specific disclaimers;
- product review of exact content and design before implementation.

Clada OS owns:

- `DocumentDefinition` and `DocumentTemplate` registration;
- template key and namespace rules;
- `DocumentTemplateVersion` identity;
- activation and deactivation rules;
- immutable attribution on generated documents;
- merge-contract validation boundary;
- template interpreter contract;
- renderer contract and renderer adapter registry;
- generated-document output contract.

This split preserves the platform/product boundary. SolarGRANT Pro decides what the assessment says and how the product wants it presented. Clada OS decides how a reusable document platform proves version identity, accepts merge data, renders bytes, stores attribution, and allows future product modules to reuse the same mechanics.

## Constrained Declarative Template Model

ADR-0016 adopts a deliberately constrained declarative template model for governed templates in Release 1.4.

The approved Release 1.4 template source is not a normal executable React PDF component tree. A normal React PDF template can contain arbitrary component composition, custom helper functions, loops, conditions, style calculations, formatting rules, and pagination behaviour. Storing wording, layout tokens, checksums, and repository provenance would not preserve that executable behaviour.

Instead, a governed template has these layers:

| Layer | Owner | Rule |
| --- | --- | --- |
| Repository template definition | SolarGRANT Pro | Product-owned declarative source stored in the repository and reviewed like product content. |
| Canonical declarative snapshot | Clada OS | Validated, normalised, JSON-compatible representation stored immutably on `DocumentTemplateVersion`. |
| Template interpreter | Clada OS | Versioned platform code that interprets approved declarative primitives, conditions, repeats, styles, pagination rules, and formatters. |
| React PDF renderer adapter | Clada OS | Renderer adapter that converts the interpreted render tree into PDF bytes. |

The repository template definition may be authored in a developer-friendly format selected by implementation, but the governed source of truth for an activated version is the canonical snapshot. The snapshot must be serialisable and must not depend on product-authored runtime functions.

Release 1.4 governed templates may use only approved declarative constructs:

- document metadata;
- page size and margins;
- ordered blocks such as section, stack, row, grid, text, field, table, table row, table cell, spacer, divider, image, logo, header, and footer;
- style tokens from an approved style schema;
- merge-field references by path;
- conditional blocks using approved predicates such as exists, equals, not equals, empty, non-empty, boolean true, and boolean false;
- repeat blocks over approved array merge fields with bounded row templates;
- formatter keys from an allowlist, such as Irish date, euro currency, integer, decimal, percentage, yes/no, address lines, and safe fallback text;
- pagination hints such as page break before, keep together, repeat table header, and widow/orphan controls where the interpreter supports them;
- asset references only through immutable asset identifiers and checksums.

Release 1.4 governed templates must not include:

- product-authored React components;
- product-authored React PDF primitives;
- arbitrary JavaScript or TypeScript functions;
- arbitrary expressions;
- renderer imports;
- dynamic module loading;
- raw HTML;
- script execution;
- remote asset fetching during render;
- mutable template source reads during render;
- direct database queries from template logic;
- product-specific platform interpreter code.

This resolves the apparent contradiction between selecting React PDF and storing an immutable database snapshot. React PDF is not the template language for governed templates. The template language is the constrained Clada OS declarative model. React PDF is the Release 1.4 output adapter used after Clada OS has interpreted the immutable snapshot.

### Interpreter Versioning

The template interpreter is executable platform behaviour, so it must be versioned separately from template content.

Each activated `DocumentTemplateVersion` must record:

- template model version;
- interpreter key;
- interpreter version;
- interpreter contract checksum or equivalent identity;
- renderer key;
- renderer version;
- renderer contract version;
- expected runtime fingerprint or immutable runtime fingerprint contract;
- canonicalisation version.

If interpreter behaviour changes in a way that can alter output, new generation must use a new template version or a new interpreter contract version. Existing generated documents keep the original template-version, interpreter, renderer, input checksum, and output checksum attribution.

### Proof And Regeneration

The immutable snapshot proves the declared template instructions. The interpreter and renderer metadata prove which approved platform behaviours interpreted those instructions. The generated document checksum proves the actual stored bytes.

If Git history disappears, Clada OS can still prove:

- the canonical declarative template snapshot;
- the merge schema used to validate inputs;
- the interpreter and renderer identities used for generation;
- the expected runtime identity approved for the activated template version;
- the actual runtime fingerprint used for generation;
- the input checksum;
- the generated PDF checksum;
- the stored PDF bytes.

The runtime fingerprint supports evidentiary attribution, diagnoses output differences, and identifies runtime drift. It does not guarantee byte-for-byte regeneration, replace the stored immutable PDF, replace the generated PDF checksum, or replace template-version, interpreter, renderer, font, asset, or input metadata.

Exact byte-for-byte regeneration remains subject to the same interpreter, renderer, fonts, assets, locale, timezone, Node.js runtime, React PDF package, transitive PDF engine behaviour, and PDF metadata or normalisation controls being available. The stored immutable PDF bytes and generated output checksum remain the authoritative business record. Any later regeneration creates a new immutable `Document` unless the original idempotency identity returns the same existing attempt.

## Template Versioning

### Immutable Version Policy

Every activated template version is append-only.

These version fields are immutable after activation:

- template identity;
- version number or version label;
- canonical template snapshot;
- snapshot checksum;
- source checksum;
- merge schema;
- merge schema checksum;
- asset references and asset checksums;
- template model version;
- interpreter key and version;
- interpreter contract checksum or equivalent identity;
- renderer key;
- renderer contract version;
- renderer package/version metadata;
- output content type;
- source repository path and source commit when available;
- activation actor and timestamp.

A template version must not be edited in place to correct wording, branding, layout, schema, assets, renderer metadata, or source provenance. Any such change creates a new version.

### Activation Rules

- `DocumentTemplate` may have one active template version for new generation.
- Activating a version pins that version for future generation requests after activation.
- In-flight generation must pin the template version before rendering.
- Deactivating or replacing the active version does not alter generated documents.
- Inactive versions remain valid historical evidence and may remain downloadable through generated-document permissions when referenced by stored documents.

### Replacement Rules

A new template version is required when any of these change:

- static wording;
- disclaimers;
- merge-field requirements;
- optional-field fallback behaviour;
- product branding;
- layout structure;
- table structure;
- headers, footers, or pagination rules;
- image/logo assets;
- renderer target;
- renderer contract version;
- output format rules;
- canonicalisation rules.

Minor metadata-only updates to `DocumentTemplate`, such as description, active pointer, or administrative status, may remain mutable if they do not change what generated a document.

### Rollback Strategy

Rollback means activating a previous immutable template version for new generation.

Rollback does not:

- edit the previous version;
- delete the superseded version;
- change any generated document;
- regenerate existing PDF bytes;
- rewrite document attribution.

Generated documents created during a bad active version remain immutable records. If the business decides a corrected document is required, the system generates a new `Document` using an approved template version and links it to the same primary resource.

### Checksum Strategy

Each template version records multiple checksums:

| Checksum | Purpose |
| --- | --- |
| Source checksum | Proves the repository template definition that was activated. |
| Snapshot checksum | Proves the canonical immutable snapshot stored by the platform. |
| Merge schema checksum | Proves the validation contract used before rendering. |
| Asset checksums | Prove logos, fonts, or other bundled assets used by the template. |
| Interpreter contract checksum or version | Proves the platform interpreter behaviour used to turn the declarative snapshot into renderer instructions. |
| Renderer contract checksum or version | Proves the renderer contract shape accepted by the adapter. |
| Runtime fingerprint | Proves the canonical executable rendering environment identity approved for a template version or used by a generation attempt. |

Generated documents separately store:

- template version id;
- actual runtime fingerprint;
- raw canonical runtime metadata where needed for audit and diagnosis;
- generation input checksum;
- generated PDF checksum;
- output size;
- content type;
- storage metadata.

### Snapshot Strategy

The selected approach is a canonical immutable snapshot stored with `DocumentTemplateVersion`.

The snapshot should include enough evidence to prove, without Git history, what template generated a document:

- template key and definition key;
- complete canonical declarative render instruction tree;
- static text and disclaimers;
- branding tokens;
- layout tokens;
- header/footer/page rules;
- approved condition and repeat instructions;
- approved formatter keys and fallback rules;
- pagination hints interpreted by Clada OS;
- merge schema;
- template model version;
- interpreter key, version, and contract identity;
- renderer key and renderer contract version;
- expected runtime fingerprint or immutable runtime fingerprint contract;
- asset references and immutable asset checksums;
- source provenance, including repository path and commit SHA when available;
- canonicalisation version.

Repository path and commit SHA are useful provenance, but they are not sufficient. If Git history disappears in five years, Clada OS must still be able to prove exactly which declarative template snapshot, merge schema, interpreter contract, renderer contract, input checksum, and output checksum produced the stored document.

The platform must not execute arbitrary template code from the database in Release 1.4. The governed template source is declarative: product-owned repository source is validated and canonicalised into a platform snapshot consumed by the Clada OS template interpreter. If implementation evidence later requires executable template source, that requires a new ADR, explicit security review, and feature-specification approval.

## Template Storage Decision

Selected: hybrid repository source plus immutable database snapshot.

| Option | Advantages | Disadvantages | Audit implications | Deployment implications | Future editing | Rollback | Deterministic regeneration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Repository-only | Simple review in Git; no DB snapshot table complexity; works with normal deployment. | Cannot prove exact template if Git history, branch, assets, or dependency lockfile disappear; active version is tied to deployed code. | Weak for long-term evidence unless every generated PDF stores enough output proof. | Low deployment complexity. | Code review only. | Git revert or redeploy. | Insufficient on its own. |
| Repository plus immutable snapshot | Keeps code review and product ownership while preserving exact activated evidence in the platform. | Requires activation/canonicalisation workflow and immutable snapshot storage. | Strong: generated documents reference durable snapshot evidence. | Moderate: deploy source, activate version, store snapshot. | Repository editing now; future editor can emit same snapshot shape. | Reactivate prior version. | Strong if renderer and dependencies remain available or recoverable. |
| Database-only | Centralised template storage; easier future UI editing. | Weak code review; risk of unreviewed production edits; higher permissions/security burden. | Strong if immutable, weak if directly mutable. | Requires template admin tooling before the product needs it. | Easier later, risky now. | Reactivate prior rows. | Strong only if snapshots are immutable and renderer contract is stable. |
| Hybrid source, snapshot, and future editor | Best long-term platform path. | Too broad for Release 1.4 if editor support is implemented now. | Strong. | Higher future operational needs. | Future customer or admin editing possible. | Strong. | Strong. |
| Customer-editable templates now | Flexible for customers. | Out of scope; high support, permission, security, and QA burden. | Harder because customer edits need review, attribution, and audit. | Requires editor, preview, validation, and moderation. | High. | Requires version history per customer. | Possible but outside Release 1.4. |

The selected approach matches the Master Specification: SolarGRANT Pro owns repository template definitions, while Clada OS owns immutable activated template snapshots, interpreter contracts, renderer contracts, and attribution.

## PDF Rendering Decision

Selected renderer for Release 1.4: React PDF behind a Clada OS `DocumentRenderer` abstraction.

The renderer key should be product-neutral, for example `react_pdf`, and stored on `DocumentTemplateVersion` with a renderer contract version and package version. The product module must not import React PDF directly.

The React PDF adapter renders the output of the Clada OS template interpreter. It does not execute SolarGRANT Pro-authored React components and does not read arbitrary template code from the database.

### Renderer Runtime Fingerprint

Every PDF generation attempt must calculate and persist a canonical runtime fingerprint identifying the effective executable environment used to produce the PDF.

The exact implementation representation belongs in the relevant feature specification, but the architectural requirement is fixed by this ADR. The fingerprint must be derived from approved, non-secret, canonical runtime metadata including at minimum:

- template model version;
- canonicalisation version;
- interpreter key;
- interpreter version;
- interpreter contract version or checksum;
- renderer key;
- renderer adapter version;
- renderer contract version;
- React PDF package version;
- any relevant transitive PDF rendering engine version where it can affect output;
- Node.js runtime version;
- font checksums;
- immutable asset checksums;
- locale;
- timezone;
- PDF metadata or normalisation policy version.

The runtime fingerprint represents the rendering environment, not the product template. It does not replace the canonical template snapshot, merge schema, interpreter metadata, renderer metadata, font checksums, asset checksums, input checksum, generated PDF checksum, or stored immutable PDF bytes.

There are two related runtime identities:

| Runtime identity | Stored on | Purpose |
| --- | --- | --- |
| Expected runtime identity | Activated `DocumentTemplateVersion` | Defines the approved renderer/interpreter/runtime environment for future generation, either as an expected runtime fingerprint or an immutable runtime fingerprint contract. |
| Actual runtime identity | Generated `Document` | Records the actual canonical runtime metadata and fingerprint used by that generation attempt. |

Actual runtime metadata must be canonicalised before hashing. The raw canonical runtime metadata should also be retained where needed for audit, diagnosis, and drift investigation. Secrets, environment-variable values, host identifiers, deployment URLs, machine names, request identifiers, and unrelated infrastructure data must not be included in the runtime metadata or fingerprint.

Generation must not silently continue when the executing runtime is incompatible with the activated template version's approved runtime contract. The exact mismatch policy belongs in the generation feature specification, but it must choose a controlled outcome:

- fail generation before rendering with a typed runtime compatibility error; or
- require activation of a new template version approved for the new runtime.

Silent runtime drift is not allowed.

### Renderer Comparison Matrix

| Candidate | Vercel compatibility | Cold start | Bundle size | Deterministic output | Typography | Pagination | Tables | Branding/assets | Accessibility | Maintenance | Security | Licensing | Testing | Future reuse | Operational complexity | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React PDF | Good fit for Node runtime; no bundled Chromium. | Better than browser-based rendering. | Lower than Chromium options; npm evidence shows small renderer package but dependencies still matter. | Good if fonts, dates, metadata, assets, interpreter version, and renderer version are pinned and tested. | Good for business documents with registered fonts; not browser CSS. | Built-in page wrapping and explicit page breaks exposed through the platform interpreter. | Requires table primitives/patterns in the interpreter; acceptable for controlled assessment layout. | Supports images and SVG primitives with constraints. | Must be tested; tagged PDF support is less mature than browser print options. | Moderate; React remains behind the platform adapter. | Lower attack surface than loading HTML in a browser; remote assets must still be forbidden. | MIT. | Unit and snapshot tests can validate interpreter output and rendered buffers/streams. | Strong for repository-owned declarative templates. | Moderate. | Selected. |
| HTML -> Chromium through Puppeteer | Strong HTML/CSS fidelity; Vercel requires `puppeteer-core` plus minimal Chromium because standard Puppeteer is too large for function limits. | Higher because Chromium must start. | High due Chromium. | Moderate; browser and font changes can affect output. | Excellent browser typography. | Browser print CSS, headers, and footers. | Excellent HTML tables. | Excellent HTML/CSS/SVG support. | Browser print can support tagged PDFs in some tooling, but must be verified. | Moderate-high. | Higher SSRF/remote asset/script risks if not locked down. | Apache-2.0 for Puppeteer; Chromium licensing must be reviewed. | Visual and PDF tests possible but heavier. | Strong if HTML templates become strategic. | High in serverless. | Rejected for Release 1.4. |
| Playwright PDF | Similar Chromium print-to-PDF capability; Playwright is excellent for testing but browser binaries are operationally heavy for generation. | Higher because Chromium must start. | High due browser runtime. | Moderate; browser and font changes can affect output. | Excellent browser typography. | Browser print CSS. | Excellent HTML tables. | Excellent HTML/CSS/SVG support. | Playwright exposes tagged PDF option, but it must be proven with target output. | Moderate-high. | Higher browser sandbox and remote asset risks. | Apache-2.0. | Excellent test tooling, but generation runtime is heavy. | Strong if generation moves to browser service later. | High in serverless. | Rejected for Release 1.4 generation; may be used for verification later. |
| HTML -> Chromium via raw headless Chrome | Uses Chrome `--print-to-pdf`; requires managing binary availability and process execution. | Higher. | High or environment-dependent. | Moderate. | Excellent browser typography. | Browser print CSS. | Excellent. | Excellent. | Must be verified. | High because app owns process management. | Higher browser/process risk. | Chrome/Chromium licensing must be reviewed. | Harder than Playwright/Puppeteer APIs. | Possible but provider-specific. | High. | Rejected. |
| PDFKit directly | Node-friendly and MIT; no browser. | Low-moderate. | Moderate. | Good if implemented carefully. | Good low-level text/font control. | Manual pagination burden. | Manual table layout burden. | Images/vector support, but layout work is manual. | Manual. | Higher implementation burden for reusable templates. | Lower browser attack surface. | MIT. | Unit tests possible. | Useful as low-level engine, but less ergonomic. | Moderate. | Rejected as direct renderer; acceptable indirectly through React PDF. |
| pdf-lib | Pure JavaScript, good for creating/modifying PDFs. | Low. | Moderate-large package. | Good for deterministic post-processing. | Low-level drawing, not a full layout engine. | Manual. | Manual. | Images/vector support. | Manual. | High burden for full documents. | Lower browser attack surface. | MIT. | Unit tests possible. | Best for stamping, merging, or metadata, not primary layout. | Moderate. | Rejected as primary renderer. |
| External PDF rendering service | Can provide strong rendering and scaling. | Depends on provider. | Low app bundle size. | Provider-dependent. | Often strong. | Provider-dependent. | Provider-dependent. | Provider-dependent. | Provider-dependent. | Adds vendor and data-processing burden. | Customer data leaves app boundary; privacy and DPA review required. | Provider-dependent. | Requires contract tests and mocks. | Possible later. | High provider complexity. | Rejected for Release 1.4. |

### Why React PDF

React PDF is the best Release 1.4 fit because:

- it runs in Node without a managed browser binary;
- it supports server-side rendering to buffers and streams;
- it supports React 19 peer dependency ranges, matching the repository runtime direction;
- it has page wrapping, explicit page breaks, registered fonts, supported style properties, images, and SVG primitives that the platform interpreter can target;
- it avoids adopting Chromium, browser process management, or an external rendering provider for a small bounded proving slice;
- it can sit behind a renderer adapter so future products do not inherit React PDF directly;
- it is sufficient for a controlled installer-facing assessment summary with tables, sections, branding, and disclaimers.

The decision is not "React PDF forever" and it is not "SolarGRANT Pro writes React PDF templates". It is "Clada OS interprets a constrained declarative template snapshot and uses a React PDF adapter for Release 1.4".

### Rejected Options

Puppeteer, Playwright, and raw Chromium are rejected for Release 1.4 generation because the first slice does not justify serverless browser operational complexity, cold start, bundle-size pressure, browser sandboxing concerns, or remote asset risk. They remain credible future options if Clada OS later needs HTML/CSS template reuse, browser-accurate rendering, or a separate rendering worker/service.

PDFKit and pdf-lib are rejected as primary template renderers because they push too much pagination, table, and layout work into bespoke platform code. PDFKit remains acceptable as an indirect dependency under React PDF or as a future low-level adapter. pdf-lib remains useful for future PDF modification, merging, stamping, metadata normalisation, or attachments if approved later.

External PDF rendering services are rejected because Release 1.4 has not approved a provider, DPA, data-retention policy, retry policy, provider abstraction, or cost model for customer data leaving the application boundary.

### Renderer Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| React PDF layout differs from browser CSS expectations. | Use a dedicated PDF template model and feature-spec review; do not reuse arbitrary HTML pages as PDF templates. |
| Tables become hard to maintain. | Define a small platform table/block component set in implementation and keep the assessment layout controlled. |
| Output is not byte-for-byte deterministic because of metadata, timestamps, fonts, or package changes. | Pin renderer version, fonts, assets, timezone/locale, and template snapshot. Add renderer tests for either stable bytes or a normalized PDF checksum approved by the feature spec. |
| Accessibility support may be weaker than browser-generated tagged PDFs. | Feature specs must define minimum accessibility expectations. If React PDF cannot meet them, create a new renderer ADR or versioned renderer adapter before customer-facing expansion. |
| Renderer-specific code leaks into SolarGRANT Pro. | Enforce `DocumentRenderer` abstraction and forbid product imports from renderer packages. |
| Remote images or fonts create SSRF or privacy risk. | Snapshot approved assets at activation. Do not fetch remote assets during generation unless a future ADR approves it. |
| Package maintenance changes. | Store renderer package/version metadata and allow future template versions to target a different renderer adapter. |
| Declarative model is too constrained for later document types. | Keep Release 1.4 deliberately narrow; add new declarative primitives through ADR or feature-spec approval rather than permitting arbitrary template code. |
| Interpreter behaviour changes without a template-version change. | Version interpreter contracts and require new template versions or contract versions for output-affecting changes. |

## Merge Field Contracts

The platform owns the merge-contract rules. Product modules own the product-specific merge-data mapping.

### Contract Rules

- Every template version has an immutable merge schema.
- Merge schemas distinguish required, optional, deprecated, and reserved variables.
- Merge schemas define types, formats, enum values, nested object shapes, arrays, and bounded lengths where needed.
- Required variables must be present and valid before rendering starts.
- Optional variables must define one of:
  - a fallback value;
  - an omission rule;
  - a conditional visibility rule.
- Unknown variables should be rejected by default to catch accidental contract drift.
- Variables must be escaped or rendered as text by default.
- Raw HTML, scripts, remote URLs, and unbounded rich text are not allowed merge values in Release 1.4.
- Dates, currency, percentages, and measurements should be passed as typed values or canonical strings according to the feature spec, not formatted ad hoc by the renderer.
- Formatting is performed only by approved formatter keys in the template snapshot or by product-owned merge-data preparation before validation. The renderer adapter must not contain product-specific formatting rules.
- The platform may store input checksums and validation outcomes, but must not store raw merge data in audit metadata.

### Missing Variable Behaviour

| Variable state | Behaviour |
| --- | --- |
| Missing required variable | Fail before rendering with a typed validation error. No stored PDF is exposed. |
| Invalid required variable | Fail before rendering with a typed validation error. |
| Missing optional variable with fallback | Render the approved fallback. |
| Missing optional variable with omission rule | Omit the block or field according to the template rule. |
| Unknown variable supplied | Reject unless the schema explicitly allows forward-compatible extras. |
| Deprecated variable supplied | Ignore or reject according to schema version rules; do not silently change output. |

### Type Safety And Future Compatibility

Implementation should derive TypeScript types and runtime validation from one approved schema source, likely Zod or a JSON-schema-compatible representation selected in the feature specification. The schema belongs to the template version snapshot, not to mutable product code alone.

Breaking merge-contract changes require a new template version. Backward-compatible additions may be allowed only when every new field is optional with an explicit fallback or omission rule.

This ADR does not define every SolarGRANT Pro merge field. Feature Specification 4 must define the Lead Assessment Summary merge fields, labels, disclaimers, and product-specific data mapping.

## Interpreter And Renderer Abstraction

The platform should expose separate interpreter and renderer contracts.

The template interpreter consumes immutable declarative snapshots and validated merge data. It returns a renderer-neutral render tree. The renderer adapter consumes that render tree and returns bytes.

Illustrative interpreter contract:

```ts
type TemplateInterpreterInput = {
  templateVersionId: string;
  templateSnapshot: DeclarativeTemplateSnapshot;
  mergeData: unknown;
  renderContext: {
    timezone: 'Europe/Dublin';
    locale: 'en-IE';
  };
};

type TemplateInterpreterResult = {
  renderTree: DocumentRenderTree;
  interpreterKey: string;
  interpreterVersion: string;
  interpreterContractVersion: string;
};
```

Illustrative renderer contract:

```ts
type DocumentRendererInput = {
  templateVersionId: string;
  renderTree: DocumentRenderTree;
  expectedRuntimeFingerprint?: string;
  expectedRuntimeContract?: RendererRuntimeContract;
  output: {
    contentType: 'application/pdf';
    fileName: string;
  };
  renderContext: {
    timezone: 'Europe/Dublin';
    locale: 'en-IE';
  };
};

type DocumentRendererResult = {
  contentType: 'application/pdf';
  bytes: Uint8Array;
  rendererKey: string;
  rendererVersion: string;
  rendererContractVersion: string;
  runtimeFingerprint: string;
  runtimeMetadata: RendererRuntimeMetadata;
};
```

The exact implementation contract belongs in feature specifications, but the architectural rule is fixed: the document service calls a template interpreter and a renderer interface, not a renderer package and not product-authored React PDF code.

Template interpreters must:

- accept only immutable declarative template snapshots and validated merge data;
- support only approved primitives, predicates, repeat rules, formatter keys, style tokens, and pagination hints;
- reject unsupported template constructs;
- return a renderer-neutral document render tree;
- expose deterministic test hooks;
- never write `Document` records or storage records directly;
- never import SolarGRANT Pro lead, grant, quote, SEAI, or installer modules.

Renderer adapters must:

- accept only interpreter-produced render trees;
- return PDF bytes and renderer metadata;
- return canonical runtime metadata and a runtime fingerprint;
- avoid network access by default;
- avoid reading mutable template source during rendering;
- expose deterministic test hooks;
- never write `Document` records or storage records directly;
- never import SolarGRANT Pro lead, grant, quote, SEAI, or installer modules.

Renderer replacement later works by:

1. adding a new renderer adapter or interpreter version;
2. creating a new template version that targets the new interpreter and renderer contract versions;
3. validating the new output through feature-spec tests;
4. activating the new template version for future generation.

Existing generated documents continue to reference the old template version and renderer metadata.

## Immutability

### Immutable Template Information

Immutable template-version information includes:

- canonical snapshot;
- merge schema;
- template model version;
- interpreter key and contract version;
- renderer key and contract version;
- expected runtime fingerprint or immutable runtime fingerprint contract;
- asset checksums;
- source checksums;
- activation provenance;
- version identity.

### Mutable Template Metadata

Mutable metadata may include:

- `DocumentTemplate.isActive`;
- current active version pointer;
- display description;
- deactivation reason;
- administrative notes that do not affect rendering.

Mutable metadata must not change the meaning of a generated document.

### Generated PDF Immutability

Generated PDFs are immutable once stored.

A generated PDF must not be replaced in place because:

- the stored PDF is the business record of what was generated at that time;
- checksum and file metadata would otherwise lose meaning;
- the generated document must remain attributable to one immutable template version and one input checksum.

If a document is regenerated, the result is a new `Document` with its own:

- document id;
- template version id;
- actual runtime fingerprint;
- canonical runtime metadata where retained for audit and diagnosis;
- input checksum;
- output checksum;
- storage key;
- file metadata;
- actor attribution;
- audit events.

The only exception is idempotency: the same idempotency identity may return the same active attempt or stored document according to the generation transactions ADR. It must not mutate stored bytes.

## Existing Repository Compatibility

Release 1.4 must not create duplicate rendering systems or accidentally migrate existing product behaviours.

| Existing behaviour | Decision |
| --- | --- |
| `LeadDocument` uploaded evidence | Leave unchanged. Do not migrate, dual-write, or reinterpret as generated documents. |
| Portal upload/download token flow | Leave unchanged. Do not use public token download as the governed document download model. |
| Application-pack HTML view | Leave unchanged. It remains a product review surface and possible merge-data source. |
| Application-pack print page | Leave unchanged. It is browser-print-friendly HTML, not persisted PDF generation. |
| Submission package JSON | Leave unchanged. It may inform merge-data mapping but is not a generated document. |
| Portal fill preview JSON | Leave unchanged and product-specific. |
| Quote estimate and installer quote pricing | Leave product-owned. Generated documents may consume approved outputs, but Clada OS must not own quote calculations or wording. |
| Existing audit and permission helpers | Reuse through platform service boundaries. Do not create parallel auth or audit systems. |

Future migration or wrapping of uploaded applicant documents requires a separate ADR or feature specification. Customer-editable templates, broad document management, public document links, and document delivery remain out of scope.

## Alternatives Considered

### 1. Repository Templates Only

Advantages:

- simple Git review;
- minimal activation logic;
- aligns with current product source-control workflow.

Disadvantages:

- cannot prove exact template source if Git history or assets disappear;
- generated documents would depend on mutable deployed source;
- rollback and audit rely on repository availability;
- not sufficient for long-term trust.

Rejected because it fails the five-year evidence test.

### 2. Database Templates Only

Advantages:

- centralises template source and version history;
- supports future editor workflows;
- can be immutable if designed carefully.

Disadvantages:

- creates template authoring and permission surface before Release 1.4 needs it;
- weakens code review for product wording and layout;
- raises risk of unreviewed production edits;
- requires admin tooling, preview, and moderation out of scope.

Rejected for Release 1.4 because templates are repository-owned and product-reviewed.

### 3. Hybrid Repository Source Plus Immutable Snapshot

Advantages:

- preserves product code review;
- gives Clada OS durable version evidence;
- supports rollback by activation pointer;
- supports future template editor output using the same canonical snapshot contract;
- passes the five-year evidence test.

Disadvantages:

- requires activation and canonicalisation rules;
- requires immutable snapshot storage;
- requires careful checksum handling.

Selected because it best balances current simplicity with long-term auditability.

### 4. Customer-Editable Templates

Advantages:

- future customer flexibility;
- possible revenue feature for configurable proposals or reports.

Disadvantages:

- out of scope;
- requires tenant-owned templates, editor permissions, preview, version history, support process, moderation, and stronger audit;
- increases risk before the first generated-document foundation exists.

Rejected for Release 1.4 and deferred to future platform work.

### 5. Executable React PDF Repository Templates

Advantages:

- familiar React component authoring model;
- maximum flexibility for conditions, loops, helpers, styles, and layout logic;
- direct use of React PDF examples and community patterns.

Disadvantages:

- an immutable database snapshot of wording, tokens, and checksums would not preserve arbitrary executable behaviour;
- template proof would depend on Git history, TypeScript source, helper functions, build tooling, and runtime dependencies;
- product-authored renderer code could leak into the platform boundary;
- executing stored or dynamically loaded template code would create security and operational risk;
- future renderer replacement would be harder because product templates would directly target React PDF primitives.

Rejected for governed Release 1.4 templates. React PDF remains the renderer adapter target, not the product template language.

## Consequences

Positive consequences:

- generated documents remain attributable to exact immutable template versions;
- Clada OS owns reusable lifecycle and renderer contracts without owning SolarGRANT Pro wording;
- the executable template behaviour is constrained to a versioned Clada OS interpreter rather than product-authored renderer code;
- the first renderer avoids browser runtime complexity;
- future renderers can be introduced by new template versions;
- future products can reuse the same document platform;
- existing product document flows remain stable.

Negative consequences:

- React PDF requires PDF-specific layout components rather than reusing existing HTML directly;
- the constrained declarative model may require adding platform primitives before more complex future documents can be represented;
- table, typography, and accessibility quality must be proven in implementation tests;
- immutable snapshots add activation complexity;
- deterministic output needs careful control of fonts, dates, metadata, interpreter versions, renderer versions, runtime identity, and assets.

Technical debt:

- no new technical debt is introduced by this documentation-only ADR;
- implementation must avoid creating a second product-specific PDF system outside the platform renderer abstraction;
- TD-005 remains because durable documentation validation is still not scripted;
- TD-015 remains a hard hosted-environment gate for migrations and document-storage tests.

## Risk Table

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Template source changes without version change | Generated documents cannot be trusted. | Activation must create immutable snapshots and checksums; edits require new versions. |
| Git history disappears | Historical template proof is lost if relying on Git only. | Store canonical snapshots, merge schemas, interpreter metadata, renderer metadata, and checksums in `DocumentTemplateVersion`. |
| Declarative snapshot cannot represent executable React PDF behaviour | Template proof would be incomplete. | Do not permit executable React PDF product templates; store a complete constrained render instruction tree and interpret it through versioned Clada OS code. |
| Interpreter behaviour changes | Historical output attribution becomes ambiguous. | Store interpreter identity and contract version on template versions; require new template versions or contract versions for output-affecting interpreter changes. |
| Renderer package changes output | Checksums and deterministic tests may fail. | Pin renderer version per template version and test output stability. |
| Runtime drift during generation | A PDF may be produced under an unapproved executable environment. | Compare the actual canonical runtime fingerprint or metadata against the activated template version's expected runtime identity or contract before rendering. Fail with a typed runtime compatibility error or require a newly activated template version. |
| Runtime fingerprint captures secrets or host-specific data | Audit metadata could leak sensitive or irrelevant infrastructure detail. | Include only approved non-secret canonical metadata; exclude secrets, environment-variable values, host identifiers, deployment URLs, request identifiers, and unrelated infrastructure data. |
| Runtime fingerprint is mistaken for byte-regeneration guarantee | Reviewers may overstate reproducibility. | State that the fingerprint supports attribution and diagnosis only; stored PDF bytes and generated output checksum remain authoritative. |
| Product data leaks into platform | Future products inherit SolarGRANT Pro assumptions. | Product adapter owns merge mapping; platform owns generic contracts only. |
| Browser renderer adopted prematurely | Higher cold start, bundle, and security burden. | Select React PDF for Release 1.4 and keep Chromium options deferred. |
| React PDF cannot meet future accessibility or layout needs | Customer-facing expansion may be blocked. | Feature specs define acceptance criteria; future templates can target another renderer adapter. |
| Raw merge values appear in logs or audit | Privacy and trust failure. | Audit metadata stores identifiers and checksums only; sensitive metadata filtering remains mandatory. |
| Remote assets fetched during render | SSRF, availability, and privacy risk. | Snapshot approved assets; no runtime remote asset fetching in Release 1.4. |
| Existing portal document behaviour changes | Regression in customer uploads/downloads. | Leave `LeadDocument` and portal routes unchanged; add regression tests in implementation. |

## Future Compatibility Analysis

This decision supports future Clada OS products because:

- document definitions remain namespaced by product;
- template versions are module-owned but generated documents are organisation-owned;
- template interpreters and renderer adapters are platform contracts, not product dependencies;
- merge schemas can differ per product and template version;
- future products can introduce their own repository-owned declarative template definitions;
- future customer-editable templates can emit the same canonical snapshot format after a new ADR approves ownership, permissions, and editor workflow;
- browser-based rendering can be added later without changing SolarGRANT Pro adapters, by creating new template versions that target a new renderer key or interpreter contract.

Likely future products enabled by this approach include:

- SOLARfarm Pro site assessment reports;
- roofing proposals;
- HVAC installation assessments;
- plumbing compliance records;
- construction handover packs;
- landscaping estimates.

None of those products should inherit SolarGRANT Pro quote logic, SEAI wording, or lead-specific assumptions.

## Deferred Decisions

Deferred to feature specifications:

- exact Lead Assessment Summary content and layout;
- exact merge fields and Zod/schema representation;
- exact disclaimers;
- exact table/block component set;
- exact declarative template primitives and style tokens;
- exact canonicalisation rules for repository template definitions;
- exact interpreter contract and test fixtures;
- exact runtime metadata representation and canonical hashing rules;
- exact runtime compatibility mismatch policy;
- exact PDF file size limit;
- exact interpreter and renderer deterministic-test strategy;
- exact permission mapping for generation and download;
- exact audit action names;
- exact UI surface for invoking generation;
- exact filename format.

Deferred to ADR-0017:

- generated-file storage table or storage-object model;
- database-backed file storage abstraction details;
- storage keys;
- byte streaming and download headers;
- file size limits;
- checksum calculation for stored bytes;
- storage failure and cleanup behaviour;
- future object-storage migration;
- archived-document retrieval behaviour if tied to storage and retrieval.

Deferred to the generation transactions ADR:

- exact idempotency uniqueness;
- concurrency behaviour;
- transaction boundaries;
- retry rules;
- failed generation state;
- storage compensation after partial failure.

Deferred to future ADRs:

- customer-editable templates;
- tenant-owned template versions;
- external rendering providers;
- public document links;
- e-signatures;
- PDF/A or legally certified document output;
- broad document management;
- retention and GDPR erasure automation.

## Items Requiring Feature Specifications

- Platform Document Registry And Templates must define template activation, immutable snapshots, declarative model versioning, canonicalisation, interpreter metadata, registry fields, validation, and seed/registration flow.
- Document Generation, Persistence And Storage must define how the template interpreter and renderer adapter are invoked, how expected and actual runtime identities are compared, how runtime fingerprints and canonical runtime metadata are persisted, how generated PDFs are persisted, and how output checksums are calculated.
- Document Access, Permissions And Audit must define `document.read`, `document.generate`, `document.download`, audit actions, denied outcomes, and archived-document access.
- SolarGRANT Pro Lead Assessment Summary must define product content, merge fields, layout, disclaimers, visual design, product invocation, and compatibility tests.

## Items Requiring ADR-0017

- Whether generated PDF bytes live directly in a generated-file table or behind another database-backed storage model.
- Storage abstraction interface and provider metadata.
- Server-streamed download architecture.
- Content-Disposition and cache headers.
- Storage cleanup when rendering or final document update fails.
- Future object storage migration criteria.
- Whether storage checksums are computed before or after any PDF metadata normalisation.

## Items Requiring Implementation

Implementation is intentionally not started in this ADR. Later approved implementation must add:

- template registry schema and migration;
- declarative template definition validation and canonicalisation;
- immutable template snapshot storage;
- Clada OS template interpreter;
- renderer runtime fingerprint calculation and runtime compatibility enforcement;
- activation service;
- merge schema validation;
- React PDF renderer adapter behind `DocumentRenderer`;
- generated-document service integration;
- database-backed generated-file storage from ADR-0017;
- SolarGRANT Pro product adapter;
- Lead Assessment Summary declarative template definition;
- secure download route;
- permissions and audit events;
- regression tests for existing portal uploads, application packs, submission package JSON, quote calculations, and workflow behaviour.

## Validation Expectations

This ADR branch requires documentation-only validation:

- document metadata validation;
- internal Markdown link validation;
- COM navigation validation;
- placeholder scan;
- `git diff --check`.

Production build is not required because this PR does not change runtime code, schema, migrations, dependencies, or templates.

## Follow-Up

- Complete CTO review for this proposed ADR.
- Create ADR-0017 for generated file storage and secure retrieval.
- Create the generation transactions, idempotency, and failure handling ADR.
- Create the four required Release 1.4 feature specifications.
- Keep implementation blocked until ADRs, feature specifications, sprint scope, and explicit implementation authorisation are complete.
