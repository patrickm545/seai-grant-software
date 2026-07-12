# CTO Review Checklist

| Field | Value |
| --- | --- |
| Document ID | GOV-CTO-REVIEW-001 |
| Status | Active |
| Owner | Clada Systems CTO |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-12 |

Use this checklist before every Clada OS platform release is approved for merge.

The CTO may approve, request changes, narrow scope, require additional ADRs, require additional tests, or return the release to architecture.

## Architecture

1. Is the release architecture documented in the Master Release Specification?
2. Does the architecture preserve the Constitution and The Clada Way?
3. Does the design follow the platform dependency direction?
4. Are all material decisions captured in ADRs?
5. Are assumptions explicit and testable?

## Reusability

1. Is the capability reusable across plausible future Clada products?
2. Is reuse justified by real platform need rather than speculative abstraction?
3. Is the SolarGRANT Pro proving slice narrow enough to avoid product-specific platform design?
4. Are maturity claims supported by evidence?

## Platform Boundaries

1. Does Clada OS own only product-neutral mechanics?
2. Are platform services free of SolarGRANT Pro domain language unless it is explicitly product context?
3. Are provider, product, and infrastructure details behind documented boundaries?
4. Are forbidden dependencies absent from implementation?

## Product Boundaries

1. Does SolarGRANT Pro own product-specific fields, labels, mappings, workflows, and rules?
2. Are product projections explicit and transactional where required?
3. Can future products consume the platform capability without inheriting SolarGRANT Pro concepts?

## Permissions

1. Are all protected operations tied to existing platform permissions?
2. Are permission keys documented?
3. Are permission checks enforced server-side?
4. Are denied operations tested?
5. Is there no parallel authorisation system?

## Audit

1. Are material lifecycle events audited?
2. Are audit records actor-aware and organisation-aware?
3. Are sensitive values excluded from audit metadata?
4. Are audit links or resource identifiers sufficient for traceability?
5. Are denied and failed outcomes handled intentionally?

## Organisation Isolation

1. Are all organisation-owned reads scoped by organisation?
2. Are all organisation-owned writes scoped by organisation?
3. Do tests prove cross-organisation denial?
4. Do database constraints reinforce organisation consistency where practical?
5. Are internal administrative exceptions explicit?

## Database Integrity

1. Are important invariants enforced by PostgreSQL where practical?
2. Are unique constraints and indexes documented?
3. Are foreign keys and composite foreign keys used for consistency boundaries?
4. Is deletion behaviour documented and safe?
5. Are immutable records protected?
6. Does the migration preserve existing data?

## Transactions

1. Is transaction ownership documented?
2. Are multi-record business operations atomic?
3. Does rollback cover product projections, audit records, and related activity records where required?
4. Are services that require a transaction prevented from using root Prisma accidentally?

## Concurrency

1. Are concurrent updates identified?
2. Is the selected strategy documented?
3. Are stale writes rejected or handled deterministically?
4. Are exactly-once or only-one-succeeds cases covered by tests?
5. Is idempotency required, deferred, or explicitly out of scope?

## Testing

1. Do tests cover the acceptance criteria?
2. Are unit and PostgreSQL integration tests included where the release touches persistence?
3. Are permission, tenant isolation, audit, validation, concurrency, rollback, and migration tests included where relevant?
4. Are test counts and validation commands recorded honestly?

## Security

1. Are tampering, privilege escalation, cross-tenant access, sensitive data leakage, stale state, and malicious payloads considered?
2. Are server-side checks authoritative?
3. Are secrets and customer data protected from logs and audit metadata?
4. Are public or unauthenticated flows explicitly documented?

## Documentation

1. Does the release have a Master Release Specification?
2. Are feature specifications complete before implementation?
3. Are ADRs complete before implementation?
4. Are COM navigation and related documents updated?
5. Do internal links and metadata validate?
6. Does documentation match shipped behaviour?

## Performance

1. Are likely query paths indexed?
2. Are payload sizes bounded where needed?
3. Are expensive operations avoided in request paths unless justified?
4. Are future scale risks documented?

## Technical Debt

1. Does the release introduce technical debt?
2. Is new debt documented with severity and recommendation?
3. Does the release resolve existing debt?
4. Are deferrals intentional rather than hidden gaps?

## Deferrals

1. Are non-goals explicit?
2. Are deferred decisions safe to defer?
3. Is the next release impact understood?
4. Is anything incorrectly claimed as complete?

## Validation

1. Were required validation commands run?
2. Are skipped checks justified?
3. Are failures fixed or explicitly accepted by the CTO?
4. Is `git diff --check` clean?

## Release Readiness

1. Is the draft PR complete?
2. Does the PR describe scope, decisions, migrations, tests, validation, risks, and deferrals?
3. Is the branch ready for CEO business approval?
4. Is merge safe?
5. Is the release tag plan clear?

## CTO Outcome

| Field | Value |
| --- | --- |
| Approved | Pending |
| Changes required | Pending |
| Additional ADRs required | Pending |
| Additional tests required | Pending |
| Scope changes required | Pending |
| Reviewer notes | Pending |
