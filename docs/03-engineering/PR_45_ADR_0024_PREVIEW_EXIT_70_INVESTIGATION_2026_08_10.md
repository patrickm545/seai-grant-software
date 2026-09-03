# PR #45 ADR-0024 Preview Strict-Preflight Exit 70 Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PREVIEW-EXIT-70-INVESTIGATION-2026-08-10 |
| Status | Repository diagnostics repaired; one Preview re-validation pending |
| Owner | Clada Systems Engineering |
| Review cycle | Before authorising ADR-0024 Production operation R13 |
| Last reviewed | 2026-08-10 |
| Approved repository baseline | `ad8ce2c263c8e8533fd0b71af0d8f82513936a26` |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Scope | Preview-only diagnosis; no Production connection or operation |

## Retained Failure

Two Vercel Preview deployments, including
`dpl_FKW9vz83y5Rz91Zz3dnj3SMcuFPd`, cloned the exact approved branch and
commit. Both selected Preview, passed the repository Preview identity guard,
entered `strict-preflight`, and stopped before Prisma deploy with exit `70`:

> `INTERNAL_ERROR: Migration lineage verification failed safely.`

The existing Preview alias remained on the previous Ready deployment. No
Preview migration ran.

## Execution Path

The fixed path is:

1. `scripts/run-vercel-build.ts` selects `migrate-preview`.
2. `scripts/run-database-command.ts` proves the Preview environment and
   fingerprint.
3. `runVerifier('preflight')` invokes
   `scripts/verify-migration-lineage.ts strict-preflight`.
4. The verifier checks the immutable repository manifest.
5. `readDatabaseState()` opens a Prisma `RepeatableRead` transaction, sets it
   read only, and executes the fixed connected-identity, migration-ledger and
   catalog reads.
6. `verifyLineage()` applies canonical-only strict ledger and schema rules.
7. Only exit `0` permits the later Prisma deploy call.

At the approved baseline, step 5 had no strict-mode stage wrapper. A driver,
transaction, fixed-query or response-normalisation exception therefore reached
the final catch as an indistinguishable plain error and returned exit `70`.
Production evidence capture already had equivalent guarded stage boundaries;
strict Preview did not.

## Repository Defects

Two narrow defects were confirmed.

1. Strict modes suppressed the failing database/read/verification stage and
   invariant. Genuine infrastructure or runtime failures correctly failed
   closed at exit `70`, but the retained diagnostic could not identify the
   cause safely.
2. Known migration-record normalisation failures for timestamp or applied-step
   shape were plain errors in `verifyStrictLedger()`. Those expected ledger
   inconsistencies could be collapsed incorrectly to exit `70` instead of the
   existing `LEDGER_MISMATCH` exit `25`.

## Repair

The repair adds strict-only guarded stages for transaction establishment,
read-only setup, connected identity, migration ledger, catalog, lineage
verification, secret validation and evidence serialization. Unexpected errors
retain their original cause in memory, while external output includes only an
allowlisted stage, invariant, failure category and safe error code. Raw error
messages, stack traces, connection strings, credentials and query data remain
suppressed.

Migration-record normalisation now throws a typed error containing only the
fixed field, reason and normalisation version. `verifyStrictLedger()` converts
only that known error to `LEDGER_MISMATCH`; unrelated exceptions remain exit
`70`.

The repair does not change the strict acceptance rules, manifest, migration
history, schema fingerprint, catalog assertions, attestation schema, Production
tuple rules or deploy ordering.

## Preview And Attestation Routing Audit

`strict-preflight` derives `productionMode=false`. It does not load or validate
the ADR-0024 Production attestation and does not enter
`verifyAttestedLedger()`. R10, R11 and R12 checksum-divergence tuples therefore
cannot apply to Preview. Tests independently replace each canonical Preview
checksum with its exact Production alternate checksum and require exit `25`.

Attestation v4 may be present in the repository, but passing it to a synthetic
strict verification does not change the result: attested discrepancy fields
remain `not-applicable`, and Preview remains canonical-only.

## Outside-Vercel Reproduction

The Vercel CLI could not export the sensitive Preview `DATABASE_URL`; it wrote
an empty value by design. A provider-generated alternate URL was fingerprinted
without connecting and resolved to the positive Production identity, so it was
immediately rejected for this task. No Production connection occurred.

A fresh local PostgreSQL 18 database was then created on loopback. The guarded
integration runner accepted its disposable fingerprint, applied all 16
canonical migrations, and passed 68 PostgreSQL integration tests. The repaired
`strict-preflight` returned exit `0`, `verified-clean`, with canonical-only
routing, all 16 migrations applied, no pending migrations and no attestation
treatment. The server was stopped after validation.

This rules out a general strict-verifier, checksum-tuple or attestation-v4
regression. The exact live Preview cause must be classified by the single
post-repair Vercel Preview re-validation. If it reports a real Preview ledger or
schema inconsistency, this task will not repair that database.

## Safety Boundary

- No Production credential was used to connect.
- No Production status, evidence capture, migration, deployment or alias
  command ran.
- No Preview mutation was performed by this investigation.
- The single post-repair Preview build must still stop before Prisma deploy on
  every non-zero verifier result.
- PR #45 remains Draft, and R13 remains unauthorised.

## Related Documents

- [ADR-0024 Migration Lineage Verifier](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md)
- [Database Environment Safety](DATABASE_ENVIRONMENT_SAFETY.md)
- [Database Operations Runbook](DATABASE_OPERATIONS_RUNBOOK.md)
- [Earlier ADR-0024 exit-70 investigation](PR_45_ADR_0024_EXIT_70_INVESTIGATION_2026_07_29.md)
- [PR #45 operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
