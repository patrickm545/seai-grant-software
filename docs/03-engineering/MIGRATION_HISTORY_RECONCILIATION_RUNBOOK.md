# Migration History Reconciliation Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-MIGRATION-HISTORY-RECONCILIATION-RUNBOOK-001 |
| Status | Active governance; repository preparation complete, operational evidence and activation pending |
| Owner | Clada Systems Engineering; pilot-stage Production and Recovery Owner Patrick McKenna |
| Review cycle | Before each authorised attestation use and after migration tooling changes |
| Last reviewed | 2026-07-29 |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |

## Purpose And Authority

This runbook governs the separately approved acceptance of the Production
lineage for
`20260423093000_application_pack_admin_fields`. It is documentation, not
execution authority.

The selected attestation preserves the Production record, adds no historical
SQL and changes no schema or data. PR #43 added the fixed attestation,
attestation-aware verifier and tests required by ADR-0024. PR #44 added the
fixed read-only evidence-capture command. Neither repository-preparation PR
authorised Production access.

## Retained Divergence And Allowed Status

The historical migration ledger remains divergent. The missing SQL remains
unknown, the existing Production record remains untouched and no replacement
migration may pretend to be the original. This runbook does not restore
historical equivalence.

After successful evidence review and attestation activation, the only
permitted status description is:

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

The normal `standard-independent-human` path requires different Production
operator and independent reviewer identities. The explicit temporary
`pilot-stage-compensating-control` path records that no independent human
technical reviewer is currently available and names Patrick McKenna as CEO,
Production Owner, Production Operator, Recovery Owner and final accountable
approver. See
[PR #45 Pilot-Stage Production Governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md).
AI-assisted CTO review is a review method, not a human approval identity.

## Phase-Specific Preconditions

Repository preparation is complete when ADR-0024 is Accepted, PRs #43 and #44
are merged, the fixed manifest and attestation validate, immutable migration
history passes, and the capture command remains strictly read-only.

Before operational evidence capture:

- [ ] Exact PR #45 repository SHA and branch are approved.
- [ ] Approved read-only change ID and operation window are recorded.
- [ ] Governance mode is exact. Standard mode has a different named operator
      and independent reviewer; pilot-stage mode names Patrick McKenna and
      records the exact accountability acknowledgement.
- [ ] Current restore point, retention window, evidence reference and recovery
      owner are recorded.
- [ ] Production identity is independently verified against
      `db_4e1d3bd23cff6801`.
- [ ] Previous Ready deployment
      `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` remains healthy and aliased.
- [ ] No concurrent deployment, schema change, migration command, maintenance
      operation or alias promotion is in flight.
- [ ] The fixed attestation remains `pending`.
- [ ] Repaired Preview remains strict, clean and receives no exception.

After capture and before activation:

- [ ] Two distinct externally retained complete command artifacts and all
      internal repeat captures match every deterministic field.
- [ ] Exact ledger, record IDs, failed-log digest, schema fingerprint, named
      assertions, catalog counts and evidence digest are independently reviewed.
- [ ] Standard mode has all four genuine approvals; pilot-stage mode has
      Patrick McKenna's sole human Production-owner approval and every
      mandatory compensating-control field.
- [ ] Lifecycle timestamps and expiry are valid.
- [ ] Active-attestation validation and all repository checks pass.

Before Production migration execution:

- [ ] PR #45 attestation activation is approved and merged.
- [ ] Read-only `production-status` returns exact exit `20` with
      `verified-pending-blocked`.
- [ ] A different change explicitly authorises the password-reset migration.
- [ ] A current restore point and deliberate execution controls are rechecked.

The detailed operational fields and sign-off spaces are maintained in the
[PR #45 operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md).
Any failed, blank, stale or ambiguous item is a stop.

## Read-Only Verification

The repository exposes fixed, secret-safe verification mechanisms. Their
existence does not authorise Production use.

| Step | Mechanism | Expected result | Database effect | Stop condition |
| --- | --- | --- | --- | --- |
| 1 | `pnpm db:fingerprint` in the controlled Production shell | Exact approved Production fingerprint; no URL | None; parses configuration | Missing or different identity |
| 2 | `pnpm db:lineage:capture-production-evidence` | Two internal captures match and emit exact secret-free ledger/schema evidence | Read-only repeatable-read | Any identity, record, digest, count, assertion or repeat differs |
| 3 | `pnpm db:status`, only after activation | Invokes `production-status`; exact attested lineage plus the approved pending set returns `verified-pending-blocked`, exit `20` | Read-only repeatable-read | Any other decision or exit |
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

## Implemented Attestation Controls

The merged repository implementation:

1. uses a fixed machine-readable lineage attestation matching ADR-0024;
2. provides read-only inventory, ledger and schema verification;
3. keeps Production status-only builds blocked with exit `20` while the exact
   approved repository migration is pending;
4. requires exact deliberate controls before a later Production migration;
5. keeps Preview, Development and test on strict repository-only lineage;
6. runs the same verifier after deploy;
7. fails closed on every unknown output or connection error; and
8. includes unit, security and disposable PostgreSQL tests for changed
   metadata, additional database-only migrations, wrong fingerprints,
   pending-set changes, concurrency and post-check failure.

The implementation must reject another unexpected migration, any changed
checksum or pinned timestamp/state, another failed or unfinished migration,
changed duplicate-migration metadata, identity or schema mismatch, missing,
renamed, deleted or modified repository migrations, additional unapproved
schema objects, expired or withdrawn approval, and every non-attested
environment or database.

The attestation supplements Prisma. It does not waive the normal Prisma
inventory, pending-migration, failure-state or schema checks. Only the single
exact discrepancy in ADR-0024 may be accepted.

No verifier or capture code may edit `_prisma_migrations`, execute repair SQL
or apply a migration automatically during a status-only Production build.

## Execution Sequence

### Stage 1 - Capture, review and activate the attested lineage

Complete the PR #45 readiness checklist, run the fixed capture command twice,
compare the complete artifacts, obtain genuine approvals and activate only
after every exact field is known.

- **Environment:** Production, exact approved fingerprint.
- **Expected output:** one attested legacy record, all repository records
  consistent, exact known duplicate ledger state, approved schema fingerprint,
  and the expected pending password-reset migration.
- **Migration-history effect:** none.
- **Schema effect:** none.
- **Data effect:** none.
- **Stop:** any mismatch or insufficient evidence.

Under standard governance, the incident owner and independent reviewer sign the
evidence. Under pilot-stage governance, Patrick McKenna signs the exact
accountability acknowledgement and final approval only after two complete
external artifacts match and their references and SHA-256 digests are
recorded. Either path accepts the exact lineage under ADR-0024; neither repairs
the historical ledger nor applies a migration.

#### Interpreting a migration-record mismatch

Exit `25` remains a hard stop. A diagnostic beginning with
`mismatchReport=` identifies the migration and lists only approved safe fields
whose expected and observed values differ. Each value has an explicit kind so
`null`, `absent`, empty string, zero and false cannot be confused. The report
also names the fixed comparison rule and normalization version.

Timestamp values are canonical UTC ISO-8601 strings. Three to six fractional
digits are supported; insignificant trailing zeros are removed while every
significant microsecond is retained. Raw migration logs are never shown. Only
the `none` or `sha256` classification and an existing SHA-256 digest may
appear. A malformed UUID, digest, timestamp or other string is shown as
`redacted-invalid-format`, not echoed.

Use the report only to prepare a repository investigation. It is not evidence
that the attestation is wrong, permission to edit an expected value, authority
to query Production manually or permission to retry. Preserve the failed
artifact, close the authorized operation and require separate review and
authorization before any future read-only capture.

### Stage 2 - Verify the guarded pending state

After PR #45 activation and repository validation, run the approved read-only
`production-status` verifier.

- **Environment:** controlled Production operator shell, exact approved
  fingerprint.
- **Expected output:** exact decision `verified-pending-blocked`, exit `20`,
  `deploymentAllowed=false` and `migrationApplied=false`.
- **Migration-history effect:** none.
- **Schema effect:** none.
- **Data effect:** none.
- **Stop:** any other decision or exit, Prisma deploy, application-build
  continuation, deployment or alias movement.

The status-only boundary remains blocked because
`20260724180000_password_reset_foundation` is pending. Exit `20` at this point
is correct and must not continue an application build.

### Stage 3 - Deliberately apply the approved pending migration

Only after separate approval for the PR #41 migration, the operator uses the
existing guarded Production command from the exact approved execution commit:

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

Clada Systems Engineering owns the attestation. Standard mode requires CTO,
database reliability, security and Production-owner approvals. The temporary
pilot-stage mode makes Patrick McKenna the sole human final accountable
approver under the fixed compensating controls. Review occurs before every
Production database release and at least quarterly. Approval expires no later
than 90 days after creation or renewal; expiry fails closed. The pilot-stage
exception must additionally be reviewed before onboarding the first 10 pilot
installers or when another engineer or qualified external database reviewer
joins, whichever occurs first.

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

It requires `PRODUCTION_EVIDENCE_GOVERNANCE_MODE`,
`PRODUCTION_EVIDENCE_CHANGE_ID`, `PRODUCTION_EVIDENCE_OPERATOR` and
`PRODUCTION_RESTORE_POINT_REFERENCE` in addition to the existing exact
Production identity controls. Standard mode also requires
`PRODUCTION_EVIDENCE_REVIEWER` to identify a different person. Pilot-stage mode
prohibits a reviewer value, requires operator `Patrick McKenna` and requires
the exact `PRODUCTION_EVIDENCE_PILOT_ACCOUNTABILITY_ACKNOWLEDGEMENT`. These
values are evidence metadata, not migration-execution authorization.

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
