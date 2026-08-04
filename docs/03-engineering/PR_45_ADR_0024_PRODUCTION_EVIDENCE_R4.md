# PR #45 ADR-0024 Production Evidence R4

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R4-2026-08-04 |
| Status | Closed; safe timestamp mismatch identified, no accepted evidence |
| Change ID | `CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4` |
| Approved repository head | `31d5a73cb820d12e0a8904c06244dfa443865126` |
| Start | 2026-08-04 15:32:27.571 Europe/Dublin / 14:32:27.571 UTC |
| Stop | 2026-08-04 15:34:13.059 Europe/Dublin / 14:34:13.059 UTC |
| Classification | `LEDGER_MISMATCH` |
| Repository typed exit | `25` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |
| Boundary reference | `ADR0024/CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4/operation-boundary.json` |
| Boundary SHA-256 | `b59168be39582cc8854214b5ccc2a9ace6dcb1ced0a23813955485649b9c5196` |

## Preconditions

Immediately before access, the repository was clean on the exact approved
branch and head. PR #45 was Draft and the exact-head GitHub Validate and
Vercel Preview checks had passed. The ignored local `DATABASE_URL` was
available without being printed. The fixed attestation remained `pending`
with zero captures and zero approvals. All earlier change IDs remained closed.

Neon showed project `seai-grant-db`, branch `main`, branch ID
`br-cool-wave-abysq3lu`, a six-hour history window with earliest restorable
time 2026-08-04 09:26 Europe/Dublin, no active-query rows and no in-progress
system operation. Recent system operations were complete with status `OK`.

Vercel reported zero running Production deployments and no deployment
promotion in progress. Both Production aliases remained mapped to existing
Ready deployment `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`. No provider mutation
was performed.

The repository-controlled non-connecting identity guard resolved exactly:

- environment `production`;
- database `neondb`;
- branch ID `br-cool-wave-abysq3lu`;
- fingerprint `db_4e1d3bd23cff6801`;
- governance mode `pilot-stage-compensating-control`;
- operator Patrick McKenna; and
- change ID `CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4`.

## Single Invocation Result

The fixed no-argument Windows launcher was invoked exactly once. The first
Production connection opened, the first repeatable-read transaction began,
`SET TRANSACTION READ ONLY` succeeded, and the fixed connected-identity,
migration-ledger and catalog reads completed. Evidence generation then stopped
on the exact database-only migration record comparison.

The repository diagnostic classified the result as `LEDGER_MISMATCH`, whose
fixed typed exit is `25`. The orchestration boundary displayed exit `1` after
normalizing the non-zero native process result; it did not change the
repository classification or typed-exit mapping. The complete secret-free
diagnostic was retained outside Git.

## Safe Mismatch Report

Migration identity:
`20260423093000_application_pack_admin_fields`.

Normalization version:
`adr-0024-migration-record-normalization/v1`.

Report version: `adr-0024-migration-record-mismatch/v1`.

| Field | Expected typed safe value | Observed typed safe value | Comparison rule |
| --- | --- | --- | --- |
| `startedAt` | string `2026-04-23T07:04:10.395Z` | string `2026-04-23T07:04:10.39554Z` | Exact canonical UTC ISO-8601 value with significant fractional precision; null and absent are distinct |
| `finishedAt` | string `2026-04-23T07:04:10.527Z` | string `2026-04-23T07:04:10.527739Z` | Exact canonical UTC ISO-8601 value with significant fractional precision; null and absent are distinct |

No other normalized field was reported as different. R4 establishes only
that these exact normalized values differ. It does not establish which value
is correct and provides no authority to edit an expected or observed value.

## Stop Boundary

The second transaction did not start. No complete evidence object or
deterministic comparison was produced. No raw logs, URL, credentials, SQL,
stack trace or customer data were retained.

The attestation remained unchanged and pending. Production status was not run.
No Production write, migration lock, migration, deployment or alias movement
occurred. The capture was not retried. R4 is permanently closed and its change
ID must not be reused.

## Post-Operation Validation

Validation used fresh non-Production shells and did not rerun Production
capture or status:

| Check | Result |
| --- | --- |
| ESLint | Pass |
| TypeScript | Pass |
| Unit, platform and security tests | Pass, 307 tests |
| Disposable local PostgreSQL integration tests | Pass, 68 tests; database removed |
| Prisma schema validation | Pass |
| Production build without deployment | Pass with localhost-only placeholder identity |
| Migration manifest | Pass; approved hash unchanged |
| Immutable migration history | Pass; 16 migrations against `origin/main` |
| Pending attestation validation | Pass with expected inactive exit `21` |
| Markdown, internal links, metadata, secret scan and `git diff --check` | Pass |

The post-operation change set contains this R4 record and the link/summary in
the existing operation record only. Migration files, the manifest and the
pending attestation remain unchanged.
