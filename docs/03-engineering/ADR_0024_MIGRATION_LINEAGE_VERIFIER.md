# ADR-0024 Migration Lineage Verifier

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-MIGRATION-LINEAGE-VERIFIER-001 |
| Status | Implemented; Production attestation inactive pending separate evidence and approval |
| Owner | Clada Systems Engineering |
| Review cycle | Before every Production database release and after migration or Prisma tooling changes |
| Last reviewed | 2026-07-28 |

## Purpose And Boundary

The verifier implements the repository-controlled, single-incident path required
by [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md).
It independently verifies repository migration inventory, connected database
identity, migration-ledger state, supported catalog state, named assertions and
attestation lifecycle. It never edits `_prisma_migrations`, schema or
application data.

The checked-in attestation is `pending`. Unknown related-record IDs, the exact
failed-log digest, independently generated Production schema fingerprints and
human approvals are deliberately not invented. Active validation rejects those
missing values. The implementation therefore does not yet establish the status
`Production lineage accepted under ADR-0024 attestation`.

Production remains on `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`.
`20260724180000_password_reset_foundation` remains pending. Merging this
implementation must not apply it, move the Production alias or start
password-reset request-flow work.

## Repository Artifacts

| Artifact | Purpose |
| --- | --- |
| `prisma/migration-manifest.json` | Approved ordered inventory of all 16 committed migrations. |
| `prisma/lineage-attestations/adr-0024-production.json` | Fixed-path versioned single-incident attestation. |
| `lib/migration-manifest.ts` | Deterministic inventory and manifest hash. |
| `lib/lineage-attestation.ts` | Exact lifecycle, identity and approval validation. |
| `lib/migration-ledger.ts` | Exact ledger normalization and comparison. |
| `lib/schema-fingerprint.ts` | Versioned catalog canonicalization, fingerprint and named assertions. |
| `lib/postgres-catalog.ts` | Fixed read-only PostgreSQL catalog queries. |
| `lib/lineage-verifier.ts` | Modes, decisions, evidence and exit mapping. |
| `scripts/verify-migration-lineage.ts` | Fixed command boundary and read-only transaction. |

No command accepts an attestation or manifest path. This prevents an operator
or build input from substituting a different exception.

## Commands

```text
pnpm db:manifest:verify
pnpm db:manifest:generate
pnpm db:history:verify-base
pnpm db:attestation:verify
pnpm db:status
pnpm db:migrate:preview
pnpm db:migrate:production
```

`db:manifest:generate` prints a proposed manifest to standard output. It never
rewrites the approved file. A deliberate update requires the migration to be
committed or staged, review of the complete JSON diff, and a separate
`db:manifest:verify`.

`db:history:verify-base` compares every migration present on `origin/main`
against the staged raw Git blob and rejects deletion, rename or byte change.
CI fetches full history and runs both inventory checks before linting.

`db:attestation:verify` returns exit `21` for the checked-in pending
attestation. That is the expected implementation-stage result.

Schema evidence is generated with a fixed profile:

```text
pnpm db:lineage:verify schema-fingerprint pre-password-reset
pnpm db:lineage:verify schema-fingerprint post-password-reset
pnpm db:lineage:verify schema-fingerprint fresh-head
```

The command uses the normal database identity guard and a repeatable-read,
read-only transaction. Production use is a separately approved read-only
reconciliation action; it is not part of this implementation PR.

## Migration Manifest Algorithm

Manifest version `clada-migration-manifest/v1`:

1. enumerate only directories immediately below `prisma/migrations`;
2. require names matching an exact 14-digit timestamp and lower-case
   underscore-separated description;
3. sort names ordinally and assign zero-based positions;
4. require exactly the expected `migration.sql` and reject additional
   executable files;
5. use repository-relative POSIX paths;
6. read the raw committed Git blob bytes, require LF bytes, and calculate
   SHA-256 without decoding or newline conversion;
7. canonicalize the manifest body by recursively sorting JSON object keys; and
8. calculate the manifest SHA-256 over its UTF-8 canonical JSON.

`.gitattributes` pins migration SQL to LF. The algorithm is identical on
Windows and Linux and rejects uncommitted modification before inventory.

## Database And Ledger Identity

The existing database safety guard derives the approved non-secret fingerprint
from normalized host, port and database name in the secret URL before
connection. It binds that value to `APP_ENV`, `DATABASE_ENVIRONMENT`,
`DATABASE_FINGERPRINT` and the positive
`PRODUCTION_DATABASE_FINGERPRINT`. The verifier then queries
`current_database()` inside the guarded connection and requires it to match the
parsed database name. An environment label alone cannot activate acceptance.

The ledger query returns only Prisma migration metadata. Timestamps are
normalized to exact UTC ISO values without discarding significant
microseconds; step counts must be safe
non-negative integers. Empty logs normalize to `none`; non-empty logs are not
emitted and normalize only to a SHA-256 digest. Comparison pins ID, name,
checksum, start/finish, step count, rollback and log state. It rejects every
additional, missing, duplicate, failed, unfinished, changed or ambiguous row.

The only special states available to an active attestation are the exact
database-only record and exact two-record
`20260428120000_manual_submission_prep` state. There is no ignore list, regular
expression exception or name-only match.

## Schema Fingerprint

Version `clada-postgres-schema-fingerprint/v2` canonicalizes the `public`
namespace, tables, ordered columns, PostgreSQL and information-schema types,
nullability, defaults, identity/generated expressions, primary/foreign/unique/
check constraints, indexes, enums, installed extensions, non-internal
triggers, sequences and unsupported relation kinds. Every query is explicitly
sorted and canonical JSON is sorted again before SHA-256.

Excluded unstable values are object OIDs, owners/ACLs, creation times, planner
statistics, physical storage/tablespace details and
`public._prisma_migrations`. The migration table is excluded from schema
fingerprinting because the ledger verifier checks it separately and exactly.
Changing these semantics requires a new explicit algorithm version.

Index evidence includes ordered key-column names, separately ordered included
columns, expression and predicate state, uniqueness, primary status and
constraint linkage. `pg_get_indexdef` remains fingerprint evidence but is not
parsed to make named-assertion decisions.

Named assertions version `adr-0024-catalog-assertions/v2` proves the four
nullable, default-free `Lead` columns have the exact PostgreSQL types and no
dedicated index or constraint. Any ordinary single-key-column index is
rejected, including unique, partial and constraint-backed forms. A
multi-column index is retained in the whole-schema fingerprint but is not
misclassified as dedicated. Expression-only keys are represented by a null
ordinary-column slot plus their catalog expression, and INCLUDE-only
occurrences remain separate from keys; neither is silently treated as a
dedicated ordinary-column index. The assertions also prove
`PasswordResetRequest` is absent for preflight and present for
postflight/fresh head.

## Modes

| Mode | Behaviour |
| --- | --- |
| `strict-status` | Preview, Development or test repository-only lineage; pending migrations block status. |
| `strict-preflight` / `strict-postflight` | Independent checks around guarded non-Production deploy; no attestation accepted. |
| `production-status` | Exact active attestation, identity, inventory, ledger and pre-migration schema; pending repository migration returns the expected blocked decision. |
| `production-preflight` | Same verification plus exact attestation ID, existing acknowledgement/change ID, restore-point confirmation and only the approved pending password-reset migration. |
| `production-postflight` | Exact historical state retained, password-reset migration applied exactly once, no pending/failed row and approved post-migration schema. |

Production builds remain status-only. Only the existing
`db:migrate:production` wrapper can call Prisma deploy, and it now runs the
independent verifier before and after Prisma. Preview, Development and test
receive no lineage exception.

## Exit Codes

| Exit | Meaning |
| --- | --- |
| `0` | Verified clean. |
| `20` | Verified lineage but repository migration pending; status/deployment blocked. |
| `21` | Attestation inactive, pending, withdrawn or retired. |
| `22` | Attestation expired. |
| `23` | Database or environment identity mismatch. |
| `24` | Repository inventory or manifest mismatch. |
| `25` | Migration-ledger mismatch. |
| `26` | Schema fingerprint or named assertion mismatch. |
| `27` | Unsafe or incomplete configuration/attestation. |
| `70` | Internal verifier/query failure. |

Every non-zero outcome is fail closed. Only `production-status` recognizes
exit `20` as the expected `verified-pending-blocked` decision, logs that no
migration was applied, and immediately terminates the status/build operation
with the original exit code. Strict modes, Production preflight and Production
postflight accept only exit `0`. The guarded deploy never treats exit `20` or
any verifier failure as permission to continue.

## Preview Drift Record

Automatic Preview deployment `dpl_3UQs1dFpJrXnHiTugjjs1N7fvSho` reached the
strict verifier and stopped with exit `25` because the existing Preview ledger
record for `20260710120000_identity_organisation_foundation` does not match the
approved raw-byte checksum. The verifier stopped before Prisma deploy, so no
migration was applied. PR #43 does not repair, attest or bypass this Preview
state; a separate investigation must determine its provenance and remediation.

## Evidence And Redaction

Evidence version `adr-0024-verifier-evidence/v1` contains verifier/mode,
environment, safe database fingerprint, repository revision, manifest hash,
migration counts, pending names, attested and duplicate-state results, schema
version/fingerprint, named assertions, lifecycle, final decision, UTC timestamp
and change ID when required.

It contains no URL, credentials, password, token, cookie, customer data, raw
application rows, raw migration log or arbitrary SQL. A recursive secret-key
and URL guard checks the evidence before output. Unexpected errors emit a
stable safe category rather than raw driver text.

## Activation And Retirement

Activation is a separate reviewed repository change after the read-only
reconciliation evidence exists. It must:

1. insert exact related record IDs and exact failed-log digest;
2. insert independently reproduced pre/post/fresh schema fingerprints;
3. record four genuine named approvals, exact scope, required
   acknowledgements, conditions and repository evidence references;
4. change status to `active`, set review time and retain expiry within 90 days;
5. verify the manifest hash and exact Production fingerprint;
6. pass all negative/disposable tests; and
7. receive separate approval before any Production migration execution.

Do not fabricate values to make validation pass. Withdraw or retire immediately
on any ADR-0024 retirement condition. Expiry, withdrawal and retirement block
both Production deployment and migration.

## Failure Handling

Preserve secret-free JSON and the exit code. Do not retry an ambiguous
preflight, run raw Prisma deploy, resolve a migration, push schema, edit the
ledger, apply manual SQL or bypass the gate. Follow the migration-history
incident runbook with the incident owner and independent reviewer.

## PR #44 Evidence-Capture Tooling Preparation

PR #44 prepares the fixed
`pnpm db:lineage:capture-production-evidence` command because the pending
attestation correctly blocks `production-status` before a database read and
the schema-only command does not retain exact normalized ledger records.

The capture command remains fail closed. It requires the exact Production
identity, a named operator, a distinct independent reviewer, an approved
read-only change ID and a restore-point evidence reference. It uses the same
fixed queries and read-only repeatable-read transactions, emits log digests
without raw logs, produces a deterministic evidence digest and stops when its
two internal captures differ.

Active validation rejects placeholder reviewer/evidence values, missing or
duplicate roles, unindexed or missing repository evidence, altered approval
scope/acknowledgements, approval timestamps outside the lifecycle and a
database reliability reviewer who is not independent from the Production
owner.

The [PR #44 preparation record](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md)
defines the retention boundary, disposable fingerprints and outstanding
Production gates. PR #44 performs no Production query and captures no live
evidence. The attestation remains pending; activation belongs to a separate
operational PR.
