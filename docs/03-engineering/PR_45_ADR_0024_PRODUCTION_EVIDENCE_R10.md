# PR #45 ADR-0024 Production Evidence R10

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R10 |
| Status | Closed after typed diagnostic stop |
| Owner | Patrick McKenna |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-05 |

## Authorisation And Boundary

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R10` authorised exactly one
read-only Production evidence-capture invocation at repository revision
`1949ebe495801b26f6f59d2785a6b86b2864b153`. R1 through R9 remained closed.
R10 is now also permanently closed and grants no retry, remediation,
migration, deployment, alias, attestation-activation or status authority.

The operation ran from `2026-08-05T16:20:51.5267253+01:00`
(`2026-08-05T15:20:51.5267253Z`) until
`2026-08-05T16:21:33.0105514+01:00`
(`2026-08-05T15:21:33.0105514Z`). The fixed launcher was invoked exactly once:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

## Pre-Access Verification

The local branch, remote branch and Draft PR head matched the approved SHA;
the worktree was clean; GitHub Validate and Vercel Preview had passed. The
launcher smoke returned `launcher OK`. The 16-migration manifest and immutable
history verified. The pending attestation retained zero captures and zero
approvals under `pilot-stage-compensating-control`, with Patrick McKenna as
operator, Production owner and accountable executive.

Immediately before access, the Neon console showed project `seai-grant-db`,
branch `main`, branch ID `br-cool-wave-abysq3lu`, a six-hour recovery window,
no restore or maintenance operation in progress and the primary compute idle.
Vercel showed no queued or building deployment. Production deployment
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` remained `READY`, with its existing
Production aliases unchanged.

The repository guard accepted the safe Production identity:

- environment: `production`;
- database: `neondb`;
- branch ID: `br-cool-wave-abysq3lu`;
- fingerprint: `db_4e1d3bd23cff6801`.

## Typed Diagnostic Stop

The launcher and repository process both returned exit `25`, classified as
`LEDGER_MISMATCH`, at stage `first-evidence-generation`. The invariant was:

```text
first ledger, schema and identity evidence satisfies ADR-0024
```

The report version was
`adr-0024-repository-migration-exact-success/v1`, using normalization version
`adr-0024-migration-record-normalization/v1`. It reported one safe row for
`20260710120000_identity_organisation_foundation`, with safe record ID
`112c6124-f0c2-4b6b-8d02-f6ce835746e3`.

The only failure reason was `checksum-mismatch`:

| Field | Expected | Observed | Comparison rule |
| --- | --- | --- | --- |
| `checksum` | typed safe string `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | typed safe string `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` | Exact immutable-manifest SHA-256 checksum |

No other failure reason was emitted. The diagnostic does not authorise either
value to be accepted and does not establish a remediation.

## Subsequent Repository-Only Investigation

The later
[checksum-divergence investigation](PR_45_ADR_0024_R10_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
used only the committed Git blob and retained safe R10 values. It reproduced
the observed checksum from the exact committed UTF-8 SQL by converting LF to
CRLF while retaining the final newline. That later result is classification A
evidence; it is not a finding made by R10 and does not alter this operation's
typed stop or permanently closed status.

## Stop State

Reaching `first-evidence-generation` proves that the guarded connection
opened, the first repeatable-read transaction began, `SET TRANSACTION READ
ONLY` succeeded, and the fixed identity, migration-ledger and catalog reads
completed. The repository then stopped before a complete evidence object.

The second transaction did not begin. No deterministic comparison, evidence
digest, schema fingerprint, catalog assertion result, pending migration set or
complete external artifact was produced. The logical artifact reference
`ADR0024/CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R10/capture.json` was therefore
not created and has no SHA-256.

The attestation remains pending with zero accepted captures and zero
approvals. Production status was not run. No Production write, migration,
ledger edit, schema change, data change, deployment or alias movement occurred.
