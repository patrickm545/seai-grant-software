# Incident 2026-07-25 - Production Migration-History Drift

| Field | Value |
| --- | --- |
| Document ID | ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT |
| Status | Open; password-reset application reported, post-migration schema verification incomplete, attestation retired |
| Owner | Clada Systems Engineering |
| Review cycle | Before every ADR-0024 evidence, activation or execution change |
| Last reviewed | 2026-08-26 |
| Severity | High - Production releases blocked |
| Incident owner | Clada Systems Engineering; Production execution owner Patrick |
| Incident date | 2026-07-25 |
| Discovery date | 2026-07-25 |
| Affected merge | PR #41, merge commit `a4bd4e2c184c745520a1484fcfbe94595ef58b3f` |
| Blocked deployment | `dpl_HGdsWDXmfnNYFSyaomEmjDcAnXPZ` |
| Previous Ready deployment | `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` |
| Related decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |

## Summary

The Production migration safety gate blocked PR #41's post-merge deployment
because Production contains the applied migration
`20260423093000_application_pack_admin_fields`, but the current repository does
not contain that migration directory. The gate behaved correctly: it did not
accept a pending repository migration while migration history was divergent.

Production remains on the previous Ready deployment and the new release is not
live. Closed reconciliation R4 later invoked the password-reset foundation
migration exactly once, and Prisma reported successful application and commit.
Strict postflight stopped at schema fingerprint verification, so the resulting
Production schema and ledger state remain unverified. No retry is permitted and
no data loss is known.

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

These values record the initial millisecond-precision understanding. The
closed R4 read-only evidence record later established canonical normalized
timestamps `2026-04-23T07:04:10.39554Z` and
`2026-04-23T07:04:10.527739Z` under
`adr-0024-migration-record-normalization/v1`. That evidence-accuracy
clarification changes neither Production nor the incident's open status.

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

The closed R7 read-only verifier established the failed record's canonical
timestamps as `2026-04-29T06:01:05.497406Z` started and
`2026-04-29T06:01:38.423504Z` rolled back under
`adr-0024-migration-record-normalization/v1`. Earlier records used
millisecond-truncated values. This repository-only evidence correction did not
modify Production, accept lineage, activate the attestation or close the
incident.

The closed R8 read-only verifier established the completed zero-step record's
canonical `startedAt` and `finishedAt` as
`2026-04-29T06:01:38.54346Z` under the same normalization version. The earlier
governing value `2026-04-29T06:01:38.543Z` was millisecond-truncated. The R8
repository-only evidence correction likewise did not modify Production,
accept lineage, activate the attestation or close the incident.

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

## R10 Repository-Migration Checksum Divergence

The separately authorised and permanently closed R10 read-only operation
stopped with typed exit `25` because the otherwise exact-success Production
record `112c6124-f0c2-4b6b-8d02-f6ce835746e3` for
`20260710120000_identity_organisation_foundation` had checksum
`c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714`
instead of the immutable repository checksum
`fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3`.
R10 did not prove the cause and made no change.

The later repository-only
[checksum-divergence investigation](PR_45_ADR_0024_R10_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
proved classification A with high confidence. The observed checksum is the
exact committed 6,162-byte UTF-8/no-BOM SQL after its 134 LF bytes are
mechanically materialised as CRLF, producing 6,296 bytes. Reverse
normalisation is byte-for-byte exact, so the SQL semantic content is
unchanged. The same checksum and transformation were independently retained
in the Preview repair record, but Preview was rebuilt and receives no
exception.

The migration file and manifest remain canonical and unchanged. The exact R10
tuple is retained in the fixed attestation and every other environment,
migration or mismatch remains strict.

## R11 Repository-Migration Checksum Divergence

The separately authorised and permanently closed R11 read-only operation
stopped with typed exit `25` at the same fail-closed invariant. Record
`93c04529-1d5b-4350-af01-ef225b69b008` for
`20260710130000_users_roles_permissions_audit` carried checksum
`4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb`
instead of canonical checksum
`cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf`.
R11 did not establish the cause and made no change.

The later repository-only
[R11 investigation](PR_45_ADR_0024_R11_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
proved classification A with high confidence. Converting the exact committed
3,951-byte UTF-8/no-BOM SQL's 113 LF bytes to CRLF produces the exact
4,064-byte observed checksum, and reverse normalization is byte-for-byte exact.
No authoritative matching historical Git blob was recovered, so classification
B and exact historical process provenance are not claimed.

The two immutable migration files and manifest remain canonical and unchanged.
Attestation v4 pins the two independent exact Production tuples then known and
requires both; it does not allow a checksum pattern or global line-ending exception. The
attestation remains pending with zero captures and zero approvals. The incident
is not closed and any complete capture requires separate authorisation.

## R12 Repository-Migration Checksum Divergence

The separately authorised and permanently closed R12 read-only operation
reached and accepted the exact R10 and R11 tuples, then stopped with typed exit
`25` at the same fail-closed invariant. Record
`ce4489c9-fa9b-41e0-90fc-23a584e162da` for
`20260710140000_workflow_foundation` carried checksum
`fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8`
instead of canonical checksum
`7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d`.
R12 did not establish the cause and made no change.

The later repository-only
[R12 investigation](PR_45_ADR_0024_R12_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
proved classification A with high confidence. Converting the exact committed
12,927-byte UTF-8/no-BOM SQL's 263 LF bytes to CRLF produces the exact
13,190-byte observed checksum, and reverse normalization is byte-for-byte
exact. No authoritative matching historical Git blob was recovered, so
classification B and exact historical process provenance are not claimed.

All three immutable migration files and the manifest remain canonical and
unchanged. Attestation v4 pins three independent exact Production tuples and
requires all three; it does not allow a checksum pattern or global line-ending
exception. The attestation remains pending with zero captures and zero
approvals. The incident is not closed and any complete capture requires
separate authorisation.

## Impact And Risk

| Area | Assessment |
| --- | --- |
| Production health | Healthy on the previous Ready deployment |
| New release | Blocked and not live |
| Password-reset schema | Pending; no partial application |
| Current data | No known loss or mutation from this incident |
| Runtime dependency | Current code depends on the associated `Lead` columns |
| Deployment | All further Production promotion is blocked pending operational evidence, attestation activation and later execution approval |
| Auditability | Historical SQL identity and applying provenance are permanently uncertain unless an authoritative artifact is recovered |
| Fresh databases | Reproducible from current committed migrations |

The main risk is not current schema availability. It is loss of trustworthy
lineage: an ordinary Prisma status check cannot reconcile the repository and
Production histories, and Prisma deploy does not independently detect every
missing applied migration.

## Current Safety Position

The approved direction is documented in ADR-0024. The repository now contains
the exact fixed attestation, attestation-aware gate and evidence-capture
tooling. The attestation remains pending until a separately approved read-only
operation captures and reviews the exact Production evidence and records
genuine approvals. Artifact recovery continues in parallel. No Production
operation is authorised by this incident record alone.

### Retained historical divergence

The historical migration ledger remains divergent after attestation. The
missing historical SQL remains unknown, the existing Production migration
record remains untouched and no repository migration will pretend to be the
original. ADR-0024 does not restore historical equivalence.

Only after the separately approved attestation activation succeeds, record the
status as:

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
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`. The implementation does not yet authorise
the status **Production lineage accepted under ADR-0024 attestation**.

## PR #44 Tooling-Preparation State

PR #44 records deterministic disposable fresh-head and post-password-reset
fingerprints and prepares a fixed read-only command for a later, separately
approved Production evidence operation.

Production was not queried and no live evidence or approval was retained. The
attestation remains pending, the incident remains open, Preview lineage is
repaired and strict, the password-reset migration remains unapplied in
Production and the only live status remains the contained safety state.

## PR #45 Operational Readiness State

PR #45 remains Draft and before Production access. It now documents the
temporary pilot-stage compensating-control mode with Patrick McKenna as the
real human CEO, Production Owner, Production Operator, Recovery Owner and final
accountable approver. No independent human technical reviewer is currently
available; AI-assisted CTO review is a method, not a human approval. The
[operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
now provides the single resume package for change control, human roles,
restore safety, identity, two captures, deterministic comparison, accountable
review, activation and expected exit `20` status verification.

Repository preparation is complete. Operational evidence and activation remain
pending. Production migration execution and application deployment remain
later, separately approved stages.

## R13 Pilot Authentication Historical State

The permanently closed R13 read-only operation returned typed exit `25` after
the three approved checksum-divergence tuples passed. The next migration,
`20260716183000_pilot_installer_auth`, had a reversible CRLF checksum and a
finished, not-rolled-back record with zero applied steps. This is not ordinary
successful migration evidence and the verifier correctly stopped.

Repository-only investigation recovered the original July 17 operation
artifact. A reviewed repair was rehearsed, applied transactionally and
verified before `prisma migrate resolve --applied` recorded the migration from
the Windows checkout. That sequence authoritatively explains both the CRLF
checksum and zero-step lifecycle without changing the normal one-step rule.

The investigation does not accept Production lineage. ADR-0024 now defines
the distinct `attestedHistoricalResolvedMigration` state for the one exact
pilot-auth record, while ordinary successful migrations still require one
applied step and the then-current R10-R12 tuple structure remained unchanged.
This is a
repository governance model, not current Production evidence.

Exact current ledger timestamps and catalog equivalence remain unproven. The
attestation entry therefore retains null schema and timestamp fields, zero
captures and zero approvals. The now-closed R14 operation stopped before those
values were emitted. The incident remains open and Production remains blocked
pending a new separately authorised evidence operation and review.

## R14 Tenant-Provisioning Checksum Divergence

The permanently closed R14 read-only operation returned typed exit `25` at
`first-evidence-generation` for
`20260718130000_tenant_provisioning_data_model`. Exact record
`5eeca647-5429-4beb-873b-cff91ec58ddf` carried observed checksum
`2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805`
instead of canonical checksum
`a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7`.
R10-R12 and the separate pilot-auth historical ledger state passed before the
stop. No lifecycle failure was reported for tenant provisioning.

The later repository-only
[R14 investigation](PR_45_ADR_0024_R14_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
proved classification A with high confidence. Converting the exact committed
3,795-byte UTF-8/no-BOM SQL's 110 LF bytes to CRLF produces the exact
3,905-byte observed checksum, and reverse normalization is byte-for-byte
exact. No authoritative historical matching Git blob was recovered.

The immutable migration and manifest remain unchanged. Before R15, attestation
v5 pinned four independent ordinary one-step tuples and required all four; no
checksum pattern or global line-ending exception exists. The pilot-auth
historical zero-step state remains separate and unchanged. The attestation is
pending with zero captures and zero approvals, the incident is open, and any
complete capture requires new separate authorisation.

### R15 First-Login Checksum Stop And Repository Classification

R15 is permanently closed after typed exit `25` for
`20260718150000_tenant_first_login_activation`, record
`e0d71f73-e278-4a79-9906-650a8c43881f`. Its only exact-success failure was the
canonical checksum
`f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f`
versus observed checksum
`8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab`.
No complete capture or second transaction followed.

The repository-only investigation proved classification A. Sixteen LF-to-CRLF
insertions reproduce the observed checksum and reverse exactly to the Git
blob, with no SQL change. R15 reported no lifecycle anomaly. Attestation v5
now pins five independent ordinary one-step tuples; the pilot-auth historical
state remains separate. A later-migration candidate matrix is informational
only and creates no Production acceptance. The attestation remains pending
with zero captures and approvals, and the incident remains open.

### R17 Tenant-Operator Checksum Stop And Repository Classification

R17 is permanently closed after the hardened retention path preserved typed
exit `25` for `20260720100000_tenant_operator_recovery`, record
`4c2d5692-de53-4156-84da-eff6184f9c1d`. The sole retained exact-success failure
was canonical checksum
`e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215`
versus observed checksum
`11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96`.
The report contained no lifecycle failure. No complete first capture, second
transaction or deterministic evidence followed.

Repository-only proof establishes classification A. Twenty-four LF-to-CRLF
insertions convert the exact 804-byte Git blob into the exact 828-byte observed
representation, and reverse normalization restores the canonical bytes without
changing SQL. Attestation v5 now pins six independent ordinary one-step tuples;
the pilot-auth historical state remains separate.

The manual-lead and password-reset candidates remain unaccepted. Password
reset remains expected pending, the attestation remains pending with zero
captures and approvals, and the incident remains open. The follow-up made no
Production connection and grants no R18 authority.

### R18 Manual-Lead Checksum Stop And Repository Classification

R18 is permanently closed after the hardened retention path preserved typed
exit `25` for `20260722190000_manual_lead_creation`, record
`5920b218-8952-4f39-9862-3a26465e5cbf`. The sole retained exact-success failure
was canonical checksum
`443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160`
versus observed checksum
`8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e`.
The report contained no lifecycle failure. No complete first capture, second
transaction or deterministic evidence followed.

Repository-only proof establishes classification A. One hundred twelve
LF-to-CRLF insertions convert the exact 4,491-byte Git blob into the exact
4,603-byte observed representation, and reverse normalization restores the
canonical bytes without changing SQL. Attestation v5 now pins seven
independent ordinary one-step tuples; the pilot-auth historical state remains
separate and the six prior tuples are unchanged.

The password-reset candidate remains unaccepted and that migration remains
expected pending. The attestation remains pending with zero captures and
approvals, and the incident remains open. The follow-up made no Production
connection and grants no R19 authority.

### R19 Complete Evidence And Active Attestation

R19 is permanently closed after one authorised fixed read-only invocation at
repository revision `2b76a33a5f01c746436132c195bdd7582d54817b`. Both
independent repeatable-read captures completed and matched deterministic
evidence digest
`19027bc451ba6fd25b17ccfd69f4106c5562df1cb396928b7b91aab74697fb98`.
All seven ordinary tuples and the separate pilot-auth historical state
verified. The live schema/catalog fingerprint was
`1d1354ca5bf23142fee9cbe3302b7a88c670c1426594563d70a1c24d35151d81`,
with no unsupported objects.

Attestation v5 is active under the explicit pilot-stage compensating control.
Guarded read-only Production status returned `verified-pending-blocked`, exit
`20`, `deploymentAllowed=false`, and `migrationApplied=false`. The exact
pending set contains only `20260724180000_password_reset_foundation`. No
Production write, migration, deployment or alias movement occurred.

The incident remains contained rather than closed: the original historical SQL
is still unavailable, raw ledger history remains divergent, and the pending
password-reset migration requires a separate authorised execution and
postflight verification.

### Password-Reset R4 Postflight Stop

The separately authorised and permanently closed reconciliation R4 reported
successful canonical password-reset migration application, then stopped with
exit `26`, `SCHEMA_MISMATCH`. The expected `685ee5...` fingerprint was proven
repository-only to originate from disposable PostgreSQL rather than a
Production-specific post-migration catalog. R19 did not retain enough complete
catalog metadata to reconstruct the missing Production post fingerprint.

Attestation v6 therefore records no Production post fingerprint, requires
exact Production read-only capture provenance for any future value, and is
retired. The seven historical ordinary tuples, pilot-auth state, R19 captures
and R19 pre-migration fingerprint are unchanged. The migration must not be run
again. A separately authorised read-only post-migration verification is the
next database prerequisite. See the
[R4 fingerprint investigation](PR_45_ADR_0024_R4_POST_MIGRATION_SCHEMA_FINGERPRINT_INVESTIGATION.md).

## Post-Migration Verification Capability Repair

Closed read-only verification R1 stopped before child launch because the
repository had only the historical pending-migration evidence path. Its five
fail-closed incompatibilities were the old change-ID family, pending-only
attestation lifecycle, 15/1 ledger contract, pre-password-reset catalog
contract and absent fixed credential-file command.

The repository-only repair adds a distinct retired-attestation, 16-applied,
zero-pending post-migration evidence version. It validates the exact final
migration lifecycle, all retained historical lineage rules, the canonical
post-password-reset catalog and the complete fingerprint-v2 descriptors in two
read-only deterministic captures. Disposable PostgreSQL 18 validation passed
with all 16 migrations and zero pending.

No Production credential, connection, query, transaction, capture or write was
used for the repair. The actual Production post-migration fingerprint and
schema remain unverified, the attestation remains retired and the incident
remains open. The next database action, if separately authorised, is one new
read-only post-migration verification; it is not a migration retry.

## Related Documents

- [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md)
- [Migration History Reconciliation Runbook](MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md)
- [ADR-0024 Migration Lineage Verifier](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md)
- [Database Operations Runbook](DATABASE_OPERATIONS_RUNBOOK.md)
- [Database Environment Safety](DATABASE_ENVIRONMENT_SAFETY.md)
- [Production Authentication 503 Incident](INCIDENT_2026_07_23_PRODUCTION_AUTH_503.md)
- [Technical Debt Register](TECHNICAL_DEBT_REGISTER.md)
- [PR #44 Evidence-Capture Tooling Preparation](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md)
- [PR #45 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md)
- [R10 Checksum Divergence Investigation](PR_45_ADR_0024_R10_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R11 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R11.md)
- [R11 Checksum Divergence Investigation](PR_45_ADR_0024_R11_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R12 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R12.md)
- [R12 Checksum Divergence Investigation](PR_45_ADR_0024_R12_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R13 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R13.md)
- [R13 Checksum Divergence Investigation](PR_45_ADR_0024_R13_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R13 Pilot Authentication Lineage Investigation](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md)
- [R15 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R15.md)
- [R15 Checksum Divergence Investigation](PR_45_ADR_0024_R15_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R17 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R17.md)
- [R17 Checksum Divergence Investigation](PR_45_ADR_0024_R17_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R18 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R18.md)
- [R18 Checksum Divergence Investigation](PR_45_ADR_0024_R18_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
- [R19 Production Evidence Operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R19.md)
- [PR #45 Operational Readiness Checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
- [PR #45 Pilot-Stage Production Governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md)
- [Post-Migration Production Evidence Path Repair](PR_45_ADR_0024_POST_MIGRATION_PRODUCTION_EVIDENCE_PATH_REPAIR_2026_08_26.md)
