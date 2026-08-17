# PR #45 ADR-0024 Production Evidence R18

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R18 |
| Status | Permanently closed after retained typed read-only stop |
| Owner | Clada Systems Engineering |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-17 |

## Authority And Boundary

Change `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R18` authorised exactly one
read-only Production evidence invocation at approved repository revision
`1fae81c39e4ad70f5083f8562323f7b0c42b754c`. R1 through R17 remained closed.
R18 is permanently closed and must not be reused.

R18 did not authorise migration execution, manual SQL, checksum acceptance,
attestation activation after a failed capture, Production status, deployment,
promotion or alias movement.

## Preconditions And Timing

The exact branch, local/remote/PR heads, clean worktree, Draft PR, successful
GitHub Validate and Ready exact-SHA Vercel Preview were verified. The Preview
strict preflight and postflight both returned `verified-clean`. The attestation
was pending with zero captures and zero approvals. Neon showed project
`seai-grant-db`, branch `main`, branch ID `br-cool-wave-abysq3lu`, provider
status `All OK`, a six-hour recovery window, an idle primary compute and no
active restore or conflicting operation. Vercel Production remained on Ready
deployment `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` without an active deployment or
promotion.

| Event | UTC | Europe/Dublin |
| --- | --- | --- |
| Operation start retained | `2026-08-17T12:49:17.339Z` | `2026-08-17T13:49:17.339+01:00` |
| Child start retained | `2026-08-17T12:49:17.369Z` | `2026-08-17T13:49:17.369+01:00` |
| Child completion retained | `2026-08-17T12:49:22.991Z` | `2026-08-17T13:49:22.991+01:00` |
| Reporting completion retained | `2026-08-17T12:49:23.012Z` | `2026-08-17T13:49:23.012+01:00` |

The guarded identity was environment `production`, database `neondb`, branch
`br-cool-wave-abysq3lu` and fingerprint `db_4e1d3bd23cff6801`.

## Retained Operation Boundary

The fixed command was invoked exactly once:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

The Node retention path durably retained the exact child streams and
authoritative repository exit before optional reporting. Reporting completed;
repository and wrapper exits both remained `25`.

The external logical artifact root is
`ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R18`.

| Artifact | Bytes | Raw SHA-256 |
| --- | ---: | --- |
| `operation-boundary-start.json` | 377 | `7d41bfb2179ae65ba5798221941891b1eba83d5882638632c50b530cd167f4f5` |
| `operation-boundary-child-start.json` | 555 | `434897020da813302cf4abe0bae5214c10fd08bd14abca822d7f954f09a775fc` |
| `child-stdout.bin` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `child-stderr.bin` | 856 | `68ca594584a5f8e8977deeb8be402ca383dfca2a1d05712bdca251929eac500c` |
| `operation-boundary-child-complete.json` | 887 | `6ea30e3b1b524c8642e05dc48d545b60b101bf595875dc573e7ad7c51c1da262` |
| `diagnostic.json` | 1,941 | `f147dbcff88a1e6f66965c1cff35232db80a4bf9838033029d9cbfd0f9bffbe7` |
| `operation-boundary.json` | 1,448 | `57904501a73219d4f1abc2f264788a5531876dc3bbfab25a62d9463e7ad5b231` |

## Typed Stop

| Field | Exact value |
| --- | --- |
| Classification | `LEDGER_MISMATCH` |
| Repository exit | `25` |
| Wrapper exit | `25` |
| Reporting status | `complete` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |
| Migration | `20260722190000_manual_lead_creation` |
| Record ID | `5920b218-8952-4f39-9862-3a26465e5cbf` |
| Record count | `1` |
| Failure reason | `checksum-mismatch` |
| Expected checksum | `443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160` |
| Observed checksum | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` |
| Comparison rule | `exact immutable-manifest SHA-256 checksum` |
| Normalization | `adr-0024-migration-record-normalization/v1` |

The retained exact-success report contained only `checksum-mismatch`. It did
not emit exact lifecycle timestamps, so this record does not invent them.

## Execution Boundary And Effects

The Production connection opened and the first repeatable-read transaction
completed after `SET TRANSACTION READ ONLY`, connected-identity, migration-ledger
and catalog reads. Evidence generation then stopped. No complete first evidence
object was emitted, no second transaction started, and no deterministic digest,
schema result, normalized ledger or live pending set was produced.

The observed checksum exactly matched the precomputed repository-only CRLF
candidate. R18 itself did not promote it and added no tuple. The later
repository-only [R18 checksum investigation](PR_45_ADR_0024_R18_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
records the independent proof and narrow amendment without reopening R18.

No Production write, migration, resolution, status command, deployment,
promotion or alias movement occurred. The attestation remained pending with
zero captures and zero approvals, and PR #45 remained Draft.
