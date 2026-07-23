# Platform Release 1.5 - Manual Lead Creation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-MANUAL-LEAD-CREATION |
| Status | Approved |
| Owner | SolarGRANT Pro Product and Engineering |
| Review cycle | Platform Release 1.5 and pilot feedback |
| Last reviewed | 2026-07-22 |

## Summary

Allow an authenticated installer to create a tenant-owned lead from a short `New Lead` flow and continue directly in the canonical Lead Workspace. Manual creation extends the existing SolarGRANT Pro `Lead`; it does not create another intake engine, platform aggregate, or CRM abstraction.

## Implementation Status

Implemented on the dedicated PR 2 branch for draft review: canonical route `/installer-review-emerald/leads/new`, protected service, exact bounded duplicate warning, request-token/input-hash idempotency, atomic lead/workflow/activity/note/audit writes, explicit origin and progressive unknown persistence, membership-backed attribution/assignment, qualification action gates, consumer compatibility, tests, and migration evidence. This document remains Approved rather than Complete until review and merge. Production enablement remains blocked by the unrecorded privacy gate.

The complete pre-schema field/consumer decision record is [Platform Release 1.5 PR 2 Lead Field And Consumer Migration](../03-engineering/PLATFORM_RELEASE_1_5_PR2_LEAD_FIELD_CONSUMER_MIGRATION.md).

## Problem

Phone, referral, event, and walk-in enquiries cannot currently be captured without completing the homeowner qualification form. Installers must keep incomplete enquiries elsewhere or enter invented qualification facts. The current `Lead` schema also requires email, property, MPRN, eligibility, and consent fields that are not known during minimum manual capture.

## Evidence

- Product UX audit finding PUX-021 identifies the absence of manual lead creation and resulting duplicate entry.
- The authenticated installer experience already has trusted user, membership, organisation, Installer, permission, audit, workflow, activity, and tenant-scoped lead boundaries.
- Public intake already creates a `Lead`, `WorkflowInstance`, `LEAD_CREATED` activity, and audit evidence but assumes a completed homeowner qualification journey.
- Accepted [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md) resolves the conflict between minimum manual capture and the current required-data contract.

## Product Scope

In scope:

- an accessible, responsive `New Lead` action in the authenticated installer experience;
- required customer name and at least one of phone or email;
- optional address, Eircode, restrained lead source, initial internal note, follow-up date, and active same-organisation assignee;
- server-derived organisation, Installer, creator user, and creator membership context;
- explicit `MANUAL_INSTALLER` creation classification separate from the optional business lead source;
- creation of the existing lead workflow instance, product activity, and audit evidence in one transaction;
- redirect to the new lead's canonical workspace after success;
- bounded, tenant-local duplicate warnings that never block an authorised installer from continuing;
- truthful incomplete/qualification-required presentation in the workspace.

Out of scope:

- homeowner qualification, eligibility determination, grant-readiness claims, quote calculation, or automatic portal invitation during manual creation;
- a new intake engine, new lead aggregate, bulk import, record merging, enrichment, CRM synchronisation, AI-assisted creation, messaging, configurable field schemas, or custom lead-source taxonomies;
- cross-tenant or global duplicate search;
- synthetic values for unknown property, grant, consent, or contact facts.

## Platform Classification

SolarGRANT Pro product feature using the existing Clada OS authentication, organisation, membership, permission, audit, workflow, and activity foundations. The accepted minimum data-contract evolution is governed by ADR-0021; no new reusable platform capability is introduced.

## User Workflow

1. An authenticated installer selects `New Lead` from a stable, keyboard-accessible action.
2. The form requires a customer name and at least one of phone or email.
3. The installer may add address, Eircode, source, initial internal note, follow-up date, and an active same-organisation assignee.
4. The server normalises and validates input, resolves trusted actor/tenant context, and checks only bounded same-organisation duplicate signals.
5. If potential matches exist, the UI gives a non-blocking warning with only records the actor may already read; the installer may open a match or continue.
6. On confirmation, the service atomically creates the source-classified lead, workflow instance, creation activity, safe audit event, and approved optional related records.
7. The installer is redirected to the canonical workspace, which clearly shows that qualification information is incomplete.

## Field Contract

| Field | Requirement | Rule |
| --- | --- | --- |
| Customer name | Required | Trimmed, bounded plain text; must not be a placeholder. |
| Phone / email | At least one required | Normalised and validated independently; phone-only and email-only are valid. |
| Address / Eircode | Optional | Store only supplied facts; do not infer county, jurisdiction, or eligibility. |
| Lead source | Optional | Restrained product vocabulary plus safe compatibility handling; separate from creation origin. |
| Initial note | Optional | Creates an internal append-only `LeadActivity` note with actor attribution and safe audit evidence in the manual-create transaction; never customer-visible or written as new canonical `Lead.internalNotes` content. |
| Follow-up | Optional | Uses canonical compatibility field `Lead.nextFollowUpAt` in PR 2 and is migrated/projected through the approved work-item sequence without duplicate tasks. |
| Assignee | Optional | Must be an active membership in the trusted organisation; client-supplied organisation ownership is ignored. |

## UX Requirements

- The shortest valid flow contains name, one contact method, and submit.
- Optional fields are visibly optional and use progressive disclosure where that improves mobile scanning.
- Validation identifies the field and recovery action without discarding entered data.
- Duplicate warnings are advisory, explain the matching signal in safe terms, and provide `Review match` and `Create anyway` choices.
- Submitting has explicit pending state and prevents accidental repeat creation through idempotency or equivalent request protection.
- Success goes directly to the canonical workspace; it does not strand the installer on a confirmation page.
- At 390 px and 200% zoom, the form has no horizontal scrolling and supports keyboard, visible focus, semantic labels, error association, status announcements, and minimum touch targets.
- The workspace never labels an incomplete manual lead as qualified, eligible, consented, or homeowner-submitted.

## Architecture Notes

- Extend the existing `Lead`; do not create a parallel manual-lead table or intake aggregate.
- Implement a protected service boundary using trusted authentication and organisation context. UI hiding is not authorisation.
- PR 2 must follow Accepted ADR-0021 because current non-null qualification fields cannot represent the approved minimum honestly.
- Use the accepted creation-origin enum: `HOMEOWNER_INTAKE`, `MANUAL_INSTALLER`, and migration-only `LEGACY_UNKNOWN`. New application writes must never use `LEGACY_UNKNOWN`.
- Use typed creator attribution. Do not infer origin from nullable fields, free-text `leadSource`, customer data, or workflow stage.
- Keep business acquisition source separate from technical creation origin.
- Create the existing lead workflow at `NEW_LEAD`; manual creation does not bypass workflow ownership or invent transition history.
- Reuse `LEAD_CREATED` with safe source metadata and typed actor fields. Audit metadata may contain identifiers and classification, not customer name, contact details, note content, or duplicate candidates.
- Optional initial note must use the existing append-only `LeadActivity` and audit contract inside the manual-create transaction. PR 5 may consolidate the shared protected note service, but PR 2 must not write `Lead.internalNotes` as new canonical note history or defer the approved optional field.
- Optional follow-up captured before the work-item migration remains compatible with ADR-0020. Backfill/dual-write rules must guarantee at most one resulting open follow-up task.
- Optional assignee uses `OrganisationMembership`, not legacy free-text assignee fields.

## Qualification-Completeness Gates

Use ADR-0021's derived, action-specific service contract. Do not store a generic completion boolean or percentage.

- Grant-eligibility assessment requires every validated fact used by the approved eligibility and jurisdiction rules.
- Quote or system recommendation requires the validated property/customer/usage facts needed by that approved recommendation path.
- Grant-readiness status requires its approved facts and evidence; workflow stage alone is insufficient.
- Homeowner-consent-dependent processing requires attributable consent captured through an approved homeowner path.
- Generated grant or submission documents require verified inputs and the authoritative Release 1.4 generated-document capability.

Unknown values remain null/absent and are never treated as false, declined, not applicable, consented, or completed. A manual lead is never described as homeowner-submitted, qualified, eligible, grant-ready, or consented until the corresponding service gate passes.

## Duplicate Warning Contract

- Search only within the trusted organisation and only among leads the actor may read.
- Initial matching is bounded to exact normalised email, exact normalised phone, and exact normalised Eircode when supplied; do not add fuzzy name/address matching in Release 1.5.
- Return a bounded count and safe summaries already permitted by `lead.read`; never reveal that a cross-tenant record exists.
- A warning is not a merge, uniqueness constraint, or denial. The installer may continue with an explicit confirmation.
- The duplicate check and create operation must tolerate races; idempotency protects repeated submissions, while two legitimate same-contact leads may coexist.
- Manual request-token uniqueness is scoped to `(organisationId, manualCreationRequestId)`. The server-issued token is not an authentication credential, replay lookup is always organisation-scoped, and the same opaque token may be used independently by different organisations without cross-tenant lookup or replay.

## Security, Privacy, Multi-Tenant, And Audit

- Require an approved `lead.create` permission. Optional assignment additionally requires existing `lead.assign`; duplicate summaries additionally require `lead.read`. Reusing `lead.update` for creation is not assumed.
- Resolve organisation, Installer, user, membership, actor type, and creator attribution server side.
- Validate assignee and duplicate candidates against the same organisation and active membership rules.
- Do not log customer fields, note content, or duplicate candidate data.
- Record a successful `lead.created` audit event with safe resource, actor, organisation, origin, and outcome fields; failed validation or denial must not create success evidence.
- Manual creation records only supplied facts and does not assert homeowner consent, eligibility, property ownership, or a final legal conclusion.
- Production rollout is blocked until Clada Systems records approval of installer collection wording, purpose limitation, lawful-basis position, retention/deletion, follow-up contact, access/correction handling, sensitive-note treatment, and pilot guidance against excessive or special-category data.
- Clearly distinguish installer-entered facts from homeowner-submitted facts and collect only what is necessary for the enquiry.

### Privacy Enablement Control

Manual Lead Creation is fail-closed behind the platform-owned `MANUAL_LEAD_CREATION_ENABLED` configuration read only by `lib/manual-lead-privacy.ts`. The only enabling value is the exact lower-case string `true`; missing, `false`, differently cased, whitespace-padded, loose truthy, or arbitrary values remain closed. Missing or unsupported `APP_ENV` classification also remains closed.

The same explicit enablement rule applies to Production, Preview, Development, and test. Production and Preview default to unavailable because either may contain real customer data. Development and test may enable the feature only through the same explicit value; database safety controls separately prove that integration tests use a disposable target. The list/workspace actions, canonical page, server action, duplicate lookup, and protected `createManualLead` service all enforce or reflect the gate. The service boundary is authoritative and denies before replay lookup or writes with `MANUAL_LEAD_PRIVACY_GATE_CLOSED` and a configuration-neutral user message.

Enabling the flag is an operational release decision, not a consequence of successful tests. Production or Preview enablement requires Project Shield review plus the relevant Clada company/privacy owner’s recorded approval of the outstanding privacy decisions. Rollback sets the value to anything other than exact `true` or removes it; UI entry points disappear, the page shows a controlled unavailable state, and direct submissions fail without lead, workflow, activity, note, or audit-success writes. This control does not claim legal advice, GDPR compliance, certification, or privacy approval.

## Data Model And Migration Impact

- Additive migration represents accepted origin, typed creator, membership-backed optional assignment, and progressive unknown values on the existing `Lead`.
- Qualification-only fields that are unavailable at manual capture must support an honest unknown state according to accepted ADR-0021; placeholder strings, zero values, guessed booleans, and fabricated consent are forbidden.
- PR 2 must inspect the current Prisma `Lead` model and every route, service, component, report, export, script, migration, seed, and test that assumes a field is present. It must publish an explicit field-by-field table covering current type, all-lead requirement, manual nullability, homeowner-intake requirement, safe unknown presentation, affected consumers, required changes, and regression evidence.
- Backfill `HOMEOWNER_INTAKE` or `MANUAL_INSTALLER` only from authoritative creation/actor evidence; use `LEGACY_UNKNOWN` for genuinely ambiguous rows. Never infer origin from customer fields, `leadSource`, missingness, or stage.
- Migration validation includes aggregate counts by origin and proves no customer, qualification, or consent fact changed without printing customer data.
- Existing intake and portal routes remain backwards compatible and preserve their validation, jurisdiction, consent, workflow, document, notification, and token semantics.
- Migration must be safe on a fresh database and from the approved baseline, idempotent where data backfill is involved, and reversible at the application layer.

## Risks

- Relaxed database fields accidentally weaken homeowner intake validation.
- Unknown facts are mistaken for negative answers or approved eligibility.
- Duplicate warning leaks cross-tenant customer existence.
- Optional assignee links to another organisation or inactive membership.
- Double submission creates two leads.
- Initial note or contact data leaks into logs/audit.
- Manual creation grows into a second CRM/intake engine.

Mitigate through path-specific service validation, explicit origin/completeness, tenant-local matching, membership constraints, idempotency, safe audit metadata, strict non-goals, and regression coverage for public intake and portal flows.

## Acceptance Criteria

- An authorised installer can create a lead with name plus phone, name plus email, or name plus both.
- Name-only, invalid contact, unbounded, and malformed requests fail safely with no partial writes.
- Organisation, Installer, creator, and actor attribution come only from trusted server context.
- Optional assignee is active and belongs to the same organisation.
- The lead is explicitly classified as manually created and is not presented as homeowner-qualified, eligible, or consented.
- One transaction creates the lead, workflow instance, required activity, and audit evidence; a failed transaction leaves none of them partially committed.
- A successful create redirects to the organisation-owned canonical workspace.
- Duplicate warnings use only bounded same-tenant signals and reveal no cross-tenant existence.
- Repeated submission is idempotent or otherwise protected from accidental duplicate creation.
- The same request token is unique only inside one organisation; same-tenant exact replay returns the original, changed-payload reuse conflicts, concurrent replay creates one lead, and cross-tenant token reuse remains independent.
- Existing homeowner intake and portal behaviours pass regression tests unchanged.
- Qualification-dependent actions call the derived service contract and fail safely when required facts are unknown.
- PR 2 includes the complete field/consumer migration table and an assignee compatibility/retirement plan.
- Historical origin migration is evidence-based, idempotent, and leaves customer/consent facts unchanged.
- Production enablement is technically blocked by default and remains operationally blocked until Project Shield and the relevant company/privacy owner record approval and explicitly enable the gate.
- No new intake engine, bulk import, merge, enrichment, CRM sync, AI creation, messaging, configurable schema, or custom source taxonomy is introduced.
- Desktop, 390 px, keyboard, focus, error association, zoom, status announcement, and touch-target checks pass.

## Verification Plan

- unit tests for field normalisation, contact alternatives, bounds, source classification, safe audit metadata, duplicate signals, and error mapping;
- PostgreSQL tests for fresh and approved-production-baseline migration, evidence-based origin backfill, rerun idempotency, progressive unknown fields, typed creator/assignee relations, unchanged customer/consent facts, and transaction rollback;
- integration tests for permission, trusted context, cross-tenant IDs, inactive memberships, duplicate non-disclosure, workflow/activity/audit atomicity, and repeated submissions;
- regression tests for public intake, jurisdiction routing, homeowner consent/eligibility handling, portal token flows, notifications, and existing lead reads;
- browser tests for the shortest path, optional fields, warning/continue flow, redirect, recovery states, 390 px, keyboard, focus, zoom, and screen-reader naming;
- manual diff review proving no runtime implementation is included in documentation PR #34.

## Rollout Plan

Release through PR 2 after the canonical shell, initially for one provisioned pilot organisation. Verify same-tenant creation, incomplete-state presentation, action gates, audit evidence, duplicate warning safety, migration evidence, and existing intake regression before wider pilot enablement. Do not enable Production until the privacy gate is recorded complete.

## Implementation Stop Conditions

Stop PR 2 and return to CTO review if the schema cannot evolve additively without unsafe data loss; any consumer cannot safely handle nullable qualification facts; public intake validation would weaken; origin cannot be determined truthfully; duplicate matching could leak across tenants; required atomic writes cannot be guaranteed; permissions require unreviewed broadening; or privacy review is incomplete when Production enablement is proposed.

## Dependencies

- PR 1 canonical Lead Workspace shell and route;
- accepted ADR-0021 and approved migration/data contract;
- existing authentication, organisation, membership, permission, workflow, activity, and audit foundations;
- ADR-0020 compatibility for follow-up/task migration;
- existing `LeadActivity`/audit note contract, followed by PR 5 consolidation into the canonical protected note service without data migration or duplication.

## Documentation Updates

- Release 1.5 Master Specification and sprint plan;
- feature, ADR, release, sprint, COM, roadmap, and product-current-state indexes;
- permission catalogue and data-model documentation with the implementation PR;
- privacy/pilot onboarding guidance before Production enablement.
