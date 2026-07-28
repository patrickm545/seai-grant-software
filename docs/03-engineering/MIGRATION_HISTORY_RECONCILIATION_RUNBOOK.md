# Migration History Reconciliation Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-MIGRATION-HISTORY-RECONCILIATION-RUNBOOK-001 |
| Status | Proposed; non-executable until ADR and remediation implementation approval |
| Owner | Clada Systems Engineering; Production execution owner Patrick or delegated deployment owner |
| Review cycle | Before each authorised attestation use and after migration tooling changes |
| Last reviewed | 2026-07-28 |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |

## Purpose And Authority

This runbook defines a future, separately approved acceptance of the
Production lineage for
`20260423093000_application_pack_admin_fields`. It is documentation, not
execution authority.

The selected attestation preserves the Production record, adds no historical
SQL and changes no schema or data. A future implementation PR must first add
the exact lineage attestation, attestation-aware verifier and tests required by
ADR-0024.

## Retained Divergence And Allowed Status

The historical migration ledger remains divergent. The missing SQL remains
unknown, the existing Production record remains untouched and no replacement
migration may pretend to be the original. This runbook does not restore
historical equivalence.

After successful implementation, the only permitted status description is:

> **Production lineage accepted under ADR-0024 attestation.**

Do not describe the result as history repaired, migration history restored,
drift eliminated, ledger normalised or historical migration recovered.

## Exact Attestation Identity

The executable attestation must pin all values in ADR-0024, including:

- Production environment and fingerprint `db_4e1d3bd23cff6801`;
- migration `20260423093000_application_pack_admin_fields`;
- ID `2305f52e-af2f-4717-bc37-a6a88bc1ec33`;
- checksum
  `affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589`;
- started `2026-04-23T07:04:10.395Z`, finished
  `2026-04-23T07:04:10.527Z`, one applied step, no rollback and no error;
- the exact failed/rolled-back and zero-step completed records for
  `20260428120000_manual_submission_prep`;
- the exact 16-migration manifest at
  `a4bd4e2c184c745520a1484fcfbe94595ef58b3f`, or an explicitly reviewed
  successor;
- the exact approved Production schema fingerprint and catalog assertions; and
- the incident, approvals, owner, evidence, creation/review dates and expiry.

Missing, wildcard, inferred or partially matching values fail closed.

## Roles

| Role | Responsibility |
| --- | --- |
| Incident owner | Owns stop/go decisions and audit package |
| Production operator | Executes only approved commands in the controlled shell |
| Independent reviewer | Verifies identity, inventory, schema and expected outputs |
| Application reviewer | Confirms previous Ready compatibility and post-release behavior |
| Recovery owner | Confirms restore point and decides whether provider recovery is required |

The operator and independent reviewer must be different people.

## Preconditions

All items are mandatory:

- [ ] ADR-0024 is Accepted.
- [ ] The documentation PR is merged.
- [ ] A separate remediation implementation PR is approved and merged.
- [ ] The implementation contains no migration SQL or Production record
      mutation.
- [ ] Exact implementation commit and current `main` SHA are recorded.
- [ ] The approved repository inventory is pinned to
      `a4bd4e2c184c745520a1484fcfbe94595ef58b3f` or an explicitly reviewed
      successor commit.
- [ ] Production database identity is independently verified against the
      approved fingerprint.
- [ ] A current, restorable Production recovery point and retention window are
      recorded.
- [ ] The previous Ready deployment
      `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` remains available and healthy.
- [ ] No concurrent deployment, schema change, migration command or maintenance
      operation is in flight.
- [ ] A read-only `_prisma_migrations` snapshot is retained without credentials.
- [ ] The versioned schema fingerprint and catalog assertions match the
      approved attestation.
- [ ] The attestation owner, approvers, creation date, review date, expiry,
      reason and evidence references are complete.
- [ ] The attestation is active, within its 90-day approval window and not
      withdrawn or subject to a retirement condition.
- [ ] Fresh-database and baseline-upgrade validation pass from the exact commit.
- [ ] Preview has no unexpected migration and cannot accept the Production
      attestation.
- [ ] Named operator, reviewer, incident owner and recovery owner are present.
- [ ] The maintenance/release window and change ID are approved.
- [ ] Rollback decision points below are acknowledged.

Any failed or ambiguous item is a stop.

## Read-Only Verification

The future implementation must expose an approved, secret-safe verification
mechanism. Names below describe the intended interface; they do not exist or
authorise execution in this documentation PR.

| Step | Mechanism | Expected result | Database effect | Stop condition |
| --- | --- | --- | --- | --- |
| 1 | `pnpm db:fingerprint` in the controlled Production shell | Exact approved Production fingerprint; no URL | None; parses configuration | Missing or different identity |
| 2 | Future `pnpm db:reconcile:check -- --change-id <approved-id>` | Exact attested legacy record, related duplicate records, repository inventory and schema fingerprint pass | Read-only | Any field, checksum, count, schema assertion or environment differs |
| 3 | `pnpm db:status` | Divergence is reported or translated as the one attested lineage plus the exact pending set | Read-only | Any unapproved pending, failed, unfinished or additional database-only migration |
| 4 | Provider and Vercel inspection | Previous Ready alias and blocked deployment references match the change record | None | Alias, commit or environment differs |
| 5 | Non-mutating application health checks | Previous Ready public shell and unauthenticated protections are healthy | No intended database write | 5xx, unsafe log, or unexpected write path |

The read-only verifier must run inside a read-only transaction where supported.
No diagnostic may print credentials, URLs, customer values or migration SQL
recovered from an untrusted source.

## Evidence Package

Before go:

- exact database fingerprint;
- exact `main` and remediation commit SHAs;
- migration inventory names, checksums and terminal states;
- legacy record ID and timestamps;
- repository migration inventory hash;
- Production schema fingerprint;
- named catalog assertions for the four `Lead` columns and every
  password-reset migration prerequisite;
- fresh-database final fingerprint;
- baseline-upgrade final fingerprint;
- previous Ready and blocked deployment references;
- restore point timestamp and retention window;
- approvals, change ID, operator and reviewer.

## Future Attestation Implementation

The separately approved code PR must:

1. add a machine-readable lineage attestation matching ADR-0024;
2. add a read-only inventory and schema verifier;
3. make Production status-only builds pass only when there are no pending
   migrations and the exact attested lineage is otherwise valid;
4. make deliberate Production migration execution accept the exact attested
   lineage plus only the approved pending set;
5. keep Preview, Development and test on strict repository-only lineage;
6. run the same verifier after deploy;
7. fail closed on every unknown output or connection error; and
8. add unit and disposable PostgreSQL tests for changed metadata, additional
   database-only migrations, wrong fingerprints, pending-set changes,
   concurrency and post-check failure.

The implementation must reject another unexpected migration, any changed
checksum or pinned timestamp/state, another failed or unfinished migration,
changed duplicate-migration metadata, identity or schema mismatch, missing,
renamed, deleted or modified repository migrations, additional unapproved
schema objects, expired or withdrawn approval, and every non-attested
environment or database.

The attestation supplements Prisma. It does not waive the normal Prisma
inventory, pending-migration, failure-state or schema checks. Only the single
exact discrepancy in ADR-0024 may be accepted.

No code from that future PR may edit `_prisma_migrations`, execute repair SQL or
apply a migration automatically during a status-only Production build.

## Execution Sequence

### Stage 1 - Approve the attested lineage

Run the future read-only reconciliation check against Production.

- **Environment:** Production, exact approved fingerprint.
- **Expected output:** one attested legacy record, all repository records
  consistent, exact known duplicate ledger state, approved schema fingerprint,
  and the expected pending password-reset migration.
- **Migration-history effect:** none.
- **Schema effect:** none.
- **Data effect:** none.
- **Stop:** any mismatch or insufficient evidence.

The incident owner and independent reviewer sign the evidence. This approval
accepts the exact lineage under ADR-0024; it does not repair the historical
ledger or apply a migration.

### Stage 2 - Merge the remediation implementation

Merge the reviewed gate/attestation implementation only after Stage 1 evidence
is approved.

- **Environment:** repository and CI.
- **Expected output:** all required tests pass; Production status-only behavior
  remains blocked while a migration is pending.
- **Migration-history effect:** none.
- **Schema effect:** none.
- **Data effect:** none.
- **Stop:** automatic deploy could apply a migration, accept another database,
  or promote the application while pending.

The resulting Production build is expected to remain blocked because
`20260724180000_password_reset_foundation` is pending. A blocked build at this
point is correct.

### Stage 3 - Deliberately apply the approved pending migration

Only after separate approval for the PR #41 migration, the operator uses the
existing guarded Production command from the exact remediation commit:

```text
PRODUCTION_MIGRATION_CHANGE_ID=<approved-change-id>
ACKNOWLEDGE_PRODUCTION_MIGRATION=APPLY_APPROVED_PRODUCTION_MIGRATIONS
pnpm db:migrate:production
```

Secrets are loaded through the approved provider mechanism and never echoed.

- **Environment:** Production, exact approved fingerprint.
- **Expected output:** attestation-aware preflight passes; only
  `20260724180000_password_reset_foundation` is pending; Prisma applies it once;
  attestation-aware postflight reports the exact legacy lineage plus every
  repository migration applied.
- **Migration-history effect:** adds only Prisma's ordinary completed record for
  the approved password-reset migration. It does not change the legacy or
  duplicate records.
- **Schema effect:** only the reviewed additive password-reset foundation
  objects.
- **Data effect:** no intended application-row mutation; any migration-defined
  data operation must have been separately reviewed.
- **Stop:** pending set differs, preflight differs, migration fails, postflight
  differs, or schema/data integrity evidence changes unexpectedly.

Do not rerun after an ambiguous result. Preserve output and enter incident
handling.

### Stage 4 - Deploy and verify

Create a fresh Production deployment from the exact approved commit only after
Stage 3 passes.

- **Environment:** Vercel Production.
- **Expected output:** status-only attestation-aware preflight passes with no
  pending migration; build becomes Ready; alias moves only after all gates
  succeed.
- **Migration-history effect:** none.
- **Schema effect:** none.
- **Data effect:** none from deployment.
- **Stop:** preflight, build, runtime health, alias, logs or schema verification
  differs.

## Post-Attestation Validation

- [ ] Exact database identity remains unchanged.
- [ ] Recorded status is exactly `Production lineage accepted under ADR-0024
      attestation`.
- [ ] The historical ledger is still documented as divergent and the original
      artifact as unavailable.
- [ ] Attestation-aware migration inventory passes.
- [ ] No unexpected, failed, unfinished or unapproved pending migrations remain.
- [ ] The password-reset foundation migration has exactly one new successful
      application.
- [ ] The legacy and duplicate migration records are byte-for-byte unchanged.
- [ ] Production schema matches the approved schema fingerprint.
- [ ] A fresh disposable database applies all repository migrations.
- [ ] An approved baseline-upgrade database reaches the same schema.
- [ ] Preview validation passes without a lineage exception.
- [ ] Production deployment reaches Ready.
- [ ] Production alias moves only after all gates pass.
- [ ] Existing login behavior remains unchanged.
- [ ] No user-facing password-reset route or UI is exposed.
- [ ] Public and unauthenticated smoke checks pass.
- [ ] Runtime and migration logs contain no 5xx or unsafe output.
- [ ] The incident evidence package is complete.

## Rollback Boundaries

Before Stage 3, rollback is repository-level: do not execute the Production
command, keep the previous Ready alias and correct the remediation code.

After the password-reset migration commits, its migration record and additive
schema are durable forward history. Do not delete the record, drop the table or
restore old migration rows as routine rollback. If the new application is
schema-backward-compatible, keep or restore the previous Ready application
alias while preserving the additive schema.

If migration execution is partial, postflight is ambiguous or integrity
changes, stop writes as directed by the database operations runbook and choose
between reviewed forward repair and provider point-in-time recovery. Provider
recovery is an incident-owner decision, not an automatic command.

The historical lineage attestation is not rolled back by hiding the legacy
record. If its evidence is later disproven, disable Production migration
execution and open a new incident.

## Attestation Lifecycle And Retirement

Clada Systems Engineering owns the attestation. CTO, database reliability,
security and Production owners approve creation and renewal. Review occurs
before every Production database release and at least quarterly. Approval
expires no later than 90 days after creation or renewal; expiry fails closed.

Retire the attestation immediately when the Production database is replaced,
history is formally re-baselined, the checksum-identical original artifact is
recovered, schema lineage materially changes, a later ADR supersedes ADR-0024,
or supporting evidence is invalidated. Retirement blocks Production migration
and deployment until the new governing path is approved.

The attestation creates no precedent. It cannot become a permanent ignore list,
wildcard, name-only or checksum-free exclusion, automatic unknown-migration
acceptance, or reusable incident template without a new investigation and
approval.

## Governance Controls After Lineage Acceptance

- Migration files must be committed and reviewed before any environment
  application.
- Applied migration directories cannot be deleted or renamed.
- CI must compare migration inventory and checksums against the merge base.
- Production commands must verify deployment-to-commit provenance.
- Build artifacts containing migrations must be retained through the
  operational audit period.
- Preview and Production database identities must remain isolated.
- Local Production migration execution is prohibited outside this approved
  operator runbook.
- Every operator action retains a change ID and secret-free evidence.
- Schema fingerprints and fresh/upgrade migration tests are release gates.

These controls are tracked in
[TD-019](TECHNICAL_DEBT_REGISTER.md).

## Actions Not Authorised By This Runbook

This document does not authorise migration execution, `migrate resolve`,
`db push`, manual SQL, record editing, reset, restore, deployment, rollback,
alias promotion, password-reset runtime work or Production data creation.

## PR #43 Implementation State

The repository now contains the implementation described in
[ADR-0024 Migration Lineage Verifier](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md):
fixed-path attestation and manifest, exact ledger verifier, versioned catalog
fingerprint, named assertions, read-only modes, stable exit codes and
secret-free evidence.

The attestation is intentionally `pending`. Related record IDs, exact failed-log
digest, approved schema fingerprints and required human approvals remain
unrecorded. Production acceptance and every deliberate migration therefore
remain disabled. No reconciliation check, migration, deployment or alias
promotion was executed by the implementation PR.

## PR #44 Evidence-Capture Tooling

PR #44 prepares this fixed interface for the later Stage 1 operation:

```text
pnpm db:lineage:capture-production-evidence
```

It requires `PRODUCTION_EVIDENCE_CHANGE_ID`,
`PRODUCTION_EVIDENCE_OPERATOR`, `PRODUCTION_EVIDENCE_REVIEWER` and
`PRODUCTION_RESTORE_POINT_REFERENCE` in addition to the existing exact
Production identity controls. The operator and reviewer values must identify
different people. These values are evidence metadata, not migration-execution
authorization.

Each invocation performs two read-only repeatable-read captures and terminates
if they differ. In the separate operational PR, run the command twice and
compare its `deterministicEvidenceDigest`, complete normalized ledger, manifest
hash, schema fingerprint and pending set. Output is not automatically written
or committed. Preserve reviewed secret-free fields in repository evidence;
retain raw evidence only under the controlled external change record and
reference it by stable identifier and SHA-256 digest. Any state change between
capture and activation invalidates the evidence.

PR #44 performs no Production query, evidence capture, attestation activation
or migration. See [PR #44 Evidence-Capture Tooling Preparation](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md).

After PR #44, use a separate **Capture ADR-0024 Production Evidence and Activate
Attestation** operational PR. Production migration execution then requires a
different PR and explicit approval. Resume password-reset request-flow work
only after that execution is verified.
