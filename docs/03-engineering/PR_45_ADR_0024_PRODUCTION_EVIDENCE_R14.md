# PR #45 ADR-0024 Production Evidence R14

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R14 |
| Status | Closed after typed diagnostic stop |
| Owner | Patrick McKenna |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-10 |

## Authorisation And Boundary

`CHG-2026-08-10-ADR0024-PROD-EVIDENCE-R14` authorised exactly one read-only
Production evidence-capture invocation at repository revision
`90c2f1f95a7dbc6eeaac48df3d2ef0b3a336ac7c`. R1 through R13 remained closed.
R14 is now also permanently closed. It grants no retry, remediation,
migration, deployment, alias movement, attestation activation or Production
status authority.

The retained external start marker records
`2026-08-10T17:07:03.6666094+00:00` and
`2026-08-10T18:07:03.6666094+01:00` Europe/Dublin. No exact stop timestamp was
emitted in the safe retained artifact, so none is inferred. The marker and
empty launcher stderr file remain outside Git under the closed R14 operation
reference.

## Guarded Identity And Read Boundary

The repository guard accepted the safe Production identity:

- environment: `production`;
- database: `neondb`;
- branch ID: `br-cool-wave-abysq3lu`;
- fingerprint: `db_4e1d3bd23cff6801`.

Reaching `first-evidence-generation` establishes that the guarded connection
opened, the first repeatable-read transaction began, read-only mode succeeded,
and the fixed identity, ledger and catalog reads executed. No connection
string, credential, secret-bearing host, raw migration log, SQL output or
customer data is retained here.

## Typed Diagnostic Stop

The repository returned exit `25`, classified as `LEDGER_MISMATCH`, at stage
`first-evidence-generation`. The invariant was:

```text
first ledger, schema and identity evidence satisfies ADR-0024
```

The report version was
`adr-0024-repository-migration-exact-success/v1`, using normalization version
`adr-0024-migration-record-normalization/v1`. The exact safe mismatch was:

| Field | Expected | Observed |
| --- | --- | --- |
| Migration | `20260718130000_tenant_provisioning_data_model` | same |
| Record ID | exact successful record | `5eeca647-5429-4beb-873b-cff91ec58ddf` |
| Checksum | `a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7` | `2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805` |
| Failure reason | exact immutable-manifest checksum | `checksum-mismatch` |

No lifecycle failure was reported for this ordinary non-empty migration. The
previously approved R10, R11 and R12 tuples passed before the stop. The
separate pilot-auth `attestedHistoricalResolvedMigration` ledger state also
passed with zero applied steps, null rollback and no logs. R14 did not emit its
exact timestamps before stopping later in manifest order.

## Stop State

The verifier stopped before emitting complete capture 1. The second
transaction did not begin. No deterministic comparison, evidence digest,
schema fingerprint, catalog assertion result, normalized ledger or live
pending-migration set was produced. The retained launcher stderr file is empty;
there is no complete capture artifact to hash or accept.

The attestation remains pending with zero captures and zero approvals.
Production status was not run. R14 performed no Production write, migration,
ledger edit, schema change, data change, deployment or alias movement.

## Later Repository-Only Finding

The later
[R14 checksum-divergence investigation](PR_45_ADR_0024_R14_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
proves that the observed checksum is the exact reversible CRLF byte
representation of the unchanged committed migration. That later finding does
not change what R14 itself proved, create a capture artifact or reopen R14.
Another Production operation requires a new, separate authorisation.
