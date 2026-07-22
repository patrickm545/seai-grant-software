# Platform Release 1.5 - Lead Workspace And Document Management Master Specification

| Field | Value |
| --- | --- |
| Document ID | REL-PLATFORM-1.5 |
| Status | Proposed |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-22 |
| Release | Platform Release 1.5 |
| Approved baseline | `9828af1` (PR #33 merge commit on `main`) |
| Target branch | `codex/platform-release-1-5-lead-workspace-docs` |
| CTO approval | Pending re-review |
| CEO approval | Pending re-approval |

## Executive Summary

Platform Release 1.5 will make the SolarGRANT Pro lead the installer's primary working environment from first enquiry through grant preparation, installation, and aftercare. It will expose existing Clada OS identity, permission, audit, workflow, and document capabilities through one coherent, tenant-safe workspace rather than creating a new platform architecture.

The release is centred on seven product outcomes: a unified lead workspace, authenticated manual lead creation, customer document centre, chronological activity history, minimum task-management foundation, durable installer notes, and predictable lead-local navigation. The workspace is a SolarGRANT Pro composition surface. Clada OS continues to own reusable identity, authorisation, audit, workflow, generated-document mechanics, and the accepted product-neutral work-item foundation.

The release must remain incremental. Existing lead, uploaded-document, workflow, audit, authentication, organisation, and generated-document boundaries remain authoritative. Release 1.5 will not merge audit, workflow history, product activity, uploaded evidence, and governed generated documents into ambiguous generic records.

The prior CTO and CEO approval is superseded by the Manual Lead Creation scope amendment. This Master Specification, all six feature specifications, ADR-0021, and the revised eight-PR sprint sequence are Proposed or Pending re-approval. PR #34 is a documentation-only draft. No Release 1.5 implementation is authorised and none has begun.

## Business Context

Pilot installers need to capture enquiries received outside the homeowner form, understand a customer record quickly, know the next action, find every relevant document, record working context, and see what changed without navigating across disconnected pages or maintaining a parallel spreadsheet. The current application contains useful lead facts, workflow progression, follow-up fields, notes, uploaded evidence, activities, audit records, and document architecture, but those capabilities are exposed as separate or inconsistent surfaces and authenticated installers cannot create a minimum lead honestly.

The Release 1.5 mission is operational cohesion rather than capability expansion. One complete workspace should reduce missed follow-ups, duplicated notes, document hunting, context switching, and training time while strengthening trust and pilot readiness.

Evidence includes:

- the product UX audit findings for lead-detail fragmentation, inconsistent navigation, weak mobile operation, document presentation, follow-up visibility, and error states;
- existing `Lead`, `LeadDocument`, `LeadActivity`, `WorkflowInstance`, `WorkflowHistory`, and `AuditLog` records;
- existing note, follow-up, stage-change, document-review, portal, application-pack, and dashboard behaviours;
- the current `Lead` requires full homeowner qualification data, so name-plus-contact manual capture needs an explicit progressive-completeness decision rather than placeholders;
- the Platform Release 1.4 document-domain ADRs, which deliberately keep uploaded evidence separate from governed generated documents;
- the pilot-readiness requirement for one trustworthy daily installer workflow.

## Authoritative Baseline And Dependency Gate

Repository review on 2026-07-22 used merge commit `9828af1`, the user-designated authoritative baseline after PR #33.

The baseline contains Release 1.4's approved Master Specification and ADR-0015 through ADR-0017. It does not contain the generated-document Prisma models, generated-file storage implementation, secure generated-document download route, Release 1.4 feature specifications, implementation migration, or completed Release 1.4 sign-off described by that specification.

The prior CTO review resolved the generated-document sequencing question without treating the missing capability as present. The Manual Lead Creation amendment preserves that decision but supersedes its implementation authorisation pending re-review:

1. No Release 1.5 implementation PR may begin until amended PR #34 is re-approved and merged.
2. After that gate, implementation PRs 1-6 may proceed in the approved sequence from the then-current `main`, subject to their own prerequisites.
3. Release 1.5 PR 7, Customer Document Centre, must not begin until the missing Platform Release 1.4 governed generated-document implementation has been completed, reviewed, and merged into `main`.
4. Release 1.4 implementation requires its own separately approved implementation PR sequence before Release 1.5 PR 7.
5. Existing uploaded `LeadDocument` evidence may be surfaced from the current baseline where an earlier approved Release 1.5 PR 1-6 workspace scope requires it, but it must remain explicitly classified as uploaded evidence.
6. Release 1.5 must not create a temporary generated-document substitute or duplicate, partially recreate, or relocate any Release 1.4 generated-document architecture.
7. ADR-0015, ADR-0016, and ADR-0017 remain authoritative for generated-document ownership, immutable templates/PDF rendering, storage, integrity, and secure retrieval.

ADR-0020 remains Accepted and unchanged. The revised release sequence is Proposed and authorises nothing until CTO and CEO re-approval and PR #34 merge. Re-approval must not authorise PR 7 before its separate Release 1.4 dependency is satisfied.

### Dependency Stop Conditions

Stop and return to CTO review if:

- any Release 1.5 implementation begins before the amended documentation is approved and PR #34 merges;
- Manual Lead Creation PR 2 begins before ADR-0021 is Accepted and its data migration is approved;
- a manual lead requires fabricated qualification, consent, property, or eligibility values, or weakens public intake validation;
- duplicate detection or assignment can reveal or link another organisation's records;
- Release 1.5 PR 7 is proposed, branched, or started before the separate Release 1.4 governed generated-document implementation sequence is approved, completed, reviewed, and merged into `main`;
- a Release 1.5 change creates a temporary generated-document substitute;
- Release 1.5 duplicates, partially recreates, relocates, or conflicts with architecture governed by ADR-0015, ADR-0016, or ADR-0017;
- uploaded `LeadDocument` evidence is presented as generated evidence or absorbed into the governed generated-document domain;
- a PR 1-6 scope begins to depend on generated-document runtime capability that is absent from current `main`.

## Strategic Objectives

1. Give installers one lead-local place to understand the customer, current state, next action, documents, tasks, notes, and material history.
2. Let authenticated installers capture a new enquiry using customer name and at least one contact method, then continue directly in the same workspace without inventing qualification facts.
3. Turn existing platform capabilities into a coherent, responsive SolarGRANT Pro experience without redesigning platform architecture.
4. Establish the minimum reusable Clada OS work-item foundation required for owned and due work.
5. Preserve tenant isolation, server-side authorisation, actor-aware audit, and immutable generated-document evidence.
6. Keep creation origin, business lead source, uploaded evidence, generated documents, product activity, workflow history, and compliance audit semantically distinct while presenting useful projections.
7. Prepare stable extension points for quote revisions, document version history, and collaboration without implementing them prematurely.
8. Improve pilot productivity with small, independently reviewable implementation PRs and measurable acceptance evidence.

## Scope

Release 1.5 includes:

- a canonical authenticated route and shared shell for each lead workspace;
- an authenticated, tenant-scoped `New Lead` flow requiring customer name and phone or email, with optional address, Eircode, source, internal note, follow-up, and active same-organisation assignee;
- explicit manual-versus-homeowner creation origin, typed creator attribution, truthful progressive qualification completeness, safe same-tenant duplicate warning, atomic workflow/activity/audit evidence, and redirect to the canonical workspace;
- a lead summary header showing identity, workflow stage, grant-readiness context, owner/assignee where reliable, and next action;
- lead-local navigation for Overview, Documents, Activity, Tasks, and Notes;
- responsive layout and mobile-critical actions without horizontal-table dependence;
- a phase-gated Customer Document Centre in Release 1.5 PR 7 that presents uploaded evidence and authoritative governed generated documents through one read model with visibly distinct types and states, only after the separate Release 1.4 implementation sequence has merged;
- document upload/review continuity through existing SolarGRANT Pro customer-document behaviour;
- limited surfacing of existing uploaded `LeadDocument` evidence in PRs 1-6 where an earlier approved workspace scope requires it, always labelled as uploaded evidence and never represented as a generated document;
- secure generated-document metadata and download consumption through Release 1.4 contracts only;
- a chronological lead activity projection across product activities, workflow transitions, task events, note events, and document events;
- a product-neutral, organisation-owned work-item foundation proved through lead tasks;
- task create, assign, set due date, complete, reopen, and cancel behaviours within approved permissions;
- append-only installer notes represented through the existing product activity boundary;
- audit events for protected task mutations, note creation, and sensitive document access where already required by governing ADRs;
- additive migrations and compatibility/backfill rules;
- route, permission, tenant-isolation, audit, migration, accessibility, responsive, and regression validation;
- documentation, rollout, deployment, support, and review evidence.

## Out Of Scope

Release 1.5 does not include:

- a replacement CRM or a general project-management suite;
- a second intake engine or lead aggregate, bulk import, lead merging, enrichment, CRM synchronisation, AI-assisted lead creation, messaging, configurable lead schemas, or custom lead-source taxonomies;
- homeowner qualification, eligibility decisions, quote calculation, automatic portal invitation, or fabricated consent/property/grant values during manual creation;
- boards, Gantt charts, task dependencies, recurring tasks, subtasks, labels, estimates, SLA automation, or custom task workflows;
- cross-lead or cross-organisation collaboration;
- comments, mentions, reactions, presence, or real-time co-editing;
- customer-visible installer notes;
- editing or deleting historical notes in place;
- full event sourcing or replacing `AuditLog`, `WorkflowHistory`, or `LeadActivity`;
- merging uploaded evidence into the governed generated-document domain;
- changing immutable generated files or template-version evidence;
- document folders, bulk operations, full-text search, external sharing, public generated-document links, e-signatures, OCR expansion, or retention automation;
- quote revision/version implementation;
- generated-document version-history implementation beyond displaying authoritative records already created by Release 1.4;
- broad dashboard redesign, notification foundation, messaging, email campaigns, SMS, calendar sync, installation scheduling/dispatch, inventory, payments, or accounting integrations;
- authentication, organisation, role, or permission architecture replacement;
- custom roles, organisation switching, SSO, MFA, or a new internal-support access model;
- a new workflow engine, document engine, or generic timeline persistence model;
- AI-authored notes, autonomous task creation, or consequential AI decisions.

## Platform Responsibilities

Clada OS owns:

- organisation and membership context;
- permission evaluation and default-deny protected service boundaries;
- actor-aware audit records;
- workflow definition, instance, transition, and history mechanics;
- governed generated-document definitions, immutable template versions, storage, resource links, and secure retrieval when present in the approved baseline;
- the minimum reusable work-item record, lifecycle, organisation ownership, resource link, assignment, due-date, and concurrency rules approved by ADR-0020;
- product-neutral task service contracts and audit action semantics;
- cross-cutting security, privacy, tenant-isolation, and observability rules.

## Product Responsibilities

SolarGRANT Pro owns:

- manual lead field vocabulary, creation UX, restrained acquisition-source choices, and truthful incomplete-qualification presentation;
- the lead workspace information architecture, labels, prioritisation, and navigation;
- lead summary, grant-readiness, SEAI, property, customer, quote, installation, and aftercare language;
- the Customer Document Centre projection and SolarGRANT Pro uploaded-evidence categories/review states;
- lead task labels, default task copy, and placement in installer workflows;
- installer-note wording and product activity presentation;
- timeline descriptions and grouping of platform facts into installer-readable entries;
- decisions about which actions are primary at each stage;
- responsive and accessible installer experience;
- pilot support and operational guidance.

Product code must consume platform services and may not bypass tenant, permission, audit, workflow, document, or work-item boundaries.

## Feature Breakdown

| Feature | Outcome | Specification |
| --- | --- | --- |
| Unified Lead Workspace | One canonical lead-local environment and navigation shell. | [Unified Lead Workspace](../04-features/FEAT-PLATFORM-1-5-UNIFIED-LEAD-WORKSPACE.md) |
| Manual Lead Creation | Minimum authenticated enquiry capture with explicit origin, trusted tenant/actor context, and direct workspace continuation. | [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md) |
| Timeline And Activity History | One readable chronology without collapsing source-of-truth records. | [Timeline And Activity History](../04-features/FEAT-PLATFORM-1-5-TIMELINE-AND-ACTIVITY-HISTORY.md) |
| Task Management Foundation | Structured owned and due work linked to a lead. | [Task Management Foundation](../04-features/FEAT-PLATFORM-1-5-TASK-MANAGEMENT-FOUNDATION.md) |
| Installer Notes | Durable, attributed, append-only operational notes. | [Installer Notes](../04-features/FEAT-PLATFORM-1-5-INSTALLER-NOTES.md) |
| Customer Document Centre | One clearly classified view of customer uploads and governed generated documents; PR 7 is blocked until the separate Release 1.4 implementation sequence is reviewed and merged. | [Customer Document Centre](../04-features/FEAT-PLATFORM-1-5-CUSTOMER-DOCUMENT-CENTRE.md) |

## UX Principles

1. **Work first.** The current state and next meaningful action appear before secondary detail.
2. **One lead, one place.** Lead-local work should not require returning to unrelated top-level pages.
3. **Truthful hierarchy.** Customer facts, workflow state, uploaded evidence, generated evidence, tasks, notes, and audit facts must be labelled according to what they are.
4. **Progressive disclosure.** Frequent actions remain obvious; advanced exports, destructive privacy actions, and internal diagnostics remain secondary.
5. **Fast scanning.** Status, due/overdue work, missing documents, and recent changes are visually distinguishable without decorative noise.
6. **Responsive by default.** At a 390 px viewport, installers can navigate, call/email, add a note, create or complete a task, review document status, and change permitted workflow state without horizontal scrolling.
7. **Accessible interaction.** Keyboard access, visible focus, semantic headings/landmarks, labelled status, minimum touch targets, and non-colour state cues are release gates.
8. **Recoverable actions.** Mutations show pending, success, validation, conflict, and recoverable failure states. Destructive or link-invalidating actions require clear confirmation.
9. **Stable URLs.** Workspace sections use canonical, deep-linkable routes or query state and preserve lead context.
10. **No fabricated data.** Empty, loading, filtered-empty, partial, and unavailable states must be truthful.
11. **Minimum capture.** Manual lead creation asks only for name and one contact method; optional and later qualification facts do not obstruct first capture.
12. **Safe duplicate awareness.** Potential-match warnings are bounded, advisory, tenant-local, and never disclose another organisation's records.

## Architecture Impact Assessment

### Selected Approach

The Lead Workspace is a SolarGRANT Pro composition layer over existing platform and product services:

```text
Authenticated installer request
  -> server-derived organisation and membership context
    -> SolarGRANT Pro lead workspace query/service
      -> organisation-scoped Lead and LeadActivity
      -> WorkflowInstance and WorkflowHistory
      -> LeadDocument uploaded evidence
      -> governed DocumentResourceLink and Document metadata when implemented
      -> organisation-owned WorkItem records
    -> view models for Overview, Documents, Activity, Tasks, and Notes

Authenticated installer New Lead request
  -> server-derived organisation, Installer, user, and membership context
    -> protected SolarGRANT Pro lead creation service
      -> existing Lead with explicit origin and progressive completeness
      -> existing WorkflowInstance, LeadActivity, and AuditLog contracts
    -> canonical Lead Workspace redirect
```

The workspace is not a new persistence aggregate. The lead remains the SolarGRANT Pro business record. Each underlying domain remains authoritative for its own facts.

### Dependency Direction

Allowed:

```text
SolarGRANT Pro workspace -> platform identity/permissions/audit/workflow/documents/work-items
SolarGRANT Pro workspace -> product lead/upload/activity services
```

Forbidden:

```text
platform capability -> SolarGRANT Pro routes, SEAI rules, lead labels, or installer UI
workspace query -> unscoped Prisma access
manual creation -> client-supplied tenant/actor ownership or placeholder qualification facts
timeline UI -> mutation of audit, workflow history, or generated evidence
document centre -> reinterpretation of LeadDocument as governed Document
```

### Architecture Decisions

- ADR-0005 and ADR-0008 govern tenant-aware access and authorisation.
- ADR-0009 governs actor-aware audit.
- ADR-0011 through ADR-0014 govern workflow and product timeline separation.
- ADR-0015 through ADR-0017 govern document ownership, resource links, immutability, storage, and retrieval.
- Installer notes extend `LeadActivity`, the existing product-owned timeline record.
- Timeline aggregation is a read projection, not a new event store.

ADR-0020 is required because introducing a reusable structured work-item record, lifecycle, ownership, resource link, and concurrency contract is a material platform data-model decision.

ADR-0021 is Proposed because minimum manual capture conflicts with the current non-null qualification-heavy `Lead` contract. It must decide explicit creation origin, progressive unknown values, typed creator/assignee attribution, migration, and path-specific validation. No separate ADR is required for the form, redirect, duplicate warning UX, workspace composition, notes, or timeline projection.

## Domain Model

| Concept | Authority | Release 1.5 treatment |
| --- | --- | --- |
| `Lead` | SolarGRANT Pro | Workspace root and customer/business record; gains explicit creation origin, typed creator/optional assignment, and progressive unknown qualification state under Proposed ADR-0021. |
| `LeadActivity` | SolarGRANT Pro | Product-readable timeline entries and canonical append-only installer notes. |
| `WorkflowInstance` / `WorkflowHistory` | Clada OS | Authoritative workflow state/history; projected into the timeline. |
| `AuditLog` | Clada OS | Trust/compliance record; not exposed wholesale as the product timeline. |
| `LeadDocument` | SolarGRANT Pro | Uploaded applicant/installer evidence and review status; remains separate. |
| `Document` / `DocumentResourceLink` | Clada OS Release 1.4 | Governed generated-document evidence linked to a lead when implemented. |
| `WorkItem` | Clada OS | Minimum structured task with organisation, resource link, status, assignment, due date, actor attribution, and timestamps. |
| Lead Workspace | SolarGRANT Pro | Read/composition surface; not a database entity. |
| Customer Document Centre | SolarGRANT Pro | Classified read model; not a unifying document table. |
| Timeline | SolarGRANT Pro | Stable, paginated projection; not a replacement event store. |

## Database Design And Data Model Impact

### Existing Records

- Do not rename, delete, or reinterpret existing lead, upload, activity, workflow, audit, or Release 1.4 document records.
- Keep `Lead.pipelineStage` compatibility rules governed by ADR-0014 and `TD-011`.
- Keep `Lead.internalNotes` readable during migration; do not overwrite it with an activity identifier.
- Existing `followUpDate` and `nextFollowUpAt` remain readable until task migration is validated.

### Proposed Manual-Lead Evolution

ADR-0021 must be Accepted before implementation. Its proposed minimum contract is:

| Concern | Proposed treatment |
| --- | --- |
| Creation origin | Constrained, explicit `HOMEOWNER_INTAKE` or `MANUAL_INSTALLER`; separate from business `leadSource`. |
| Creator | Typed user/membership attribution for authenticated creation; public intake keeps its established actor treatment. |
| Minimum manual facts | Bounded name and at least one validated phone or email. |
| Qualification facts | Unknown is stored as null/absent, not false, empty, zero, guessed, or consented. |
| Completeness | Explicit or derived service contract prevents unknown manual leads being presented as qualified, eligible, grant-ready, or consented. |
| Assignee | Optional active membership in the same organisation; no new use of legacy free-text assignee fields. |
| Workflow/evidence | Existing `NEW_LEAD` workflow instance, `LEAD_CREATED` activity, and safe audit event created atomically. |

Changing persistence nullability must not relax public homeowner intake validation. Existing leads require a truthful, reviewed, idempotent origin backfill. Ambiguous historical rows must use an explicitly approved legacy/unknown treatment rather than inference from missing customer fields.

### Approved Work-Item Foundation

ADR-0020 specifies the final names. The minimum approved fields are:

| Field | Purpose |
| --- | --- |
| `id` | Stable opaque identifier. |
| `organisationId` | Mandatory tenant owner. |
| `resourceType`, `resourceId` | Product-neutral resource link; Release 1.5 allows `lead` only. |
| `title`, `description` | Bounded task content. |
| `status` | `OPEN`, `COMPLETED`, or `CANCELLED`. |
| `priority` | Optional restrained priority; no custom taxonomy in this release. |
| `dueAt` | Optional due timestamp stored in UTC. |
| `assignedMembershipId` | Optional assignee within the same organisation. |
| `createdByMembershipId`, `completedByMembershipId` | Actor attribution where applicable. |
| `completedAt`, `cancelledAt`, `createdAt`, `updatedAt` | Lifecycle evidence. |
| `version` | Optimistic concurrency guard. |

Required constraints and indexes:

- foreign key to `Organisation`;
- assignee and actor memberships must belong to the same organisation, enforced through composite keys where practical and always validated in the service;
- bounded status/lifecycle consistency checks where supported;
- index on `(organisationId, resourceType, resourceId, status, dueAt)`;
- index on `(organisationId, assignedMembershipId, status, dueAt)`;
- no cross-tenant resource links;
- no hard delete through normal product workflows.

### Notes Migration

New installer notes are append-only `LeadActivity` entries using the existing note activity type and typed actor context. Existing `Lead.internalNotes` remains compatibility content. If populated, implementation should surface it as clearly labelled legacy context and may create one migration activity only if the migration plan proves idempotency and preserves original content and timestamps. Silent duplication is forbidden.

### Follow-Up Migration

For each lead with a future or overdue `nextFollowUpAt` (falling back to `followUpDate` only when the canonical field is absent), create at most one open lead work item using a deterministic migration key or equivalent uniqueness guard. Do not fabricate completion history. Preserve old fields during Release 1.5 rollback compatibility. Dual writes, if temporarily required, must be transaction-bound and removed in a later approved cleanup.

## Permissions

Reuse the existing role-to-permission model. Exact role mapping must be approved in the Task Management feature specification before implementation.

| Permission | Meaning |
| --- | --- |
| `lead.read` | Read the organisation-owned lead workspace and safe product projections. |
| `lead.create` | Create a lead inside the trusted organisation through an approved path-specific contract. Proposed for ADR-0021 review. |
| `lead.update` | Update approved lead facts where existing behaviour permits. |
| `lead.assign` | Assign an active same-organisation membership to a lead; required in addition to `lead.create` when Manual Lead Creation includes an assignee. |
| `lead.change_status` | Execute approved workflow transitions. |
| `document.read` | Read permitted document metadata. |
| `document.review` | Change uploaded-evidence review state. |
| `document.download` | Access governed generated file bytes; remains separate from metadata read. |
| `task.read` | Read organisation-owned work items. |
| `task.create` | Create work items for permitted organisation-owned resources. |
| `task.update` | Edit, assign, complete, reopen, or cancel permitted work items. |
| `note.create` | Add an attributed installer note to a permitted lead. |

If `lead.read`, `lead.update`, or an existing approved permission can safely cover a product action without ambiguity, the implementation feature review may reuse it. New task permissions are recommended because assigned work is reusable and materially different from editing customer facts. Default denial remains mandatory.

## Security And Privacy

- Resolve organisation and membership context server side through the existing authentication model.
- Query every tenant-owned record by both resource identity and trusted `organisationId`.
- Resolve manual-lead organisation, Installer, creator user, and creator membership from trusted server context; never accept ownership or actor attribution from the client.
- Never trust organisation, membership, assignee, actor, document-link, or lead ownership identifiers from client input.
- Verify cross-tenant consistency for work-item resource links and membership assignment.
- Apply separate metadata and file-byte permissions for governed documents.
- Preserve public portal-token flows as separate customer access paths; never treat possession of a portal token as installer authentication.
- Sanitize note/task input, apply explicit length limits, reject unsupported markup, and render as text unless a separately approved safe format exists.
- Do not place customer facts, note bodies, document filenames, portal tokens, file bytes, credentials, or raw provider errors in logs or audit metadata.
- Use safe not-found/forbidden behaviour that does not disclose cross-tenant resource existence.
- Bound duplicate warnings to exact normalised email, phone, or Eircode within records the actor may already read in the trusted organisation. Do not perform cross-tenant or fuzzy matching in Release 1.5.
- Treat manually supplied contact details as personal data, do not infer homeowner consent, and obtain privacy/legal approval for collection copy, retention, and follow-up handling before Production rollout.
- Apply CSRF protections inherent to approved server-action/route patterns and validate every mutation server side.
- Rate-limit or otherwise bound note/task mutation abuse if pilot evidence shows need; do not add speculative infrastructure.
- Maintain GDPR data-subject linkage and existing erasure/export semantics. Task and note retention must be included in future retention policy work and must not bypass legal-hold or audit requirements.

## Multi-Tenant Considerations

- A lead workspace belongs to exactly one organisation through the lead's authoritative ownership.
- All related uploads, activities, workflow instances/history, generated documents/resource links, tasks, assignees, and audit records must resolve to that same organisation.
- Composite database constraints should enforce organisation consistency for new work-item membership relationships where feasible.
- Services must reject a valid resource ID from another organisation without partial mutation or existence leakage.
- Duplicate candidate lookup must be organisation-scoped, bounded, and indistinguishable from no match when a record is outside the actor's authorised tenant scope.
- Internal support or internal admin access remains governed by ADR-0010 and explicit permissions; it is never universal.
- No organisation switching, cross-tenant task assignment, shared document link, or cross-organisation collaboration is introduced.

## Audit Implications

Audit remains distinct from the user-facing timeline.

Required successful audit actions include:

- `lead.created` with safe manual/homeowner origin and typed actor attribution;
- `task.created`;
- `task.updated` when due date, title, description, priority, or assignment materially changes;
- `task.completed`;
- `task.reopened`;
- `task.cancelled`;
- `lead.note_created`;
- existing document generation, review, download, archive, workflow transition, portal-token, and lead-update events where governed today.

Audit metadata should contain identifiers, creation origin, safe previous/next states, and bounded non-sensitive context. It must not duplicate note bodies, duplicate candidates, task descriptions, customer contact information, document content, portal tokens, or secrets. Denied attempts should follow the existing audit policy; Release 1.5 does not create a second denied-event store.

Timeline entries may link to the corresponding audit identifier where an existing service already provides it, but audit records remain authoritative and immutable.

## Services And Read Models

Required logical boundaries:

- `findPotentialLeadDuplicates`: performs bounded exact matching only inside the trusted organisation and returns safe summaries already permitted by `lead.read`;
- `createManualLead`: validates the minimum path-specific contract, trusted actor/tenant context, permission, idempotency, optional same-organisation assignment, and atomically creates lead/workflow/activity/audit records;
- `getLeadWorkspace`: returns an organisation-scoped summary and section counts using bounded queries;
- `getLeadDocuments`: returns a discriminated union of uploaded evidence and governed generated documents without hiding source semantics;
- `getLeadTimeline`: returns stable, paginated entries with source type, source ID, occurred time, actor-safe display, title, description, and optional navigation target;
- `listLeadWorkItems`, `createWorkItem`, `updateWorkItemStatus`, and `assignWorkItem`: use the platform work-item service and organisation context;
- `addInstallerNote`: validates permission, lead ownership, bounded content, actor context, product activity, and audit in one protected service boundary.

Server components, server actions, or internal route handlers may implement these contracts using existing repository conventions. A public API is not required. Raw Prisma models should not become client contracts.

## APIs And Navigation Contracts

The canonical installer route family should be selected during implementation review and used consistently. Existing bookmarks should redirect safely when a legacy route is replaced.

Minimum route semantics:

- one stable authenticated `New Lead` URL and action;
- one canonical lead workspace URL;
- stable section deep links for Overview, Documents, Activity, Tasks, and Notes;
- mutations use server-side actions or protected route handlers;
- document byte download remains a dedicated protected route governed by ADR-0017;
- query parameters for section, pagination, or filtering are allowlisted and validated;
- errors use stable product-safe categories such as not found, forbidden, validation failed, conflict, and temporarily unavailable.

## Transactions

- Manual lead, workflow instance, creation activity, and audit evidence commit atomically; approved optional note/follow-up integration must not leave partial success.
- A task mutation, lifecycle timestamps, actor attribution, audit event, and product timeline projection must commit atomically where the implementation writes more than one record.
- Adding an installer note and its audit event must commit atomically.
- Existing workflow transitions retain ADR-0014 transaction ownership.
- Existing document generation/storage transactions retain ADR-0016 and ADR-0017 rules.
- Read-model aggregation must not hold a database transaction across rendering or file streaming.
- No failed mutation may leave a successful activity entry or audit outcome claiming success.

## Concurrency

- Manual creation uses an idempotency key or equivalent repeat-submission guard; duplicate warning is advisory and does not impose false uniqueness on legitimate same-contact leads.
- Work-item updates use optimistic concurrency through a version/current-state guard.
- Competing completion requests may produce one success; later stale requests return a conflict and do not create duplicate success history.
- Reopening requires the expected completed state; cancelling requires a permitted current state.
- Follow-up backfill is idempotent and duplicate-safe.
- Notes are append-only and do not require edit conflict resolution.
- Timeline pagination uses a stable `(occurredAt, sourceType, sourceId)` cursor or equivalent deterministic ordering.
- Document generation and retrieval retain Release 1.4 idempotency and integrity rules.

## Threat Analysis

| Threat | Impact | Required mitigation |
| --- | --- | --- |
| Client-forged manual lead ownership/creator | Cross-tenant write or false attribution | Server-derived organisation, Installer, user, membership, permission, and actor context. |
| Fabricated qualification or consent | Unsafe grant conclusion and false evidence | Null unknowns, path-specific validation, explicit origin/completeness, no sentinels. |
| Duplicate lookup enumeration | Cross-tenant customer existence disclosure | Bounded exact matching only inside trusted organisation and authorised lead scope. |
| Repeated create submission | Accidental duplicate leads and events | Idempotency/equivalent request guard and transaction tests. |
| Cross-tenant lead or task ID tampering | Customer data disclosure or mutation | Trusted organisation context, scoped lookup, composite constraints, isolation tests, safe denial. |
| Cross-tenant assignee tampering | Work visibility leak or privilege confusion | Same-organisation membership validation and database consistency where feasible. |
| Document IDOR | Disclosure of uploaded or generated evidence | Source-specific access service, separate byte permission, no raw storage locator exposure. |
| Timeline overexposure | Audit metadata or internal details leak into product UI | Explicit allowlisted timeline mapping; never serialize raw audit metadata. |
| Note/task injection | Stored script or unsafe markup | Bounded validation, plain-text rendering, output escaping, CSP-compatible UI. |
| Stale task updates | Lost assignment or completion state | Optimistic concurrency and conflict UI. |
| Duplicate backfill | Multiple follow-up tasks | Deterministic migration identity/uniqueness and rerun tests. |
| Generated evidence mutation | Loss of trust and traceability | Consume immutable Release 1.4 records; never update file bytes or template version. |
| Excessive eager loading | Slow or failing lead pages | Bounded section queries, pagination, counts, indexes, and measured query plans. |
| Misleading merged status | Installer acts on the wrong document or event | Visible source/type labels and domain-specific status mapping. |

## Failure Modes

| Failure | User experience | Recovery |
| --- | --- | --- |
| Manual field validation fails | Entered data is preserved and field-specific guidance is shown | Correct the bounded field and retry. |
| Potential duplicate found | Advisory same-tenant warning with safe summary | Review authorised match or explicitly create anyway. |
| Repeated submission | Existing successful result is returned or repeat is safely rejected | Redirect to the one created workspace. |
| Lead not found or outside tenant | Safe not-found response | Return to tenant-scoped leads list; no existence disclosure. |
| Section query fails | Workspace shell remains usable where safe; section shows recoverable error | Retry section; record sanitized operational error. |
| Stale task mutation | Conflict message with current task state | Refresh or reapply intentional change. |
| Invalid assignee | Inline validation; no mutation | Select an active membership in the organisation. |
| Note validation fails | Preserve draft locally where practical; show bounded validation | Correct content and retry. |
| Generated document capability unavailable | Clearly label generated documents unavailable; uploaded evidence still works | Resolve Release 1.4 dependency; do not fabricate records. |
| File retrieval fails integrity/access checks | Generic unavailable/denied response | Follow ADR-0017 operational recovery and audit rules. |
| Timeline source record missing | Omit or show safe unavailable entry based on source contract | Investigate data integrity; do not synthesize facts. |

## Migration Requirements

1. Start from the re-approved authoritative Release 1.4-compatible baseline after PR #34 merges.
2. Accept ADR-0021 and add creation-origin, typed creator/optional assignment, and progressive unknown-field support additively to the existing `Lead`.
3. Backfill existing origin truthfully and idempotently; use an approved legacy/unknown value when evidence is ambiguous rather than guessing.
4. Preserve strict public-intake service validation even if shared persistence fields become nullable.
5. Add work-item schema and indexes additively in PR 3.
6. Seed no customer or fake task data.
7. Backfill open follow-up work items idempotently from the canonical existing lead follow-up fields, including manually captured follow-ups, with at most one task per eligible lead.
8. Preserve existing follow-up fields during the release for rollback compatibility.
9. Do not fabricate consent, qualification, eligibility, task completion, note, workflow, document, or audit history.
10. Do not migrate `LeadDocument` into the governed generated-document model or mutate generated evidence.
11. Verify fresh-database migration, approved-baseline upgrade, and rerun behaviour in disposable PostgreSQL.
12. Use guarded environment-specific database commands and record status-before/status-after evidence.

Rollback is application-first: old code can continue reading existing lead follow-up fields. Data written to additive work-item tables remains intact. Schema removal is not the normal rollback path after pilot data exists.

## Deployment Considerations

- CTO and CEO re-approval and PR #34 merge precede every implementation PR and migration.
- Implementation is delivered through small PRs in the sprint sequence below.
- Database-affecting PRs require Preview/test migration evidence before Production promotion.
- Production migration uses the existing database operations runbook, explicit environment classification, change reference, status before deploy, and clean status after deploy.
- No Release 1.5 task migration runs against Production until backup/PITR and recovery requirements relevant to pilot onboarding are satisfied.
- Canonical route redirects must be deployed before legacy route removal.
- Feature rollout may use a simple server-controlled flag only if operational rollback requires it; do not introduce a general flag platform.
- Pilot enablement starts with one provisioned organisation and test records owned by that organisation.
- Manual creation is enabled first for one pilot organisation only after privacy review, migration evidence, and public-intake/portal regression pass.
- Observability must report safe error categories, latency, query counts where practical, task conflicts, and document failures without personal data.

## Testing

Required automated coverage:

- unit tests for manual input/origin/completeness/duplicates, task lifecycle validation, note limits, timeline mapping/order, document discriminators, and workspace view-model rules;
- PostgreSQL integration tests for manual-lead migration/relations/idempotency, work-item constraints, follow-up backfill, optimistic concurrency, transaction rollback, and actor/audit linkage;
- permission tests for lead creation/read/update, assignment, task completion, note creation, document review, and generated-document download;
- tenant-isolation tests using valid foreign IDs from another organisation for every new query/mutation boundary;
- regression tests for existing public intake validation, consent/eligibility, portal upload/download, lead stage changes, application pack, jurisdiction routing, and truthful unknown/empty states;
- migration tests from the approved baseline and a fresh database;
- route/component tests for canonical redirects, section deep links, loading, empty, filtered-empty, validation, conflict, and error states;
- browser smoke coverage at desktop and 390 px for minimum manual creation, duplicate warning/continue, workspace redirect/navigation, note creation, task creation/completion, document review/download where available, and stage change;
- accessibility checks for landmarks, headings, keyboard operation, focus, names, status announcements, contrast, zoom, and touch targets;
- performance evidence for bounded initial workspace queries and paginated activity/document lists.

## Validation

Implementation PRs must record the exact commands and results. Minimum release-close validation:

- Node and pnpm versions match repository declarations;
- Prisma format, validate, and generate;
- migration SQL validation;
- fresh PostgreSQL migration and approved-baseline upgrade;
- unit and PostgreSQL integration tests;
- typecheck;
- lint;
- production build;
- browser smoke and responsive/accessibility evidence;
- documentation metadata, internal-link, COM navigation, and placeholder validation;
- `git diff --check`;
- manual diff review proving no unrelated architecture or behaviour change.

This documentation-only PR requires documentation validation and `git diff --check`; application build/test results are not claimed unless run.

## Sprint Breakdown

Detailed sequencing is in [Platform Release 1.5 Sprint Plan](../06-sprints/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md).

1. **Documentation amendment and re-approval:** six Proposed features, Accepted ADR-0020, Proposed ADR-0021, revised gates, migration strategy, and eight-PR sequence; CTO/CEO approval and PR #34 merge Pending.
2. **PR 1 - Workspace shell:** canonical lead-local routes, responsive shell, Overview, states, and redirects.
3. **PR 2 - Manual Lead Creation:** minimum authenticated capture, progressive data migration, trusted actor/tenant context, duplicate warning, audit/activity/workflow, and workspace redirect.
4. **PR 3 - Work-item schema/migration:** additive work items, permissions, follow-up backfill, and migration evidence.
5. **PR 4 - Work-item service/tasks:** protected lifecycle, concurrency, audit/activity, and Tasks UI.
6. **PR 5 - Installer Notes:** append-only attributed notes through the existing activity boundary.
7. **PR 6 - Source-aware timeline:** bounded source projection, including explicit manual/homeowner creation labels.
8. **PR 7 - Customer Document Centre:** only after the separate Release 1.4 implementation merges; compose uploaded evidence and authoritative governed documents without substitution.
9. **PR 8 - Pilot hardening:** complete journey, mobile/accessibility, performance, deployment rehearsal, support, and release documentation.

Each implementation PR must be independently reviewable and preserve a working main branch.

## Deliverables

Documentation phase deliverables:

- this Master Release Specification;
- six feature specifications;
- ADR-0020 for the task/work-item foundation;
- Proposed ADR-0021 for lead creation origin and progressive completeness;
- Release 1.5 sprint plan;
- updated release, feature, ADR, sprint, COM, and roadmap indexes;
- documentation-only PR #34 kept draft for CTO and CEO re-review.

Implementation deliverables after approval:

- canonical lead workspace and navigation;
- authenticated minimum manual lead creation using the existing Lead/workflow/activity/audit boundaries;
- Customer Document Centre;
- timeline projection;
- work-item schema, migration, service, permissions, audit, and UI;
- append-only installer-note service and UI;
- tests, browser evidence, migration evidence, validation record, support handoff, and release sign-off.

## Acceptance Criteria

### Documentation Re-Approval Record

- the previous CTO and CEO approval is recorded as superseded by the Manual Lead Creation scope amendment;
- the proposed sequence is recorded: after re-approval and PR #34 merge, PRs 1-6 may proceed in sequence, while PR 7 remains blocked by the separate Release 1.4 implementation sequence;
- this specification is Proposed; CTO and CEO re-approval is Pending;
- ADR-0020 is accepted;
- ADR-0021 remains Proposed until its approval questions are resolved;
- all six feature specifications and the sprint sequence remain Proposed;
- no implementation is authorised and no application implementation has started.

Future re-approval and merge of PR #34 may authorise Release 1.5 PRs 1-6 in the recorded sequence. They cannot authorise PR 7 before the separately governed Release 1.4 implementation sequence is completed, reviewed, and merged.

### Product Acceptance

- an authorised installer can open one canonical workspace for an organisation-owned lead;
- an authorised installer can create a lead with bounded customer name and at least one of phone or email, then continue directly in that workspace;
- optional address, Eircode, source, follow-up, note, and assignee obey their approved service and sequencing dependencies;
- a manual lead has explicit origin/creator attribution and is never presented as homeowner-qualified, eligible, grant-ready, or consented while required facts are unknown;
- duplicate warnings are advisory, bounded, tenant-local, and never reveal another organisation's record;
- the workspace makes customer identity, current stage, grant-readiness context, and next action clear within the first view;
- Overview, Documents, Activity, Tasks, and Notes remain lead-local, deep-linkable, responsive, and accessible;
- an installer can create, assign, due-date, complete, reopen, and cancel a lead task according to permissions;
- an installer can add an attributed append-only note and cannot silently rewrite history;
- the timeline shows material lead events in stable chronological order with truthful source labels;
- uploaded evidence and governed generated documents are visually and semantically distinct;
- generated evidence remains immutable and file-byte access remains separately authorised;
- empty organisations and leads show no invented tasks, activities, documents, or counts;
- the 390 px critical path works without horizontal-table interaction.

### Engineering Acceptance

- every new query and mutation is organisation-scoped and permission-protected server side;
- manual creation uses trusted organisation/Installer/actor context, path-specific validation, idempotency, and atomic lead/workflow/activity/audit writes;
- progressive persistence changes do not weaken public intake, consent, eligibility, jurisdiction, or portal validation;
- cross-tenant IDs and assignees are rejected without leakage or partial mutation;
- task/note mutations and required audit/activity records are atomic;
- stale task updates are detected and surfaced as conflicts;
- follow-up backfill is additive, deterministic, idempotent, and does not invent history;
- existing lead, workflow, portal, upload, document, audit, authentication, and jurisdiction behaviour remains compatible;
- required automated, migration, browser, accessibility, and validation checks pass and are recorded honestly;
- deployment runbook gates and recovery prerequisites are satisfied before Production migration;
- CTO review, CEO approval, merge, tag, roadmap update, and release sign-off are complete.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Release 1.4 runtime capability is absent from baseline | High (observed) | High | After re-approval allow PRs 1-6 in sequence; block PR 7 until the separately approved Release 1.4 implementation is completed, reviewed, and merged. | CTO |
| Current `Lead` cannot honestly store minimum manual enquiries | High (observed) | Critical | Accept ADR-0021 before PR 2; use explicit origin, null unknowns, path-specific validation, typed actor/assignment, and migration regression tests. | CTO and Engineering |
| Manual creation weakens public intake validation | Medium | Critical | Keep strict per-path service schemas and comprehensive intake/consent/jurisdiction/portal regression tests. | Engineering |
| Duplicate warning leaks another tenant | Low | Critical | Exact, bounded matching only within trusted organisation and authorised read scope; isolation tests. | Security and Engineering |
| Repeated submit creates duplicate records/events | Medium | High | Idempotency/equivalent guard and transaction tests. | Engineering |
| Workspace becomes a monolithic page | Medium | High | Sectioned routes/read models, bounded queries, pagination, performance acceptance. | Engineering |
| Timeline duplicates or contradicts audit/workflow facts | Medium | High | Read-only mapping, source identity, no new event store, domain-specific tests. | Platform Engineering |
| Tasks over-expand into project management | Medium | Medium | ADR-0020 minimum model and explicit non-goals. | Product and CTO |
| Existing follow-ups duplicate during migration | Medium | High | Deterministic idempotent backfill and rerun tests. | Engineering |
| Cross-tenant relation or assignee leak | Low | Critical | Trusted context, composite constraints, service checks, isolation tests. | Security and Engineering |
| Notes expose sensitive data through logs/audit | Medium | High | Keep bodies out of logs/audit metadata; bounded plain-text storage. | Engineering |
| Document centre blurs evidence semantics | Medium | High | Discriminated source types and separate actions/status labels. | Product and Engineering |
| Mobile UX remains secondary | Medium | High | 390 px acceptance gate and browser smoke journey. | Product and Design |
| Legacy routes break bookmarks | Medium | Medium | Canonical redirect plan and route regression tests. | Engineering |
| Scope delays pilot | Medium | High | Small PR sequence, strict deferrals, installer-observable outcomes. | Product |

## Known Deferrals

- quote drafts, revisions, approval, version history, and customer-ready quote generation;
- document revision chains beyond existing immutable generated-document records;
- comments, mentions, collaboration, shared assignments, and real-time updates;
- full task/project management and cross-lead work queues beyond the minimum pilot view;
- notification and communications foundation;
- installation scheduling, dispatch, and aftercare automation;
- customer document collaboration, e-signature, OCR expansion, and external sharing;
- retention/deletion automation and full records-management policy;
- broad analytics, forecasting, automation, AI assistance, and external integrations.

These are prepared for through stable resource identifiers, immutable evidence, task actor attribution, and source-aware timeline projections. They are not prebuilt abstractions in Release 1.5.

## Technical Debt

Release 1.5 must not worsen existing `TD-001`, `TD-005`, `TD-007`, `TD-009`, `TD-011`, `TD-013`, `TD-015`, or `TD-016`.

Implementation should add a technical-debt entry only for a real accepted compromise, such as temporary follow-up dual writes or legacy route compatibility. Missing deferred features are not technical debt.

The missing Release 1.4 implementation is a release dependency, not runtime debt created by this documentation branch. After re-approval it does not block Release 1.5 PRs 1-6, but it is a hard stop for PR 7.

## Future Releases

Release 1.5 prepares for:

- quote entity and immutable quote-revision history;
- document supersession/version views built on immutable generated records;
- task and note collaboration with explicit visibility rules;
- notification delivery from durable work-item or workflow events;
- installation project and aftercare workspaces;
- operational reporting from workflow, document, task, and activity facts;
- broader contractor-module workspace composition without SolarGRANT Pro concepts entering platform services.

## Recommended ADRs

Accepted for this release:

- [ADR-0020: Organisation-Owned Work Items And Lead Task Proving Slice](../05-decisions/ADR-0020-organisation-owned-work-items.md).

Proposed and required before Manual Lead Creation implementation:

- [ADR-0021: Lead Creation Origin And Progressive Completeness](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md).

Do not create separate ADRs for workspace navigation, document-centre aggregation, timeline projection, or installer notes unless implementation review discovers a conflict with ADR-0005, ADR-0008, ADR-0009, ADR-0013, ADR-0015, ADR-0016, or ADR-0017.

Future quote revisions, document supersession semantics, collaboration/visibility, notifications, or task automation require ADR review when their release is proposed; they are not decided here.

## CTO Review

| Field | Value |
| --- | --- |
| Status | Pending re-review |
| Reviewer | CTO |
| Date | Pending |
| Notes | Previous approval superseded by Manual Lead Creation scope, Proposed ADR-0021, and the revised eight-PR sequence. No implementation is authorised. PR 7 retains the Release 1.4 dependency. |

## CEO Approval

| Field | Value |
| --- | --- |
| Status | Pending re-approval |
| Approver | CEO |
| Date | Pending |
| Notes | Previous product approval superseded by the added Manual Lead Creation scope and revised sequence. Product re-approval is required. |

## Release Sign-Off

| Field | Value |
| --- | --- |
| Documentation PR | PR #34 - draft; CTO/CEO re-review pending |
| Prior approval | Superseded by Manual Lead Creation scope amendment on 2026-07-22 |
| CTO review | Pending re-review |
| CEO approval | Pending re-approval |
| Implementation authorisation | Pending; no implementation may begin |
| Implementation merge commit | Pending |
| Release tag | Pending |
| Roadmap update | Proposed amendment and PR 7 dependency recorded; release-close outcome pending |

## Related Documents

- [Release Lifecycle](../release-governance/RELEASE_LIFECYCLE.md)
- [CTO Review Checklist](../release-governance/CTO_REVIEW_CHECKLIST.md)
- [Platform Release 1.4 Master Specification](PLATFORM_RELEASE_1_4_MASTER_SPECIFICATION.md)
- [Platform Release 1.5 Sprint Plan](../06-sprints/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Design Principles](../02-design/DESIGN_PRINCIPLES.md)
- [Architecture Overview](../03-engineering/ARCHITECTURE_OVERVIEW.md)
- [Technical Debt Register](../03-engineering/TECHNICAL_DEBT_REGISTER.md)
- [Product UX Audit](../product/audits/SOLARGRANT_PRO_PRODUCT_UX_AUDIT_V1.md)
- [ADR-0013](../05-decisions/ADR-0013-workflow-history-model.md)
- [ADR-0015](../05-decisions/ADR-0015-document-domain-ownership-and-resource-linking.md)
- [ADR-0016](../05-decisions/ADR-0016-template-versioning-and-pdf-rendering.md)
- [ADR-0017](../05-decisions/ADR-0017-generated-file-storage-and-secure-retrieval.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
