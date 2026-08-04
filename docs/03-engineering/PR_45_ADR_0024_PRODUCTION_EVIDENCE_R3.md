# PR #45 ADR-0024 Production Evidence R3

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R3-2026-08-04 |
| Status | Closed; typed ledger mismatch, no accepted evidence |
| Change ID | `CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R3` |
| Repository head | `829cadd3e0f72b916d65d7ef35465fa9fd377723` |
| Start | 2026-08-04 14:31:56.097 Europe/Dublin / 13:31:56.097 UTC |
| Stop | 2026-08-04 14:33:47.925 Europe/Dublin / 13:33:47.925 UTC |
| Result | `LEDGER_MISMATCH`, exit `25` |
| Stage | `first-evidence-generation` |
| Invariant | `first ledger, schema and identity evidence satisfies ADR-0024` |

## Closed Operation Result

R3 invoked the fixed launcher exactly once. The guarded Production identity,
first read-only repeatable-read transaction and fixed identity, ledger and
catalog reads completed. Evidence generation then rejected the attested
database-only migration with the safe diagnostic:

> Database-only migration metadata differs from the attestation.

This proves a real mismatch between the normalized observed record for
`20260423093000_application_pack_admin_fields` and the pending attestation. The
R3 implementation did not retain the differing field or values. No claim is
made about which field differed, and no attestation value may be changed by
inference.

The second transaction did not start. No complete evidence, deterministic
comparison or evidence digest was produced. The attestation remains pending,
Production status was not run and no Production write, migration, deployment
or alias movement occurred.

R3 is permanently closed and its change ID must not be reused. Another
Production attempt is prohibited until the secret-safe field diagnostic is
reviewed and approved under a separate authorization.

## Comparison Investigation

The comparison is implemented by `assertExactAttestedMigrationRecord()` in
`lib/migration-ledger.ts`. The original and amended implementation use
canonical JSON equality over the complete normalized observed record and the
complete attested record. Acceptance remains all-or-nothing.

Both objects contain exactly these approved fields:

| Field | Observed normalization | Comparison |
| --- | --- | --- |
| `id` | Ledger string | Exact string and presence |
| `migrationName` | Ledger string | Exact string and presence |
| `checksum` | Ledger string | Exact lowercase SHA-256 string and presence |
| `startedAt` | Canonical UTC timestamp | Exact canonical timestamp and presence |
| `finishedAt` | Canonical UTC timestamp or null | Exact value; null and absent differ |
| `appliedStepsCount` | Non-negative safe integer | Exact integer; zero and absent differ |
| `rolledBackAt` | Canonical UTC timestamp or null | Exact value; null and absent differ |
| `logsState` | `none` or `sha256` | Exact classification |
| `logsDigest` | Lowercase SHA-256 or null | Exact digest; raw logs excluded |

PostgreSQL timestamps are selected as UTC strings with six fractional digits.
Normalization accepts three to six digits, removes only insignificant trailing
zeros and retains at least millisecond precision. For example, `.395000Z` and
`.395Z` normalize identically, while `.395001Z` remains distinct. This is pure
string normalization and is deterministic on Windows and Linux. Timestamp
normalization did not change in this amendment.

Null, absent, empty string, zero and false remain distinct. UUID case and every
significant timestamp digit remain exact. Raw log bytes participate only by
their SHA-256 digest. No comparison field was removed, and no pending
attestation value was changed. Repository evidence does not establish that any
specific pending value is stale or incomplete.

## Diagnostic Amendment

After the unchanged canonical equality check fails, the verifier now emits
`adr-0024-migration-record-mismatch/v1`. It contains the migration identity,
normalization version and ordered mismatches. Each mismatch contains only the
approved field name, typed safe expected and observed values, and its fixed
comparison rule.

Malformed string values are reported as `redacted-invalid-format`. Raw logs,
URLs, credentials, hostnames, SQL, stack traces and unrelated environment data
are never included. The mismatch still returns exit `25`, emits no evidence
object and grants no permission to retry or alter Production.

## Repository Validation

The diagnostic amendment was validated without loading Production
configuration or invoking a Production command:

| Check | Result |
| --- | --- |
| Focused migration-record diagnostics | Pass, 23 tests |
| Complete unit, platform and security suite | Pass, 307 tests |
| Disposable local PostgreSQL integration suite | Pass, 68 tests; database removed after execution |
| ESLint | Pass |
| TypeScript | Pass |
| Prisma schema validation | Pass |
| Production build without deployment | Pass using a localhost-only placeholder identity |
| Migration manifest | Pass; approved hash unchanged |
| Immutable migration history | Pass; 16 migrations against `origin/main` |
| Pending attestation structural validation | Pass with expected inactive exit `21` |
| Markdown, links, metadata, secret scan and `git diff --check` | Pass |

The validation changed no migration, manifest or attestation file. It made no
Production connection and ran no Production evidence capture, guarded status,
migration, deployment or alias operation.
