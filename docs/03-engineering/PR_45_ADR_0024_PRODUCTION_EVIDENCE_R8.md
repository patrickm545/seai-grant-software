# PR #45 ADR-0024 Production Evidence R8

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R8-2026-08-05 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before any later ADR-0024 Production evidence operation |
| Last reviewed | 2026-08-05 |
| Operation status | Closed; completed zero-step timestamp precision mismatch identified |
| Change ID | `CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R8` |
| Approved repository head | `d3cbb5b76fc4d2608d4efbd486b77466f1457aaa` |
| Start | 2026-08-05 11:58:05.250 Europe/Dublin / 10:58:05.250 UTC |
| Stop | 2026-08-05 11:59:11.695 Europe/Dublin / 10:59:11.695 UTC |
| Classification | `LEDGER_MISMATCH` |
| Repository typed exit | `25` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |

## Verified Operation Boundary

The exact approved branch and head, clean worktree, Draft PR, GitHub Validate,
Vercel Preview, ignored Production configuration, direct launcher smoke,
pending attestation and recovery controls were verified before access. The
repository identity guard proved database `neondb`, branch
`br-cool-wave-abysq3lu` and fingerprint `db_4e1d3bd23cff6801`.

The fixed direct Node launcher was invoked exactly once. The first Production
connection opened, its repeatable-read transaction began and completed, `SET
TRANSACTION READ ONLY` succeeded, and the fixed identity, migration-ledger and
catalog reads completed. Evidence generation then failed closed. The second
transaction did not start, no complete evidence object or deterministic digest
was emitted, and no artifact was created.

No Production write, migration lock, migration, deployment or alias movement
occurred. Production status was not run. R8 was not retried and is permanently
closed.

## Safe Mismatch Evidence

Migration identity: `20260428120000_manual_submission_prep`.

Record classification: completed zero-step record, not the failed record.

Normalization version:
`adr-0024-migration-record-normalization/v1`.

Comparison rule: exact canonical UTC ISO-8601 value with significant
fractional precision; null and absent are distinct.

| Field | Earlier pending value | R8 canonical observed value |
| --- | --- | --- |
| `startedAt` | `2026-04-29T06:01:38.543Z` | `2026-04-29T06:01:38.54346Z` |
| `finishedAt` | `2026-04-29T06:01:38.543Z` | `2026-04-29T06:01:38.54346Z` |

No other field was reported as mismatching. Earlier records used
millisecond-truncated timestamps. R8 established the exact canonical
microsecond values through the fixed read-only verifier.

## Repository-Only Accuracy Amendment

The pending attestation and current governing documentation now preserve the
two R8 values exactly. Comparison remains exact and fail-closed; timestamp
validation remains string-only and preserves significant fractional precision
without JavaScript `Date` conversion.

The failed related record, database-only migration record, manifest, migration
history, schema fields, governance and lifecycle are unchanged. The
attestation remains `pending` with zero captures and zero approvals. This
amendment did not connect to Production and supplies no authority to retry R8.
Another complete capture requires a new change ID and separate authorization.

## Amendment Validation

Validation ran without loading Production configuration:

| Check | Result |
| --- | --- |
| Focused timestamp, ledger, attestation and evidence tests | Pass, 37 tests |
| ESLint | Pass |
| TypeScript | Pass |
| Unit, platform and security tests | Pass, 319 tests |
| Disposable local PostgreSQL integration tests | Pass, 68 tests; database removed |
| Prisma schema validation | Pass |
| Production build without deployment | Pass with localhost-only placeholder identity |
| Migration manifest | Pass; approved hash unchanged |
| Immutable migration history | Pass; 16 migrations against `origin/main` |
| Pending attestation validation | Pass with expected inactive exit `21` |

Markdown lint, internal links, metadata, added-content secret scanning and
`git diff --check` also passed. No Production command, connection, migration,
deployment or alias operation ran during the amendment.
