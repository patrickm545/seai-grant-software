# PR #45 ADR-0024 Production Evidence R12

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R12 |
| Status | Closed after typed diagnostic stop |
| Owner | Patrick McKenna |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-07 |

## Authorisation And Boundary

`CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R12` authorised exactly one
read-only Production evidence-capture invocation at repository revision
`a60da87c62bb22d406f3e36f8484a13d14086a32`. R1 through R11 remained closed.
R12 is now also permanently closed and grants no retry, remediation,
migration, deployment, alias, attestation-activation or status authority.

The operation ran from `2026-08-06T15:17:25.0905913+01:00`
(`2026-08-06T14:17:25.0905913Z`) until
`2026-08-06T15:18:45.9206591+01:00`
(`2026-08-06T14:18:45.9206591Z`). The fixed launcher was invoked exactly once.

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
`adr-0024-migration-record-normalization/v1`. It identified the exact
repository migration and safe Production record:

| Field | Value |
| --- | --- |
| Migration | `20260710140000_workflow_foundation` |
| Record ID | `ce4489c9-fa9b-41e0-90fc-23a584e162da` |
| Failure reason | `checksum-mismatch` |
| Comparison rule | Exact immutable-manifest SHA-256 checksum |

| Checksum field | Exact value |
| --- | --- |
| Expected canonical repository checksum | `7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d` |
| Observed Production checksum | `fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8` |

No other safe mismatch was emitted for this migration. R12 did not establish
why the checksums differed, authorise either checksum, or establish a
remediation.

The ordered verifier reached and accepted the exact R10 tuple for
`20260710120000_identity_organisation_foundation` and the exact R11 tuple for
`20260710130000_users_roles_permissions_audit` before stopping on workflow
foundation. The R10 and R11 tuples were not altered by R12.

## Subsequent Repository-Only Investigation

The later
[checksum-divergence investigation](PR_45_ADR_0024_R12_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
used only the committed Git blob, retained safe R12 values, repository history
and local worktrees. It reproduced the observed checksum from the exact
committed UTF-8 SQL by converting LF to CRLF while retaining the final
newline. That later classification A result is not a finding made by R12 and
does not alter the operation's typed stop or permanently closed status.

## Stop State

Reaching `first-evidence-generation` establishes that the guarded connection
opened, the first repeatable-read transaction began, `SET TRANSACTION READ
ONLY` succeeded, and the fixed identity, migration-ledger and catalog reads
completed. The repository then stopped before a complete evidence object.

The second transaction did not begin. No deterministic comparison, evidence
digest, schema fingerprint result, catalog assertion result, pending migration
set or complete external artifact was emitted. The proposed logical artifact
reference
`ADR0024/CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R12/capture.json` was therefore
not created and has no SHA-256.

The attestation remains pending with zero accepted captures and zero
approvals. Production status was not run. No Production write, migration,
ledger edit, schema change, data change, deployment or alias movement
occurred. A fresh complete Production evidence capture requires a new,
separate authorisation; this record does not create or imply R13 authority.
