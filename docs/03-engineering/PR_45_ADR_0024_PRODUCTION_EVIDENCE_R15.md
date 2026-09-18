# PR #45 ADR-0024 Production Evidence R15

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-PRODUCTION-EVIDENCE-R15 |
| Status | Permanently closed after typed read-only stop |
| Owner | Clada Systems Engineering |
| Review cycle | Retain with PR #45 and ADR-0024 operational evidence |
| Last reviewed | 2026-08-13 |

## Authority And Boundary

Change `CHG-2026-08-13-ADR0024-PROD-EVIDENCE-R15` authorised exactly one
read-only Production evidence invocation at approved repository revision
`da3db4dd71050c902ee2f6266d42fd456e2654cb`. R1 through R14 remained closed.
R15 is also permanently closed and must not be reused.

R15 did not authorise migration execution, manual SQL, attestation activation,
Production status after a failed capture, deployment, promotion or alias
movement.

## Preconditions And Timing

The local branch, local and remote heads, clean worktree, Draft PR, successful
GitHub Validate and Ready Vercel Preview were verified at the approved SHA.
The attestation was pending with zero captures and zero approvals. Neon exposed
the exact Production branch, provider status `All OK`, a six-hour recovery
window and no active restore or maintenance state. Vercel Production remained
on Ready deployment `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` without a deployment
or promotion in progress.

| Event | UTC | Europe/Dublin |
| --- | --- | --- |
| Invocation started | `2026-08-13T17:14:08.9871624Z` | `2026-08-13T18:14:08.9871624+01:00` |
| Repository stop | `2026-08-13T17:14:20.4869660Z` | `2026-08-13T18:14:20.4869660+01:00` |

The guarded identity was environment `production`, database `neondb`, branch
`br-cool-wave-abysq3lu` and fingerprint `db_4e1d3bd23cff6801`.

## Typed Stop

| Field | Exact value |
| --- | --- |
| Classification | `LEDGER_MISMATCH` |
| Exit | `25` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |
| Migration | `20260718150000_tenant_first_login_activation` |
| Record ID | `e0d71f73-e278-4a79-9906-650a8c43881f` |
| Record count | `1` |
| Failure reason | `checksum-mismatch` |
| Expected checksum | `f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f` |
| Observed checksum | `8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab` |
| Comparison rule | `exact immutable-manifest SHA-256 checksum` |
| Normalization | `adr-0024-migration-record-normalization/v1` |

The safe structured report contained no lifecycle failure. It evaluates the
ordinary finished, rollback, applied-step and normalized-log fields in the same
pass, so checksum mismatch was the sole reported failure.

## Effects And Outputs

The Production connection opened, the first read-only transaction began, and
the fixed identity, ledger and catalog reads completed. The verifier stopped
before returning a complete evidence object. It did not start the second
capture or deterministic comparison and produced no evidence digest, schema
fingerprint result, complete normalized ledger or artifact.

No Production write, migration, resolution, deployment, promotion or alias
movement occurred. No repository file changed during R15. The attestation
remained pending, Production status did not run and PR #45 remained Draft.

The later repository-only
[R15 checksum investigation](PR_45_ADR_0024_R15_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
is separate from this operation record. It does not rewrite what R15 itself
proved or reopen the closed change.
