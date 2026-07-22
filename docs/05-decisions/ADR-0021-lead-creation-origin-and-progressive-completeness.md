# ADR-0021: Lead Creation Origin And Progressive Completeness

| Field | Value |
| --- | --- |
| Document ID | ADR-0021 |
| Status | Proposed |
| Owner | Clada Systems Product and Engineering |
| Review cycle | When lead intake, qualification, assignment, or consent semantics change |
| Last reviewed | 2026-07-22 |

## Context

Platform Release 1.5 proposes authenticated manual lead creation with only customer name and at least one of phone or email. The current SolarGRANT Pro `Lead` requires email, address, county, property ownership, dwelling type, build year, MPRN, works-started, consent, and other homeowner qualification values. Those requirements are valid for the public qualification intake but cannot honestly represent an early phone or referral enquiry.

Using placeholder strings, guessed booleans, zero years, fabricated consent, or a parallel `ManualLead` record would damage data integrity and create divergent lead lifecycles. Creation origin, business acquisition source, qualification completeness, creator attribution, and assignment also need unambiguous tenant-safe semantics.

This is a material data integrity, privacy, tenant, lifecycle, and backwards-compatibility decision. It requires an ADR before implementation PR 2.

## Proposed Decision

Retain one SolarGRANT Pro `Lead` aggregate and evolve it additively to support multiple creation paths and progressive completeness.

1. Add an explicit constrained creation-origin field. New writes initially support `HOMEOWNER_INTAKE` and `MANUAL_INSTALLER`; a migration-only `LEGACY_UNKNOWN` value may be approved for genuinely ambiguous historical rows. Future write values require reviewed migration and product semantics.
2. Keep optional business acquisition source separate from technical creation origin. Existing `Lead.leadSource` may remain the compatibility field with a restrained Release 1.5 product vocabulary; it does not determine origin.
3. Add typed nullable creator membership/user attribution for authenticated creation. Public intake remains represented through its existing public/system actor contract rather than a fabricated membership.
4. Represent unknown qualification facts as null/absent, never as sentinel strings, zeroes, guessed booleans, or asserted consent.
5. Preserve strict path-specific validation: public homeowner intake continues to require its complete approved qualification/consent contract; manual creation requires name plus at least one validated contact method and validates each supplied optional fact.
6. Expose an explicit qualification-completeness signal or equivalent derived service contract. A manual lead with missing qualification facts remains `NEW_LEAD` and cannot be treated as grant-qualified, grant-ready, consented, or eligible until the relevant workflow collects and validates those facts.
7. Add optional membership-backed assignment on `Lead` in PR 2. The assignee must be active and belong to the same organisation. Legacy free-text assignee fields are not authoritative for new assignments.
8. Create manual leads through one protected transaction that also creates the existing workflow instance, `LEAD_CREATED` product activity, and actor-aware audit evidence.
9. Backfill existing leads with the most truthful origin determinable from authoritative creation evidence. Ambiguous historical rows use an explicit legacy/unknown migration treatment approved during ADR review; they are not guessed from customer fields alone.
10. Keep existing public intake and portal behaviour backwards compatible. Nullable database representation must not relax public-route service validation.

## Required Invariants

1. Every lead belongs to one trusted organisation and Installer.
2. Client-supplied organisation, Installer, creator, or actor values are never authoritative.
3. Every lead has an explicit truthful creation origin after migration.
4. Business lead source and creation origin are independent concepts.
5. Unknown is distinct from false, declined, not applicable, and completed.
6. A manual lead cannot inherit or imply homeowner consent, qualification, eligibility, quote, or grant-readiness conclusions.
7. Public intake validation remains at least as strict as the approved pre-migration contract.
8. An enabled assignee is an active membership in the lead's organisation.
9. Lead, workflow, activity, and audit creation is atomic.
10. Audit and logs exclude customer contact details, note content, and duplicate candidates.

## Rationale

- One progressively complete lead avoids a second aggregate and allows the canonical workspace to cover the whole customer journey.
- Explicit origin supports truthful UI, audit, analytics, migration, and path-specific validation without overloading free-text lead source.
- Null unknowns preserve meaning and prevent fabricated evidence.
- Service-level validation protects the public intake even when the shared persistence model becomes more permissive.
- Typed creator and assignee relations reuse accepted identity and organisation foundations.
- Atomic workflow/activity/audit creation preserves existing operational and compliance evidence.

## Consequences

Positive:

- installers can capture minimum enquiries without inventing grant facts;
- existing intake, workspace, workflow, activity, and audit architecture remains authoritative;
- later qualification can progressively complete the same record;
- origin and creator become queryable, auditable, and testable;
- manual and homeowner-created leads can share downstream workflows without semantic ambiguity.

Costs and risks:

- several currently required `Lead` fields may become nullable, so every consumer must handle unknown explicitly;
- migration must classify historical rows carefully;
- public intake correctness moves partly from database nullability to path-specific validation and regression tests;
- consent/lawful-basis language and retention for installer-entered contact data require privacy review;
- typed assignment may add a relation and compatibility period with legacy string assignees.

## Alternatives Considered

### Require The Full Homeowner Form For Manual Entry

Rejected because installers would still need unavailable customer/property facts and would be encouraged to invent answers.

### Create A Separate ManualLead Or Enquiry Aggregate

Rejected because Release 1.5 needs one workspace from first enquiry onward. Promotion/merge semantics would duplicate tenant, audit, workflow, document, and collaboration rules.

### Populate Required Fields With Sentinels

Rejected because empty strings, `UNKNOWN` strings, false booleans, zero years, or fabricated consent corrupt domain meaning and can produce unsafe eligibility or reporting conclusions.

### Infer Origin From Lead Source Or Missing Fields

Rejected because acquisition source is a business fact, missingness changes over time, and inference cannot provide durable audit semantics.

### Make Every Field Optional Without Path-Specific Validation

Rejected because it would silently weaken the public homeowner intake and grant-routing contract.

## Approval Questions

CTO and product review must confirm before acceptance:

1. the final creation-origin enum, including the migration treatment for genuinely ambiguous historical records;
2. whether qualification completeness is stored or derived and the exact rule that blocks qualification-dependent actions;
3. the set of `Lead` fields that become nullable and the compatibility plan for all current readers;
4. the membership relation and compatibility treatment for existing free-text assignee fields;
5. the new `lead.create` permission mapping and composition with existing `lead.assign` for optional assignment;
6. privacy-approved consent/lawful-basis copy, retention, and follow-up rules for manually entered contact data.

## Follow-Up

- Keep this ADR Proposed until the approval questions and migration shape are reviewed.
- Update the Manual Lead Creation feature and Master Specification with accepted field names and invariants.
- Implement only in Release 1.5 PR 2 after documentation approval and PR 1 merge.
- Add fresh/upgrade/rerun migration tests and public-intake/portal regression tests.
- Update permission, data-model, privacy, product-current-state, and audit documentation in the implementation PR.

## Related Documents

- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Platform Release 1.5 Sprint Plan](../06-sprints/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [ADR-0005: Tenant-Aware Data Access](ADR-0005-tenant-aware-data-access.md)
- [ADR-0008: Authorisation Enforcement Boundary](ADR-0008-authorisation-enforcement-boundary.md)
- [ADR-0009: Actor-Aware Audit Model](ADR-0009-actor-aware-audit-model.md)
- [ADR-0014: Product Workflow Consumption Boundary](ADR-0014-product-workflow-consumption-boundary.md)
- [ADR-0020: Organisation-Owned Work Items](ADR-0020-organisation-owned-work-items.md)
