# PR #45 ADR-0024 Production Evidence R11

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R11 |
| Status | Closed after typed diagnostic stop |
| Owner | Patrick McKenna |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-06 |

## Authorisation And Boundary

`CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R11` authorised exactly one
read-only Production evidence-capture invocation at repository revision
`3281da65c013e9ad63dbc6c5da507640db586452`. R1 through R10 remained closed.
R11 is now also permanently closed and grants no retry, remediation,
migration, deployment, alias, attestation-activation or status authority.

The operation ran from `2026-08-06T13:18:17.5827564+01:00`
(`2026-08-06T12:18:17.5827564Z`) until
`2026-08-06T13:19:07.3115648+01:00`
(`2026-08-06T12:19:07.3115648Z`). The fixed launcher was invoked exactly once.

## Guarded Identity

The repository guard accepted the safe Production identity:

- environment: `production`;
- database: `neondb`;
- branch ID: `br-cool-wave-abysq3lu`;
- fingerprint: `db_4e1d3bd23cff6801`.

No connection string, credential, secret-bearing host or raw migration log is
retained in this record.

## Typed Diagnostic Stop

The launcher and repository process returned exit `25`, classified as
`LEDGER_MISMATCH`, at stage `first-evidence-generation`. The invariant was:

```text
first ledger, schema and identity evidence satisfies ADR-0024
```

The report used normalization version
`adr-0024-migration-record-normalization/v1`. It identified the exact
repository migration and safe Production record:

| Field | Value |
| --- | --- |
| Migration | `20260710130000_users_roles_permissions_audit` |
| Record ID | `93c04529-1d5b-4350-af01-ef225b69b008` |
| Failure reason | `checksum-mismatch` |
| Comparison rule | Exact immutable-manifest SHA-256 checksum |

| Checksum field | Exact value |
| --- | --- |
| Expected canonical repository checksum | `cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf` |
| Observed Production checksum | `4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb` |

No other safe mismatch was emitted. R11 did not establish why the checksums
differed, authorise either checksum, or establish a remediation.

## Subsequent Repository-Only Investigation

The later
[checksum-divergence investigation](PR_45_ADR_0024_R11_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
used only the committed Git blob, retained safe R11 values and local Git
history. It reproduced the observed checksum from the exact committed UTF-8
SQL by converting LF to CRLF while retaining the final newline. That later
classification A result is not a finding made by R11 and does not alter the
operation's typed stop or permanently closed status.

## Stop State

Reaching `first-evidence-generation` proves that the guarded connection
opened, the first repeatable-read transaction began, `SET TRANSACTION READ
ONLY` succeeded, and the fixed identity, migration-ledger and catalog reads
completed. The repository then stopped before a complete evidence object.

The second transaction did not begin. No deterministic comparison, evidence
digest, schema fingerprint result, catalog assertion result, pending migration
set or complete external artifact was emitted. The proposed logical artifact
reference
`ADR0024/CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R11/capture.json` was therefore
not created and has no SHA-256.

The attestation remains pending with zero accepted captures and zero
approvals. Production status was not run. No Production write, migration,
ledger edit, schema change, data change, deployment or alias movement
occurred. Another Production operation requires a new, separate authorisation;
this record does not create or imply R12 authority.
