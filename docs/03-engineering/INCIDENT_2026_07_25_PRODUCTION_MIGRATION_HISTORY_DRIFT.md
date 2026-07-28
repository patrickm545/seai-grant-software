# Incident 2026-07-25 - Production Migration-History Drift

| Field | Value |
| --- | --- |
| Document ID | ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT |
| Status | Contained; remediation approval and execution pending |
| Owner | Clada Systems Engineering |
| Review cycle | Before every ADR-0024 evidence, activation or execution change |
| Severity | High - Production releases blocked |
| Incident owner | Clada Systems Engineering; Production execution owner Patrick |
| Incident date | 2026-07-25 |
| Discovery date | 2026-07-25 |
| Affected merge | PR #41, merge commit `a4bd4e2c184c745520a1484fcfbe94595ef58b3f` |
| Blocked deployment | `dpl_HGdsWDXmfnNYFSyaomEmjDcAnXPZ` |
| Previous Ready deployment | `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` |
| Related decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Last reviewed | 2026-07-28 |

## Summary

The Production migration safety gate blocked PR #41's post-merge deployment
because Production contains the applied migration
`20260423093000_application_pack_admin_fields`, but the current repository does
not contain that migration directory. The gate behaved correctly: it did not
accept a pending repository migration while migration history was divergent.

Production remains healthy on the previous Ready deployment. The new release
is not live. The password-reset foundation migration
`20260724180000_password_reset_foundation` remains pending and was not partially
applied. No data loss is known.

## Detection And Containment

The Vercel Production build selected the read-only Production migration-status
preflight. Prisma reported:

- 16 migrations committed in the repository;
- one Production migration absent from the repository; and
- the password-reset foundation migration still pending.

The build stopped before `next build` and before Production alias promotion.
Containment is therefore:

- previous Ready deployment continues serving Production;
- no further Production release may proceed until a separately approved repair
  passes the migration gate;
- the password-reset request-flow sequence is paused; and
- pilot rollout remains blocked.

## Missing Migration Record

| Field | Production value |
| --- | --- |
| Migration name | `20260423093000_application_pack_admin_fields` |
| ID | `2305f52e-af2f-4717-bc37-a6a88bc1ec33` |
| Checksum | `affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589` |
| Started | `2026-04-23T07:04:10.395Z` |
| Finished | `2026-04-23T07:04:10.527Z` |
| Applied steps | `1` |
| Rolled back | No |
| Error log | None |

The record proves that Prisma recorded a completed step. It does not prove the
content of the unavailable SQL or the process that submitted it.

## Associated Schema State

Read-only catalog inspection found these nullable columns on `Lead`:

| Column | PostgreSQL type | Nullable | Dedicated default, index, or constraint |
| --- | --- | --- | --- |
| `internalNotes` | `TEXT` | Yes | None identified |
| `followUpDate` | `TIMESTAMP(3)` | Yes | None identified |
| `assignedAdmin` | `TEXT` | Yes | None identified |
| `assignedInstaller` | `TEXT` | Yes | None identified |

The current Prisma schema represents all four columns and runtime code depends
on them. Their presence, the legacy migration name and the later duplicate
failure make them the associated objects with high confidence. They do not
prove the exact historical SQL, statement order, comments, transaction
boundaries, or whether the legacy migration performed additional operations.

## Duplicate Migration Behaviour

The committed migration
`20260428120000_manual_submission_prep` contains the same four intended column
additions. Its Git content checksum matches the checksum recorded for that
migration in Production, but not the missing migration checksum.

Production contains:

1. a failed April 29 attempt that stopped because `Lead.internalNotes` already
   existed;
2. a rolled-back ledger status for that failed attempt; and
3. a later completed record for the same committed migration with zero applied
   steps.

This explains why fresh databases can reproduce the current intended schema
from repository history while Production has a different lineage for the four
columns. It does not establish who applied or resolved either historical
operation.

## Investigation Performed

The read-only investigation reviewed:

- all reachable commits, branches, tags, release refs and fetched pull-request
  refs;
- full migration-directory history, renames, deletions and commit patches;
- reflogs, surviving stashes and unreachable Git objects;
- workspace and Codex session history;
- GitHub workflows and available deployment evidence;
- Vercel Production deployment history;
- Production `_prisma_migrations` metadata in a read-only transaction;
- Production catalog metadata for the associated `Lead` fields;
- the current Prisma schema and all 16 repository migrations; and
- generated SQL variants for the inferred four-column operation.

The April 23 local stash mentioned in session history no longer exists, has no
stash reflog and was not recoverable from unreachable objects. Older deployment
source bundles were unavailable.

## Evidence Not Recovered

The investigation did not recover:

- the exact historical `migration.sql`;
- any artifact with checksum
  `affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589`;
- the applying command, operator, repository commit or deployment artifact; or
- proof that the migration performed only the four associated column changes.

In total, 21,168 generated and permutation-tested SQL candidates failed to
match the recorded checksum. Reconstructed schema equivalence must not be
presented as historical SQL identity.

## Root-Cause Classification

Classification remains **G - Unknown**.

The evidence is most consistent with **C - Manual or uncommitted migration**,
but that hypothesis is not proven. Confidence is:

- high for the Production record, current catalog state, duplicate-migration
  behaviour and release containment;
- medium that the missing migration was generated or applied from uncommitted
  local state; and
- insufficient to identify the exact SQL or applying process.

## Impact And Risk

| Area | Assessment |
| --- | --- |
| Production health | Healthy on the previous Ready deployment |
| New release | Blocked and not live |
| Password-reset schema | Pending; no partial application |
| Current data | No known loss or mutation from this incident |
| Runtime dependency | Current code depends on the associated `Lead` columns |
| Deployment | All further Production promotion is blocked pending attestation implementation and approval |
| Auditability | Historical SQL identity and applying provenance are permanently uncertain unless an authoritative artifact is recovered |
| Fresh databases | Reproducible from current committed migrations |

The main risk is not current schema availability. It is loss of trustworthy
lineage: an ordinary Prisma status check cannot reconcile the repository and
Production histories, and Prisma deploy does not independently detect every
missing applied migration.

## Current Safety Position

The approved direction is documented in ADR-0024. It preserves the existing
Production record and requires a future, separately reviewed implementation of
an exact lineage attestation and attestation-aware gate. Artifact recovery
continues in parallel. No Production operation is authorised by this incident
record alone.

### Retained historical divergence

The historical migration ledger remains divergent after attestation. The
missing historical SQL remains unknown, the existing Production migration
record remains untouched and no repository migration will pretend to be the
original. ADR-0024 does not restore historical equivalence.

If the separately approved implementation succeeds, record the status only as:

> **Production lineage accepted under ADR-0024 attestation.**

Do not record history repaired, migration history restored, drift eliminated,
ledger normalised or historical migration recovered. The attestation is valid
only for the exact Production identity, missing-migration record,
duplicate-migration state, repository inventory, schema fingerprint and
approved baseline defined in ADR-0024. Every other divergence fails closed.

This incident creates no precedent for ignore lists, wildcards, name-only or
checksum-free exclusions, automatic acceptance of unknown migrations, or
future incident handling without a new investigation and approval.

## Actions Explicitly Not Taken

- No Production schema or data change.
- No `_prisma_migrations` change.
- No migration file added, edited, restored or fabricated.
- No `prisma migrate resolve`, `prisma db push`, reset, seed or manual SQL.
- No migration-gate bypass or ignore list.
- No Production deployment, redeployment, alias promotion or rollback.
- No pending password-reset migration application.
- No password-reset request-flow implementation.
- No secret or credential exposure.

## PR #43 Verifier Implementation

The repository now has the fail-closed ADR-0024 verifier implementation and
deterministic 16-migration manifest. The checked-in Production attestation is
pending and cannot be activated by environment input. Exact remaining
Production evidence and genuine CTO, database reliability, security and
Production-owner approvals require a separate reviewed activation.

This implementation did not query or mutate Production, apply the password
reset migration, initiate a deployment or move an alias. Production remains on
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`; the latest safely blocked deployment remains
`dpl_2qGpjKQrGCCHRJazwRR1X8nNiDRD`. The implementation does not yet authorise
the status **Production lineage accepted under ADR-0024 attestation**.

## PR #44 Evidence-Capture State

PR #44 records deterministic disposable fresh-head and post-password-reset
fingerprints and adds a fixed read-only command for the exact Production ledger
evidence that cannot be captured while `production-status` is correctly blocked
by the pending attestation.

Production was not queried because genuine operator/reviewer, change and
restore-point preconditions are incomplete. The attestation remains pending,
the incident remains open, the password-reset migration remains unapplied in
Production and the only live status remains the contained safety state.

## Related Documents

- [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md)
- [Migration History Reconciliation Runbook](MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md)
- [ADR-0024 Migration Lineage Verifier](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md)
- [Database Operations Runbook](DATABASE_OPERATIONS_RUNBOOK.md)
- [Database Environment Safety](DATABASE_ENVIRONMENT_SAFETY.md)
- [Production Authentication 503 Incident](INCIDENT_2026_07_23_PRODUCTION_AUTH_503.md)
- [Technical Debt Register](TECHNICAL_DEBT_REGISTER.md)
- [PR #44 Production Evidence And Activation Record](PR_44_ADR_0024_PRODUCTION_EVIDENCE.md)
