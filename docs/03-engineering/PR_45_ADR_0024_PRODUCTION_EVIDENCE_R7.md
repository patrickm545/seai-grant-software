# PR #45 ADR-0024 Production Evidence R7

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R7-2026-08-05 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before any later ADR-0024 Production evidence operation |
| Last reviewed | 2026-08-05 |
| Operation status | Closed; failed-record timestamp precision mismatch identified |
| Change ID | `CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R7` |
| Approved repository head | `613363693f897e9666279c06e3a66c2713bc2af6` |
| Start | 2026-08-05 11:37:08.919 Europe/Dublin / 10:37:08.919 UTC |
| Stop | 2026-08-05 11:39:31.348 Europe/Dublin / 10:39:31.348 UTC |
| Classification | `LEDGER_MISMATCH` |
| Repository typed exit | `25` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |

## Verified Operation Boundary

The exact approved branch and head, clean worktree, Draft PR, GitHub Validate,
Vercel Preview, ignored Production configuration, direct launcher smoke,
pending attestation and recovery controls were verified before access. The
repository identity guard proved database `neondb`, branch
`br-cool-wave-abysq3lu` and fingerprint `db_4e1d3bd23cff6801` without printing
the connection string or secret-bearing host.

The fixed direct Node launcher was invoked exactly once. The first Production
connection opened, its repeatable-read transaction began, `SET TRANSACTION
READ ONLY` succeeded, and the fixed identity, migration-ledger and catalog
reads completed. Evidence generation then failed closed. The second
transaction did not start, no complete evidence object or deterministic digest
was emitted, and no artifact was created.

No Production write, migration lock, migration, deployment or alias movement
occurred. Production status was not run. R7 was not retried and is permanently
closed.

## Safe Mismatch Evidence

Migration identity:
`20260428120000_manual_submission_prep`.

Normalization version:
`adr-0024-migration-record-normalization/v1`.

Comparison rule: exact canonical UTC ISO-8601 value with significant
fractional precision; null and absent are distinct.

| Field | Earlier pending value | R7 canonical observed value |
| --- | --- | --- |
| `startedAt` | `2026-04-29T06:01:05.497Z` | `2026-04-29T06:01:05.497406Z` |
| `rolledBackAt` | `2026-04-29T06:01:38.423Z` | `2026-04-29T06:01:38.423504Z` |

No other field was reported as mismatching. Earlier records used
millisecond-truncated timestamps. R7 established the exact canonical
microsecond values through the fixed read-only verifier.

## Repository-Only Accuracy Amendment

The pending attestation and current governing documentation now preserve the
two R7 values exactly. The comparison and timestamp-validation rules are
unchanged: comparison remains exact and fail-closed, normalization remains
string-only, significant microseconds are retained, and JavaScript `Date`
conversion is not used for migration timestamps.

The database-only migration record, related completed zero-step record,
manifest, migration history, schema fields, governance and lifecycle remain
unchanged. The attestation remains `pending` with zero captures and zero
approvals. This amendment did not connect to Production and supplies no
authority to retry R7. Another complete capture requires a new change ID and
separate authorization.

## Amendment Validation

Validation ran without loading Production configuration:

| Check | Result |
| --- | --- |
| Focused timestamp, ledger and attestation tests | Pass, 25 tests |
| ESLint | Pass |
| TypeScript | Pass |
| Unit, platform and security tests | Pass, 318 tests |
| Disposable local PostgreSQL integration tests | Pass, 68 tests; database removed |
| Prisma schema validation | Pass |
| Production build without deployment | Pass with localhost-only placeholder identity |
| Migration manifest | Pass; approved hash unchanged |
| Immutable migration history | Pass; 16 migrations against `origin/main` |
| Pending attestation validation | Pass with expected inactive exit `21` |

Markdown, internal links, metadata, added-content secret scanning and
`git diff --check` also passed. No Production command, connection, migration,
deployment or alias operation ran during the amendment.
