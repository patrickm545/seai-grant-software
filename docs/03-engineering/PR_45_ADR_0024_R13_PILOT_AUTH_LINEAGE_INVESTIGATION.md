# PR #45 ADR-0024 R13 Pilot Authentication Lineage Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R13-PILOT-AUTH-LINEAGE |
| Status | Complete; lifecycle L1; governance decision pending |
| Owner | Patrick McKenna |
| Review cycle | Before any fourth historical-state decision |
| Last reviewed | 2026-08-10 |

## Local Worktree Boundary

The reported `pnpm-workspace.yaml` edit was not present when this investigation
started. The path was absent from both the PR #45 worktree and primary
checkout, and Git reported no tracked, staged or untracked state for it. There
was therefore no file hash or diff to retain. This investigation did not
create, modify, stage or commit that path. The unrelated July 23 incident edit
in the primary checkout also remained untouched and excluded.

## Finding

The zero-step state is authoritatively explained by the original retained
operation artifact. On July 17, a separately authorised repair:

1. prepared and reviewed a transactional repair rather than applying the
   original migration file unchanged;
2. rehearsed its 23 statements on a disposable Neon branch;
3. verified the expected schema and tenancy invariants there;
4. preflighted Production and found the pilot authentication schema and
   migration record absent;
5. executed the reviewed Production transaction and verified the expected
   schema, approved membership and preserved lead count; and
6. ran exactly
   `npx prisma migrate resolve --applied 20260716183000_pilot_installer_auth --schema prisma/schema.prisma`
   from the Windows checkout, then verified the finished, not-rolled-back,
   zero-step ledger record.

The reviewed repair differed from the original migration because the original
legacy-membership deletion could not be replayed safely against the observed
state. It established the intended schema plus the exact authorised membership
repair, prohibited broad data deletion, and was rehearsed before the
transactional Production operation.

The authoritative source is the retained local session
`local-codex-session/2026-07-17/rollout-2026-07-17T12-49-52-019f6fe9-4a16-7812-b729-cad26dcbaddd.jsonl`,
7,163,012 bytes, SHA-256
`779cdd18bfca9a6a60c0dd764551c2f56b693913b5275b544a5d15e3a13422de`.
It remains outside Git because the raw operation context may be secret-bearing.
The committed evidence records hashes of the individual authorization,
rehearsal, preflight, repair, verification, resolve and ledger-verification
events without copying raw secrets or customer data.

## Prisma Explanation

`prisma migrate resolve --applied` marks a migration as applied without
executing its migration SQL. Prisma's migration persistence creates a finished
history entry for that operation but does not record the successful execution
step used by an ordinary deploy. This explains `applied_steps_count = 0` and
does not redefine it as a normal successful migration. See the official
[resolve reference](https://docs.prisma.io/docs/cli/migrate/resolve),
[patching and hotfixing workflow](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing),
and [migration persistence source](https://prisma.github.io/prisma-engines/doc/src/sql_schema_connector/sql_migration_persistence.rs.html).

The observed checksum is independently explained: the resolve command read
the CRLF working-tree bytes whose exact SHA-256 is the R13 observed checksum.
The original migration is non-empty; this was not a no-op, duplicate migration
or recovered failed-record workflow.

This is lifecycle classification **L1: zero-step completed state
authoritatively explained and safe as a historical operation**. "Safe" here
describes the recovered, authorised history. It is not verifier acceptance and
is not permission to infer current Production schema state.

## Required Future Schema Proof

Ledger evidence alone is insufficient. A future separately authorised,
read-only catalog capture must prove these exact base objects:

- `Organisation.slug` as non-null text and `Organisation.verified` as non-null
  boolean with default `false`;
- `User.passwordHash` as nullable text and `User.lastLoginAt` as nullable
  timestamp with millisecond precision;
- the `AuthSession` table with exact `id`, `userId`, `tokenHash`, `expiresAt`
  and `createdAt` types, nullability and default;
- `AuthSession_pkey`, `User_email_normalised_check`, and the cascading
  `AuthSession_userId_fkey`;
- unique indexes `Organisation_slug_key`,
  `OrganisationMembership_userId_key` and `AuthSession_tokenHash_key`;
- `AuthSession_userId_expiresAt_idx` and `AuthSession_expiresAt_idx`; and
- the later `AuthSession.sessionType` evolution without losing or changing the
  base objects, plus absence of unsupported or unexpected objects.

Exact ledger `started_at` and `finished_at` values must also be captured. R13
proved only that a valid finished timestamp was present; it did not emit the
exact timestamps.

## Governance Decision

The history supports A + L1, but current evidence is **not sufficient for a
fourth verifier tuple**. ADR-0024 currently models ordinary one-step success
and three exact one-step checksum divergences. A zero-step state needs a new,
separately reviewed ADR decision and a distinct structure such as
`attestedHistoricalMigrationState`. It must never broaden ordinary success,
and Preview, Development, test and fresh databases must remain canonical-only.

Any later proposal must pin the Production fingerprint, migration and record
ID, both checksums, zero applied steps, exact timestamps, rollback and log
state, manifest and lineage baseline, both evidence digests, current exact
catalog proof and attestation lifecycle. Until that decision is approved and
the missing evidence is captured, the current verifier correctly fails closed.

The lifecycle evidence file is
`docs/03-engineering/evidence/ADR_0024_R13_ZERO_STEP_LIFECYCLE_INVESTIGATION.json`,
SHA-256
`5f1f11c00fca0df3a0d97cbc1b93b0e333dd65cf2e1ba217c04d334a1352ee4a`.
No migration, manifest, verifier or attestation-schema file changed.
