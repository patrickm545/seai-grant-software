# PR #45 ADR-0024 Production Evidence R17

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R17 |
| Status | Permanently closed after retained typed read-only stop |
| Owner | Clada Systems Engineering |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-17 |

## Authority And Boundary

Change `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R17` authorised exactly one
read-only Production evidence invocation at approved repository revision
`0762b5eb93c1ac1ac9909507bff4638ac0aa8b04`. R1 through R16 remained closed.
R17 is permanently closed and must not be reused.

R17 did not authorise migration execution, manual SQL, checksum acceptance,
attestation activation after a failed capture, Production status, deployment,
promotion or alias movement.

## Preconditions And Timing

The exact branch, local/remote/PR heads, clean worktree, Draft PR, successful
GitHub Validate and Ready Vercel Preview were verified at the approved SHA.
The attestation was pending with zero captures and zero approvals. Neon showed
project `seai-grant-db`, branch `main`, branch ID
`br-cool-wave-abysq3lu`, provider status `All OK`, a six-hour recovery window,
an idle primary compute and no active restore or conflicting operation. Vercel
Production remained on Ready deployment
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` without an active deployment or promotion.

| Event | UTC | Europe/Dublin |
| --- | --- | --- |
| Operation start retained | `2026-08-17T11:44:31.158Z` | `2026-08-17T12:44:31.158+01:00` |
| Child start retained | `2026-08-17T11:44:31.195Z` | `2026-08-17T12:44:31.195+01:00` |
| Child completion retained | `2026-08-17T11:44:36.643Z` | `2026-08-17T12:44:36.643+01:00` |
| Reporting completion retained | `2026-08-17T11:44:36.661Z` | `2026-08-17T12:44:36.661+01:00` |

The guarded identity was environment `production`, database `neondb`, branch
`br-cool-wave-abysq3lu` and fingerprint `db_4e1d3bd23cff6801`.

## Retained Operation Boundary

The fixed command was invoked exactly once:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

The Node retention path wrote operation start and child start before launch,
then durably retained the exact child streams, authoritative repository exit
and child-completion boundary before hashing, parsing and enrichment. Reporting
completed successfully; repository exit and wrapper exit both remained `25`.

The external logical artifact root is
`ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R17`.

| Artifact | Bytes | Raw SHA-256 |
| --- | ---: | --- |
| `operation-boundary-start.json` | 377 | `8dd2b5cf3d1e880ba91d82d8abd31a003d30a254bc0d12c7fec62c5e7507dc08` |
| `operation-boundary-child-start.json` | 555 | `d642861a77a7b2812c246a046001bf93a36336562b2b40e36c2316e59d42a27b` |
| `child-stdout.bin` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `child-stderr.bin` | 864 | `abcdc9684b989c1d1b251e796b2ef9eb9a6c07327f1faa4262c38324a6c2832c` |
| `operation-boundary-child-complete.json` | 887 | `79ca07980111f9f80d2c574459d2b946151e7f4cc70f20336165d8603c2044e5` |
| `diagnostic.json` | 1,953 | `29453f7f05962d550c06c216ea18871e2806e2885801cafbadb9efb7736e92cf` |
| `operation-boundary.json` | 1,448 | `b16ced6f14100eeea82ec21002844001bda9c8f6abb88ea71f7cb8c3c505f225` |

## Typed Stop

| Field | Exact value |
| --- | --- |
| Classification | `LEDGER_MISMATCH` |
| Repository exit | `25` |
| Wrapper exit | `25` |
| Reporting status | `complete` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |
| Migration | `20260720100000_tenant_operator_recovery` |
| Record ID | `4c2d5692-de53-4156-84da-eff6184f9c1d` |
| Record count | `1` |
| Failure reason | `checksum-mismatch` |
| Expected checksum | `e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215` |
| Observed checksum | `11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96` |
| Comparison rule | `exact immutable-manifest SHA-256 checksum` |
| Normalization | `adr-0024-migration-record-normalization/v1` |
| Report | `adr-0024-repository-migration-exact-success/v1` |

The exhaustive structured report contained no lifecycle failure. The ordinary
exact-success implementation evaluates completion, rollback, one-step,
normalized-log and lifecycle-state rules in the same report, so checksum was
the sole reported difference.

## Execution Boundary And Effects

The Production connection opened and the first repeatable-read transaction
completed after `SET TRANSACTION READ ONLY`, the connected-identity read, the
fixed migration-ledger read and fixed catalog reads. Evidence generation then
stopped. No complete first evidence object was emitted, no second transaction
started, and no deterministic digest, schema result, normalized ledger or live
pending set was produced.

The observed checksum exactly matched the previously computed repository-only
CRLF candidate. R17 itself did not promote that candidate and did not add a
tuple. The separate repository-only
[R17 checksum investigation](PR_45_ADR_0024_R17_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
records the later byte proof and narrowly pinned amendment without reopening
R17.

No Production write, migration, resolution, status command, deployment,
promotion or alias movement occurred. The attestation remained pending with
zero captures and zero approvals, and PR #45 remained Draft.
