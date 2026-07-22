# ADR-0021: Lead Creation Origin And Progressive Completeness

| Field | Value |
| --- | --- |
| Document ID | ADR-0021 |
| Status | Accepted |
| Owner | Clada Systems Product and Engineering |
| Review cycle | When lead intake, qualification, assignment, or consent semantics change |
| Last reviewed | 2026-07-22 |

## Context

Platform Release 1.5 adds authenticated manual lead creation with customer name and at least one of phone or email. The current SolarGRANT Pro `Lead` requires email, address, county, property ownership, dwelling type, build year, MPRN, works-started, consent, and other homeowner qualification values. Those requirements are valid for the public qualification intake but cannot honestly represent an early phone or referral enquiry.

Placeholder strings, guessed booleans, zero years, fabricated consent, or a parallel `ManualLead` record would damage data integrity and create divergent lead lifecycles. Creation origin, qualification completeness, creator attribution, assignment, permissions, duplicate detection, follow-up, notes, privacy, and historical migration therefore require one explicit decision before implementation PR 2.

## Decision

Retain one SolarGRANT Pro `Lead` aggregate and evolve it additively to support multiple creation paths and progressive completeness under the following accepted contracts.

### 1. Lead Creation Origin

Add an explicit constrained creation-origin enum with exactly these initial values:

- `HOMEOWNER_INTAKE`: leads created through the existing public homeowner qualification journey;
- `MANUAL_INSTALLER`: leads created by an authenticated installer;
- `LEGACY_UNKNOWN`: migration-only classification for genuinely ambiguous historical rows.

New application writes must never use `LEGACY_UNKNOWN`. Business acquisition source remains separate from technical creation origin. After migration, origin must not be inferred from `leadSource`, missing fields, customer data, or workflow stage.

### 2. Progressive Completeness

Use a derived qualification-completeness service contract, not a stored completion boolean or generic percentage score. The service evaluates whether the lead contains the validated facts required for a specific action.

A manually created lead begins incomplete. Unknown values are stored as null or absent and remain semantically distinct from false, declined, not applicable, consented, or completed. Qualification-dependent actions must call the service boundary and fail safely when required facts are missing.

Initial action gates are:

| Action | Minimum service decision |
| --- | --- |
| Grant-eligibility assessment | All facts required by the approved eligibility and jurisdiction rules are present and validated. No conclusion is calculated from unknown values. |
| Quote or system recommendation | Every customer/property/usage fact required by the selected approved recommendation path is present and validated. A contact-only lead cannot receive a factual recommendation. |
| Grant-readiness status | All facts and evidence required by the approved readiness definition are present; workflow stage alone is insufficient. |
| Homeowner-consent-dependent processing | The specific required homeowner consent was captured through an approved path and is attributable. Installer entry never fabricates or implies consent. |
| Generated grant or submission documents | Every input required by the governed document definition is verified and the separately governed Release 1.4 capability is available. Missing facts block generation. |

A manual lead must not be described as qualified, grant eligible, grant ready, consented, or homeowner submitted until the corresponding gate passes. Adding a new qualification-dependent action requires an explicit service rule and tests; it must not read nullable fields and improvise its own completeness logic.

### 3. Persistence Nullability And Consumer Inspection

The accepted principle is:

- customer name and at least one validated contact method are required for manual creation;
- qualification-only facts may be nullable at persistence level;
- homeowner intake validation remains at least as strict as the approved current contract;
- database nullability must not silently weaken public intake validation.

The final Prisma field list is an implementation finding, not an unresolved architecture decision. Before changing the schema, PR 2 must inspect the current `Lead` model and every affected reader and publish an explicit field-by-field migration table containing:

| Required column | Required classification |
| --- | --- |
| Current field and type | Exact baseline Prisma declaration. |
| All-lead requirement | Whether every lead must always contain the fact and why. |
| Manual persistence | Required, optional/nullable, or not accepted for manual capture. |
| Homeowner-intake contract | Whether the intake service must continue requiring and validating the field even if persistence is nullable. |
| Unknown presentation | Safe UI/report/export behaviour when absent. |
| Affected consumers | Every route, service, component, report, export, script, migration, and test that assumes presence. |
| Required change and regression evidence | Exact compatibility update and verification. |

PR 2 must inspect all repository consumers, including direct Prisma selection, eligibility and quote services, workspace/detail/dashboard views, portal and pack routes, reports/exports, notifications, AI adapters, tests, seeds, and operational scripts. Unknown must be handled explicitly. Placeholder values, empty sentinel strings, zero years, guessed booleans, and fabricated consent are forbidden.

### 4. Historical Migration

Backfill origin as follows:

- use `HOMEOWNER_INTAKE` only where authoritative repository evidence proves creation by the existing public intake path;
- use `MANUAL_INSTALLER` only where authoritative actor or creation evidence proves authenticated installer creation;
- use `LEGACY_UNKNOWN` for genuinely ambiguous historical rows;
- never guess from customer fields, `leadSource`, missing values, or current workflow stage.

The migration must be safe on a fresh database, safe from the approved production baseline, and idempotent on rerun. Validation records aggregate counts by origin and proves that no customer, qualification, or consent fact was altered. Validation output must not print customer data.

### 5. Creator And Assignee Attribution

Manual lead creator attribution uses trusted server-derived user and organisation-membership context. Public intake continues using its existing public/system actor model and must not create a fake membership.

Optional assignee references an active membership in the same organisation. Client-supplied organisation, Installer, creator, actor, user, or membership identifiers are never authoritative. Existing free-text assignee fields may remain temporarily for backwards compatibility but are not authoritative for new assignments. PR 2 must document their read/dual-read or migration treatment, every remaining consumer, the condition for retirement, and the separately reviewed cleanup that will remove them.

### 6. Permissions

- `lead.create` is required to create a manual lead.
- `lead.assign` is additionally required when selecting or changing an assignee.
- `lead.read` is required before duplicate candidates may be shown.
- Existing broader permissions must not be silently reused unless the permission catalogue review demonstrates intentional least-privilege equivalence.
- Server-side service authorisation is authoritative; hiding a button is not authorisation.
- A denied request creates no partial lead, workflow, note, task, activity, or audit-success record.

### 7. Duplicate Detection

The initial warning model matches exact normalised email, exact normalised phone, and exact normalised Eircode when supplied. It searches only the trusted organisation and returns only records the actor may already read. Cross-tenant existence is never disclosed.

Warnings are advisory. The installer may choose `Review match` or `Create anyway`. Release 1.5 has no fuzzy name/address matching, automatic merging, or global duplicate search. Duplicate checks tolerate races; submission idempotency separately protects against accidental double creation.

### 8. Follow-Up Compatibility With ADR-0020

PR 2 may capture the optional initial follow-up in the current compatible lead follow-up field when the `WorkItem` schema is not yet available. PR 3 and PR 4 must define and test the migration or projection into the Accepted ADR-0020 `WorkItem` model. One manual follow-up produces no more than one open task.

No temporary parallel task system is permitted. After `WorkItem` becomes authoritative, new task operations use the approved work-item service boundary.

### 9. Initial Internal Note

An optional note entered during manual lead creation is an internal installer note. Store it using the existing append-only product activity/note contract with actor attribution. It is never customer-visible and must not become new canonical history in mutable `Lead.internalNotes`.

Where the feature contract requires lead, workflow, note/activity, and audit evidence, they commit atomically. Audit metadata excludes the note body.

### 10. Privacy And Lawful-Basis Gate

This ADR is not legal advice. Production rollout is blocked until Clada Systems records approval of:

- installer-facing collection wording;
- purpose limitation;
- lawful-basis position for manually entered contact details;
- retention and deletion treatment;
- rules for follow-up contact;
- access and correction handling;
- treatment of notes containing unnecessary sensitive information;
- pilot onboarding guidance instructing installers not to enter excessive or special-category personal data.

Product safeguards collect only information necessary for the enquiry, exclude contact details/note content/duplicate candidates from logs, never infer homeowner consent, and clearly distinguish installer-entered data from homeowner-submitted data. Production enablement must fail closed until the privacy gate is recorded complete.

## Required Invariants

1. Every lead belongs to one trusted organisation and Installer.
2. Client-supplied tenant, creator, actor, or membership context is never authoritative.
3. Every lead has one explicit truthful origin after migration; new writes never use `LEGACY_UNKNOWN`.
4. Business acquisition source and creation origin are independent.
5. Unknown is distinct from every negative, affirmative, completed, consented, or not-applicable state.
6. Qualification-dependent actions use the derived service contract.
7. Public homeowner intake validation remains at least as strict as the pre-migration contract.
8. An assignee is an active membership in the lead's organisation.
9. Required lead, workflow, activity/note, and audit writes are atomic.
10. Audit and logs exclude customer contact details, note bodies, and duplicate candidates.
11. Follow-up migration creates at most one open work item per qualifying manual follow-up.
12. Production rollout requires a completed recorded privacy gate.

## Implementation Stop Conditions

PR 2 must stop and return to CTO review if:

- the existing schema cannot be evolved additively without unsafe data loss;
- any current consumer cannot safely handle nullable qualification fields;
- public homeowner intake validation would be weakened;
- historical creation origin cannot be determined truthfully under the approved rules;
- cross-tenant duplicate information could leak;
- atomic creation of the required lead, workflow, activity/note, and audit evidence cannot be guaranteed;
- the permission model requires an unreviewed broadening of access;
- the pre-production privacy gate is incomplete when Production enablement is proposed.

## Rationale

- One progressively complete lead avoids a second aggregate and supports one workspace across the customer lifecycle.
- Explicit origin produces truthful UI, audit, migration, and reporting semantics without overloading business lead source.
- A derived action-specific contract avoids a misleading stored boolean or speculative completeness percentage.
- Null unknowns preserve meaning and prevent fabricated evidence.
- Strict service validation protects public intake when shared persistence becomes more permissive.
- Typed creator and assignee relations reuse accepted identity and organisation foundations.
- Bounded tenant-local duplicate warnings improve productivity without weakening isolation.
- Atomic operational and audit writes preserve trustworthy evidence.

## Consequences

Several currently required `Lead` fields may become nullable, so PR 2 must identify and update every affected consumer. Public intake correctness depends on explicit path validation and regression tests. Historical backfill may truthfully retain `LEGACY_UNKNOWN`. Typed assignment may require a compatibility period with legacy strings. Privacy approval is a hard Production gate rather than an assumed implementation detail.

These costs are accepted because fabricated facts, a parallel lead aggregate, cross-tenant matching, or weakened intake validation would be materially less safe.

## Alternatives Rejected

- Requiring the full homeowner form for staff entry encourages invented answers.
- A separate `ManualLead` or enquiry aggregate creates promotion, merge, tenant, audit, and lifecycle duplication.
- Sentinel strings, zero values, guessed booleans, and fabricated consent corrupt domain meaning.
- Inferring origin from source, missingness, customer data, or workflow stage is not durable evidence.
- A stored completeness boolean or generic percentage cannot express action-specific requirements safely.
- Making every field optional without path-specific validation weakens public intake.
- Global/fuzzy duplicate matching creates unnecessary privacy, tenancy, and false-positive risk.

## Follow-Up

- Implement only through Release 1.5 PR 2 after PR 1 merges.
- PR 2 must publish the field-by-field migration/consumer table, permission catalogue change, assignee compatibility/retirement plan, migration evidence, and action-gate tests.
- Add fresh/production-baseline/rerun migration tests and public-intake, portal, eligibility, quote, document, export, and reporting regressions.
- PR 3 and PR 4 must complete the ADR-0020 follow-up migration/projection without duplicate open tasks.
- Record the privacy gate before Production enablement.
- Update permission, data-model, privacy, product-current-state, audit, and operating documentation with the implementation PRs.

## Related Documents

- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Platform Release 1.5 Sprint Plan](../06-sprints/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [ADR-0005: Tenant-Aware Data Access](ADR-0005-tenant-aware-data-access.md)
- [ADR-0008: Authorisation Enforcement Boundary](ADR-0008-authorisation-enforcement-boundary.md)
- [ADR-0009: Actor-Aware Audit Model](ADR-0009-actor-aware-audit-model.md)
- [ADR-0014: Product Workflow Consumption Boundary](ADR-0014-product-workflow-consumption-boundary.md)
- [ADR-0020: Organisation-Owned Work Items](ADR-0020-organisation-owned-work-items.md)
