# PR #45 ADR-0024 Production Evidence R13

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R13 |
| Status | Closed after typed diagnostic stop |
| Owner | Patrick McKenna |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-10 |

## Authorisation And Boundary

`CHG-2026-08-10-ADR0024-PROD-EVIDENCE-R13` authorised exactly one
read-only Production evidence-capture invocation at repository revision
`cd6cd164ad99f8f7c3f76a00c9fc5d7eb6b4743e`. R1 through R12 remained closed.
R13 is now also permanently closed. It grants no retry, remediation,
migration, deployment, alias movement, attestation activation or Production
status authority.

The retained external launch artifacts were created between
`2026-08-10T12:33:41Z` and `2026-08-10T12:33:46Z` (between `13:33:41` and
`13:33:46` Europe/Dublin). These are filesystem evidence times, not fabricated
repository-operation timestamps.

## Guarded Identity

The repository guard accepted the safe Production identity:

- environment: `production`;
- database: `neondb`;
- branch ID: `br-cool-wave-abysq3lu`;
- fingerprint: `db_4e1d3bd23cff6801`.

No connection string, credential, secret-bearing host, raw migration log, SQL
output or customer data is retained in this record.

## Typed Diagnostic Stop

The launcher and repository process returned exit `25`, classified as
`LEDGER_MISMATCH`, at stage `first-evidence-generation`. The invariant was:

```text
first ledger, schema and identity evidence satisfies ADR-0024
```

The report version was
`adr-0024-repository-migration-exact-success/v1`, using normalization version
`adr-0024-migration-record-normalization/v1`. The exact migration record was:

| Field | Expected | Observed |
| --- | --- | --- |
| Migration | `20260716183000_pilot_installer_auth` | same |
| Record ID | one exact successful record | `69505647-7711-408c-853e-32579345d1b0` |
| Checksum | `d35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb` | `fee0749e78b3ecc7aea1f6823b338a16c0ed5fb8e4613e079042bb52192913a9` |
| Applied steps | `1` | `0` |

The comparison rules were exact immutable-manifest SHA-256 and
`appliedStepsCount must equal one`. The previously approved R10, R11 and R12
Production tuples passed before this stop.

## Stop State

Reaching `first-evidence-generation` establishes that the guarded connection
opened, the first repeatable-read transaction began, read-only mode succeeded,
and the fixed identity, ledger and catalog reads completed. The verifier then
stopped before emitting a complete evidence object.

The second transaction did not begin. No deterministic comparison, evidence
digest, complete schema-fingerprint result, catalog-assertion result, pending
migration set or complete external artifact was emitted. The combined output
file is empty and has SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
The retained launcher diagnostic has SHA-256
`4dfcfb7371187fead92369fa3818a837e30bbeb5d1ad194d815a520ec81fa248`.
Both remain outside Git under the closed R13 operation reference.

The attestation remains pending with zero captures and zero approvals.
Production status was not run. R13 performed no Production write, migration,
ledger edit, schema change, data change, deployment or alias movement.

## Later Repository-Only Findings

The later checksum and lifecycle investigations prove that the checksum is the
exact reversible CRLF representation of the committed migration and that a
retained July 17 operation first applied a reviewed transactional repair and
then ran `prisma migrate resolve --applied` from that Windows checkout. Those
later findings explain the zero-step ledger row; they do not change R13's
typed stop or reopen its authority.

No fourth tuple is implemented. Exact ledger timestamps, current read-only
catalog proof and a separate ADR decision are still required before an
explicit historical-lifecycle treatment can be considered.
