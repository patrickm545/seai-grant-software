# PR #45 ADR-0024 Exit 70 Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-EXIT-70-INVESTIGATION-2026-07-29 |
| Status | Repository defect repaired; Production cause narrowed to the retained evidence limit |
| Repository baseline | `5882eba7a69f7093aa0267b80cf77022228bd959` |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Authorised operation | `CHG-2026-07-29-ADR0024-PROD-EVIDENCE-R2` |
| Scope | Repository investigation only; no Production retry |
| Related operation record | [ADR-0024 Production evidence operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md) |

## Outcome

The fixed launcher completed its handoff. The repository verifier then caught
an ordinary JavaScript `Error` and mapped it to `INTERNAL_ERROR`, exit `70`.
The catch boundary deliberately emitted only:

> `INTERNAL_ERROR: Migration lineage verification failed safely.`

That mapping discarded the failing stage, invariant, original error class,
message and stack. The empty stdout artifact proves that no complete evidence
object was emitted. The stopped operation retained no internal log from which
the exact live exception can now be recovered.

Consequently, the exact supported root cause is:

1. a failure occurred after the launcher handed off to
   `scripts/verify-migration-lineage.ts`;
2. that failure was not a `LineageVerifierError`,
   `AttestationValidationError` or `DatabaseSafetyError`;
3. the top-level catch treated it as an unexpected exception and returned
   `70`; and
4. the repository's diagnostic boundary irreversibly suppressed the stage and
   cause needed to distinguish a query/runtime exception from an expected
   ledger or schema rejection.

It would be fabrication to claim a particular observed ledger value, catalog
value or PostgreSQL error from the stopped operation. No Production retry is
permitted to recreate it.

## Execution Path And Decision Point

The complete path was:

1. `scripts/launch-production-evidence-capture.ts`
2. `launchFixedPackageScript()` in `lib/fixed-package-script-launcher.ts`
3. the fixed package script `db:lineage:capture-production-evidence`
4. `main()` in `scripts/verify-migration-lineage.ts`
5. fixed repository manifest, pending attestation and operational-control
   validation
6. `readDatabaseState()`
7. Prisma `RepeatableRead` transaction
8. `SET TRANSACTION READ ONLY`
9. fixed connected-database, migration-ledger and catalog reads
10. `captureProductionLineageEvidence()`
11. a second equivalent read and evidence generation
12. deterministic comparison, secret scan and JSON serialization

The exit-70 decision point was the final `.catch()` in
`scripts/verify-migration-lineage.ts`. Before this repair,
`captureProductionLineageEvidence()` and its ledger and catalog dependencies
could throw plain `Error` instances for expected guarded mismatches. Those
expected mismatches were indistinguishable at the catch boundary from a driver,
transaction, query or other unexpected exception, so all returned exit `70`.

The guarded invariants themselves were fail-closed and correct. The defect was
classification and diagnostics, not acceptance criteria.

## Retained Operational Evidence

| Question | Supported conclusion |
| --- | --- |
| Did the launcher hand off? | Yes. The fixed child command ran and returned exit `70`. |
| Was a Production connection established? | Yes. Provider monitoring recorded one PostgreSQL connection and a compute start during the exact operation window. |
| Did a database query execute? | Yes, at least one read operation. Provider cache activity appeared in the same window. The exact query text was not retained. |
| Did a transaction start? | Yes. Repository code performs all database reads inside the Prisma `RepeatableRead` transaction, and the observed read activity can only occur on that path. |
| Was the transaction read only? | Repository code issues fixed `SET TRANSACTION READ ONLY` before its evidence reads. The provider recorded zero inserted, updated or deleted rows in the operation window. |
| Which read or invariant failed? | Unknown and irrecoverable from the retained R2 artifacts. |
| Was a complete evidence object created? | No complete object was emitted. Whether an in-memory first evidence object was briefly created is not knowable from retained artifacts. |
| Did deterministic comparison occur? | No evidence of it; no result was emitted. |
| Was a digest emitted? | No. |
| Was attestation activation reached? | No. |

Provider query-history retention contained no query text for the window. This
limits the conclusion to connection, read activity and absence of writes; it
does not support inventing a specific expected and observed database value.

## Repair

The repair does not change a verifier rule, schema, manifest, migration,
evidence field or governance requirement.

- Every Production capture phase now carries a fixed, non-secret stage and
  invariant.
- The original exception is preserved internally as the standard `Error.cause`
  of `ProductionEvidenceStageError`.
- Nested stages retain the first failing stage.
- Expected identity, manifest, ledger, schema and configuration failures from
  evidence generation now use the existing typed verifier codes and exits
  `23` through `27`.
- Unexpected exceptions remain exit `70`.
- External unexpected-error output remains generic and contains only the fixed
  stage/invariant; exception messages, stack traces, URLs and credentials are
  not emitted.

The focused regression demonstrates the pre-repair defect directly: a ledger
or catalog mismatch formerly crossed the top-level boundary as plain `Error`
and therefore mapped to exit `70`. The same rejected inputs now remain rejected
but map to `LEDGER_MISMATCH` exit `25` and `SCHEMA_MISMATCH` exit `26`.

## Validation

| Check | Result |
| --- | --- |
| ESLint | Pass |
| TypeScript | Pass |
| Unit, platform and security tests | Pass, 294 tests |
| PostgreSQL integration tests | Pass, 68 tests against a disposable PostgreSQL 16 database |
| Production build | Pass |
| Prisma schema validation | Pass with a non-connecting placeholder URL |
| Migration manifest | Pass, hash `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Immutable migration history | Pass, 16 migrations against `origin/main` |
| Attestation validation | Structurally valid and pending; designed exit `21` |

## Operational Disposition

This repository repair does not authorise another Production operation.
Because the original live failing value was not retained, a future read-only
capture is justified only after this repair is reviewed, all repository and CI
validation passes, and a new explicit Production authorisation and change ID
are issued. `CHG-2026-07-29-ADR0024-PROD-EVIDENCE-R2` remains closed and must
not be reused.

No Production connection, Production status command, migration, SQL, database
mutation, deployment, alias movement, evidence fabrication, digest fabrication
or attestation edit was performed during this investigation.
