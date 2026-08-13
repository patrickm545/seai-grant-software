# PR #45 ADR-0024 Production Evidence Operation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-OPERATION-2026-07-28 |
| Status | Draft |
| Owner | Patrick McKenna |
| Review cycle | After every separately authorised ADR-0024 operation |
| Last reviewed | 2026-08-13 |
| Operational state | R15 permanently closed after exact tenant first-login checksum stop; fifth exact tuple proven repository-only; Production activation pending |
| Operation date | R1-R2 stopped 2026-07-29; R3-R5 closed 2026-08-04; R6-R10 closed 2026-08-05; R11-R12 closed 2026-08-06; R13-R14 closed 2026-08-10; R15 closed 2026-08-13 |
| Repository baseline | `da3db4dd71050c902ee2f6266d42fd456e2654cb` |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [2026-07-25 Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |
| Preparation record | [PR #44 evidence-capture preparation](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md) |
| Resume checklist | [PR #45 operational readiness](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md) |
| Governance | [PR #45 pilot-stage Production governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md) |
| Exit 70 investigation | [R2 repository root-cause investigation](PR_45_ADR_0024_EXIT_70_INVESTIGATION_2026_07_29.md) |
| R3 operation | [Typed database-only metadata mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R3.md) |
| R4 operation | [Safe field-level timestamp mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R4.md) |
| R7 operation | [Failed-record timestamp precision mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R7.md) |
| R8 operation | [Completed zero-step timestamp precision mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R8.md) |
| R9 diagnostic | [Repository exact-success diagnostic amendment](PR_45_ADR_0024_R9_EXACT_SUCCESS_DIAGNOSTIC.md) |
| R10 operation | [Exact repository checksum mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R10.md) |
| R10 investigation | [Classification A checksum divergence](PR_45_ADR_0024_R10_CHECKSUM_DIVERGENCE_INVESTIGATION.md) |
| R11 operation | [Second exact repository checksum mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R11.md) |
| R11 investigation | [Second classification A checksum divergence](PR_45_ADR_0024_R11_CHECKSUM_DIVERGENCE_INVESTIGATION.md) |
| R12 operation | [Third exact repository checksum mismatch](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R12.md) |
| R12 investigation | [Third classification A checksum divergence](PR_45_ADR_0024_R12_CHECKSUM_DIVERGENCE_INVESTIGATION.md) |
| R13 operation | [Pilot-auth checksum and zero-step stop](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R13.md) |
| R13 investigation | [Classification A and lifecycle L1](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md) |
| R14 operation | [Tenant-provisioning checksum stop](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R14.md) |
| R14 investigation | [Fourth exact classification A checksum divergence](PR_45_ADR_0024_R14_CHECKSUM_DIVERGENCE_INVESTIGATION.md) |
| Pre-R9 timestamp audit | [All attestation timestamp paths and retained evidence](PR_45_ADR_0024_TIMESTAMP_AUDIT_BEFORE_R9.md) |
| Final Windows launcher reliability | [R5 handoff investigation and repair](PR_45_ADR_0024_WINDOWS_LAUNCHER_RELIABILITY_2026_08_04.md) |

## Decision

The first authorised operation is closed as a clean stop. It reached the
Stage 3 Capture 1 launcher but stopped before the fixed repository command
started and before any Production connection or query. The stopped change ID
`CHG-2026-07-29-ADR0024-PROD-EVIDENCE` is historical evidence only and must
never be reused.

| Stop field | Recorded value |
| --- | --- |
| Start | 2026-07-29 13:54:55 IST / 12:54:55 UTC |
| Stop | 2026-07-29 13:59:02 IST / 12:59:02 UTC |
| Stop stage | Stage 3 - Capture 1 launcher |
| Root symptom | Node `spawnSync` returned `EINVAL` for Windows `corepack.cmd` |
| Fixed command | Did not launch |
| Production connection or query | Not opened or executed |
| Capture artifact | None created |
| Production status | Not run |
| Repository or Production mutation | None |
| Retry | None |
| Change ID disposition | Closed; must not be reused |

The fixed attestation remains `pending`. Its governance mode was prepared, but
no operational evidence or approval evidence was populated and it was not
activated.
The capture command and Production status verifier were not run. No migration
command, Prisma deploy, manual SQL, database console, deployment, promotion or
alias operation was run.

## Second Authorised Operation

The separate operation
`CHG-2026-07-29-ADR0024-PROD-EVIDENCE-R2` successfully used the repaired
launcher, established a guarded read-only Production connection and stopped
with exit `70` before emitting evidence. It did not run Production status,
activate the attestation, migrate, deploy or move an alias. That change ID is
also closed and must not be reused.

The retained generic diagnostic did not include the failing stage or original
exception. The exact supported findings, retained-evidence limits and
repository-only diagnostic repair are recorded in the
[exit 70 investigation](PR_45_ADR_0024_EXIT_70_INVESTIGATION_2026_07_29.md).

## Third Authorised Operation

The separate operation
`CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R3` invoked the repaired fixed launcher
once and stopped with `LEDGER_MISMATCH`, exit `25`, during
`first-evidence-generation`. The first read-only fixed query set completed,
but the database-only migration metadata differed from the pending
attestation. No complete evidence was emitted and the exact differing field
was not retained.

No claim is made about which field differed. R3 is permanently closed and must
not be retried or reused. Another Production operation is prohibited until the
field-level secret-safe diagnostic amendment is reviewed and separately
approved. See the [R3 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R3.md).

## Fourth Authorised Operation

The diagnostic-only operation
`CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4` invoked the fixed launcher exactly
once at approved head `31d5a73cb820d12e0a8904c06244dfa443865126` and stopped
with `LEDGER_MISMATCH`, repository typed exit `25`, during
`first-evidence-generation`. The safe versioned report identified exactly two
mismatching fields: `startedAt` and `finishedAt`. Both observed values retain
significant microsecond precision beyond the pending attestation values.

R4 did not decide which value is correct and did not change the attestation.
The first read-only fixed query set completed, the second transaction did not
start, and no complete evidence or deterministic comparison was produced. R4
is permanently closed and grants no retry, remediation, migration or
attestation-activation authority. See the
[R4 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R4.md).

A later repository-only evidence-accuracy amendment established the observed
R4 timestamps as the canonical normalized values and corrected the pending
attestation to `2026-04-23T07:04:10.39554Z` and
`2026-04-23T07:04:10.527739Z`. The amendment used the retained R4 boundary
artifact (SHA-256
`b59168be39582cc8854214b5ccc2a9ace6dcb1ced0a23813955485649b9c5196`),
did not connect to Production and grants no authority for another capture.

## Fifth Authorised Operation

`CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R5` stopped at the external local
launcher handoff. Windows PowerShell 5.1/.NET Framework exposed no
`ProcessStartInfo.ArgumentList` property, so the orchestration wrapper started
`node.exe` without the intended script or arguments. Node exited `0` with no
repository output; the wrapper stopped on that impossible condition with exit
`91`.

The repository launcher, verifier and database client did not execute. No
Production connection, transaction or query occurred, and no artifact was
created. R5 was not retried and is permanently closed. The exact investigation
and harmless smoke boundary are recorded in the
[final Windows launcher reliability record](PR_45_ADR_0024_WINDOWS_LAUNCHER_RELIABILITY_2026_08_04.md).

## Sixth Authorised Operation

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R6` stopped during pre-access
verification because its approved SHA preceded the final launcher repair. No
Production connection or repository command ran. R6 is permanently closed.

## Seventh Authorised Operation

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R7` invoked the fixed direct Node
launcher exactly once at approved head
`613363693f897e9666279c06e3a66c2713bc2af6`. The first read-only query set
completed, then `first-evidence-generation` stopped with `LEDGER_MISMATCH`,
typed exit `25`. Exactly two related failed-record fields differed:
`startedAt` and `rolledBackAt`.

The retained R7 diagnostic established canonical values
`2026-04-29T06:01:05.497406Z` and
`2026-04-29T06:01:38.423504Z` under
`adr-0024-migration-record-normalization/v1`. The repository-only accuracy
amendment replaced the earlier millisecond-truncated governing values without
connecting to Production. R7 remains closed; no complete evidence, digest,
attestation activation or Production status resulted. See the
[R7 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R7.md).

## Eighth Authorised Operation

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R8` invoked the fixed direct Node
launcher exactly once at approved head
`d3cbb5b76fc4d2608d4efbd486b77466f1457aaa`. The first read-only query set
completed, then `first-evidence-generation` stopped with `LEDGER_MISMATCH`,
repository typed exit `25`. Exactly two completed zero-step record fields
differed: `startedAt` and `finishedAt`.

The retained R8 diagnostic established the canonical value
`2026-04-29T06:01:38.54346Z` for both fields under
`adr-0024-migration-record-normalization/v1`. The repository-only accuracy
amendment replaced the earlier millisecond-truncated governing values without
connecting to Production. R8 remains closed; no complete evidence, digest,
attestation activation or Production status resulted. See the
[R8 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R8.md).

## Ninth Authorised Operation

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R9` invoked the fixed launcher once and
stopped during `first-evidence-generation` with `LEDGER_MISMATCH`, exit `25`.
The diagnostic named `20260710120000_identity_organisation_foundation` but did
not yet identify its differing field. The repository-only R9 amendment added
safe versioned exact-success diagnostics without weakening the predicate. R9
remains permanently closed and produced no complete evidence, digest,
activation or Production status.

## Tenth Authorised Operation

`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R10` invoked the fixed launcher once at
approved head `1949ebe495801b26f6f59d2785a6b86b2864b153`. The first guarded
read-only transaction and fixed identity, ledger and catalog queries completed.
Evidence generation then stopped with `LEDGER_MISMATCH`, exit `25`, because
record `112c6124-f0c2-4b6b-8d02-f6ce835746e3` for
`20260710120000_identity_organisation_foundation` had checksum
`c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714`
instead of canonical manifest checksum
`fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3`.
No other exact-success failure was emitted. R10 itself did not prove the cause,
did not start the second capture and produced no complete evidence or digest.
It remains permanently closed.

The subsequent repository-only investigation proved classification A: the
observed checksum is the exact committed UTF-8/no-BOM SQL with LF mechanically
materialised as CRLF and the final newline retained. No Production command or
connection was used for that amendment.

## Eleventh Authorised Operation

`CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R11` invoked the fixed launcher once at
approved head `3281da65c013e9ad63dbc6c5da507640db586452`. The first guarded
read-only transaction and fixed identity, ledger and catalog queries completed.
Evidence generation stopped with `LEDGER_MISMATCH`, exit `25`, because record
`93c04529-1d5b-4350-af01-ef225b69b008` for
`20260710130000_users_roles_permissions_audit` had checksum
`4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb`
instead of canonical manifest checksum
`cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf`.
No other exact-success failure was emitted. R11 itself did not prove the cause,
did not start the second capture and produced no complete evidence or digest.
It remains permanently closed.

The subsequent repository-only investigation proved classification A for the
second exact tuple using the same reversible LF-to-CRLF byte transformation.
Attestation v4 then recorded both exact Production tuples and required them
independently while the migrations and manifest remain unchanged. This is not
a global line-ending or checksum exception. No Production command or
connection was used for the investigation. The attestation remains pending
with zero captures and approvals; another complete capture requires new,
separate authorisation. The investigation itself created no R12 authority.

## Twelfth Authorised Operation

`CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R12` invoked the fixed launcher once at
approved head `a60da87c62bb22d406f3e36f8484a13d14086a32`. The exact R10 and
R11 tuples passed in order. The first guarded read-only transaction and fixed
identity, ledger and catalog queries completed. Evidence generation stopped
with `LEDGER_MISMATCH`, exit `25`, because record
`ce4489c9-fa9b-41e0-90fc-23a584e162da` for
`20260710140000_workflow_foundation` had checksum
`fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8`
instead of canonical manifest checksum
`7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d`.
No other exact-success failure was emitted for that migration. R12 itself did
not prove the cause, did not start the second capture and produced no complete
evidence or digest. It remains permanently closed.

The subsequent repository-only investigation proved classification A for the
third exact tuple using the same reversible LF-to-CRLF byte transformation.
Attestation v4 records all three exact Production tuples and requires them
independently while the migrations and manifest remain unchanged. This is not
a global line-ending or checksum exception. No Production command or
connection was used for the investigation. The attestation remains pending
with zero captures and approvals; another complete capture requires new,
separate authorisation. No R13 authority exists.

The only permitted successful status remains:

> **Production lineage accepted under ADR-0024 attestation.**

That status has not been reached by this Draft PR.

## Windows Launcher Root Cause And Repair

The stopped operation used a one-off inline Node wrapper whose exact child
process call resolved the executable string to `corepack.cmd`, passed the
package-manager arguments as an array and set `shell: false`. The working
directory and stdio configuration were valid. On this Windows/Node runtime,
direct process creation cannot execute a batch-file shim, so `spawnSync`
returned `EINVAL` with `status=null` before Corepack, pnpm or the fixed package
script could start. The cause was not argument quoting, an invalid working
directory, unsupported stdio, the verifier or a Production response.

The reviewed repository launcher now resolves exactly one `corepack.cmd` from
Windows `PATH`, validates the expected adjacent
`node_modules/corepack/dist/corepack.js`, and invokes that JavaScript entry
point with the current `process.execPath`. POSIX continues to resolve and
execute exactly one extensionless `corepack` executable. Both paths pin
`pnpm@10.11.0`, pass an argument array, set `shell: false`, preserve the child
environment, stdout, stderr, exit status and signal, and fail closed on missing
or ambiguous resolution.

The operator entry point
`node --import tsx scripts/launch-production-evidence-capture.ts` accepts no
arguments and can invoke only the existing fixed package script
`db:lineage:capture-production-evidence`. It is a launcher, not a replacement
verifier. It was not executed during this repair. No `cmd.exe`, PowerShell,
interpolated command string or general shell fallback was added. Control
characters in resolved programs or arguments are rejected, and launch errors
report only a safe OS error code rather than environment values.

The harmless Windows smoke probe invoked only pinned pnpm's `--version`
operation through the repaired path and returned `10.11.0`. It did not load a
database URL or run a repository database command.

This repair is not authority to retry. A future attempt requires all of:

- a new change ID;
- fresh recovery and restore-point verification;
- review of this launcher fix;
- a clean worktree at the exact approved SHA; and
- explicit approval to retry the read-only Production evidence operation.

## Repository And Deployment Review

| Check | Expected | Observed | Result |
| --- | --- | --- | --- |
| Authoritative repository baseline | `bd1fcc8eb8796c01bad2ab866e11abbb082f6389` | Exact match in isolated PR worktree | Pass |
| Fixed capture command | `pnpm db:lineage:capture-production-evidence` | Exact package script present | Pass |
| Linked Vercel project | `seai-grant-software` | Project `prj_ZfAMVKj3uSTotQsPenzxXupJxQAX` under the configured scope | Pass |
| Current live Production deployment | `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`, Ready | Alias `seai-grant-software.vercel.app` resolves to the expected deployment with state `READY` | Pass |
| Latest blocked Production deployment | `dpl_4ToKLMEXKxVsPUvcX81p6BzQYb3v` | Target `production`, state `ERROR` | Pass |
| Expected Production database fingerprint | `db_4e1d3bd23cff6801` | Pinned by ADR, guard and pending attestation; no connection was made to prove a live target | Not executed |
| Pending migration | `20260724180000_password_reset_foundation` | Expected by manifest and verifier; no live ledger query was made | Not executed |
| Preview | Repaired independently and strict | Final Git-backed Preview is Ready; strict preflight and postflight are clean; no Production exception or verifier relaxation | Pass |

The alias observation proves only the deployment target at review time. It is
not evidence that no future alias operation is queued. No provider mutation was
performed.

## Fixed Command Safety Review

The capture implementation accepts no arbitrary SQL, attestation path, manifest
path or output path. It requires these exact environment variables:

| Variable | Purpose | Operation state |
| --- | --- | --- |
| `APP_ENV` | Must equal `production` | Unavailable |
| `DATABASE_ENVIRONMENT` | Must equal `production` and match `APP_ENV` | Unavailable |
| `DATABASE_URL` | Controlled PostgreSQL connection; never evidence output | No approved Production value supplied |
| `DATABASE_FINGERPRINT` | Must equal the fingerprint computed from host, port and database name | Unavailable |
| `PRODUCTION_DATABASE_FINGERPRINT` | Positive Production identity marker | Unavailable |
| `DATABASE_BRANCH_ID` | Optional validated diagnostic label; does not affect the security fingerprint | Unavailable |
| `PRODUCTION_EVIDENCE_GOVERNANCE_MODE` | Must equal the selected explicit governance mode | `pilot-stage-compensating-control` prepared; not executed |
| `PRODUCTION_EVIDENCE_CHANGE_ID` | Exact approved read-only change identifier | Unavailable |
| `PRODUCTION_EVIDENCE_OPERATOR` | Exact named human Production operator | Patrick McKenna is allocated; not executed |
| `PRODUCTION_EVIDENCE_REVIEWER` | Standard mode only: named human reviewer distinct from operator | Must be absent in pilot-stage mode |
| `PRODUCTION_EVIDENCE_PILOT_ACCOUNTABILITY_ACKNOWLEDGEMENT` | Pilot-stage mode only: exact Patrick McKenna accountability acknowledgement | Required; not executed |
| `PRODUCTION_RESTORE_POINT_REFERENCE` | Exact current backup or restore-point evidence reference | Unavailable |
| `VERCEL_GIT_COMMIT_SHA` | Optional trusted 40-character repository revision in Vercel; local Git SHA is otherwise used | Unavailable locally |

The URL-derived identity is the SHA-256 of canonical JSON containing the
lower-cased host, effective port and decoded database name, truncated to 16 hex
characters and prefixed with `db_`. The connected query must independently
return the same database name. An environment label alone is not accepted as
identity proof.

Each internal capture opens a Prisma transaction at `RepeatableRead`, executes
`SET TRANSACTION READ ONLY`, performs fixed reads and disconnects. The command
does this twice and compares the complete deterministic evidence. It does not
acquire a Prisma migration lock and exposes no migration-deploy call. The
transaction-scoped read-only setting creates no persistent session mutation.

## Fixed Read Queries And Fields

The reviewed implementation in `lib/postgres-catalog.ts` contains only these
fixed query groups:

1. Connected identity: `current_database()`, current server port and server
   version.
2. Complete `public._prisma_migrations` ledger ordered by `started_at` and
   `id`: `id`, `migration_name`, `checksum`, UTC-normalised `started_at`,
   UTC-normalised nullable `finished_at`, `applied_steps_count`,
   UTC-normalised nullable `rolled_back_at` and `logs`.
3. The `public` namespace from `pg_namespace`.
4. Public ordinary and partitioned tables from `pg_class`.
5. Public columns from `information_schema.columns`, including position, type,
   database type, nullability, default, identity and generation expression.
6. Public constraints and ordered constrained columns from `pg_constraint`,
   including referenced schema and table.
7. Public indexes from `pg_index`, including keys, included columns,
   expression, predicate, uniqueness, primary and constraint-backed state.
8. Public enums and ordered labels from `pg_type` and `pg_enum`.
9. Installed extensions and versions from `pg_extension`.
10. Non-internal public triggers from `pg_trigger`.
11. Public sequences from `pg_sequences`.
12. Unsupported public relation kinds from `pg_class`.

Raw migration logs are read only inside the controlled process so their exact
UTF-8 bytes can be hashed with SHA-256. Raw logs are not emitted. Empty or null
logs are classified as `none`; present logs are classified as `sha256` and only
the digest is emitted.

## Evidence Shape And Digest

The command would emit:

- evidence version, environment, safe database fingerprint and connected-name
  guard result;
- repository revision and verifier version;
- manifest version, manifest hash and exact ordered migration inventory;
- supplied operational controls;
- every normalised migration record, total count, pending set, applied
  repository count and pinned ADR-0024 result;
- schema fingerprint version and fingerprint;
- named assertion version, profile and results;
- namespace, table, column, constraint, index, enum, extension, trigger,
  sequence and unsupported-object counts;
- unsupported-object inventory;
- deterministic evidence digest; and
- capture timestamps and repeated-capture result.

The digest is lowercase SHA-256 over canonical JSON of all deterministic
evidence fields. The capture timestamp and digest field itself are excluded
from the repeated-content comparison. A material mismatch between internal
reads fails closed. The operational plan additionally requires two separate
command invocations and full external artifact comparison.

## Pending Attestation Fields

The fixed file
`prisma/lineage-attestations/adr-0024-production.json` remains unchanged and
pending. The following active-only evidence is still unavailable:

- failed related record ID;
- completed zero-step record ID;
- failed-log SHA-256 digest;
- exact reviewed Production ledger and total row count;
- exact live pending migration set;
- Production pre-password-reset schema fingerprint;
- reviewed post-password-reset and fresh-head fingerprint fields in the fixed
  attestation;
- named live catalog assertion and catalog-count evidence;
- two external evidence references and repeated deterministic evidence digest;
- review and activation timestamps;
- valid expiry no later than 90 days after activation; and
- every genuine approval field.

The known database-only record, manifest values and disposable fingerprints
remain preparation inputs, not substitutes for live reviewed evidence.

## Human And Operational Preconditions Outstanding

No value may be guessed or attributed to Sam, Codex, ChatGPT, OpenAI,
automation or an invented person. AI-assisted CTO review is a method, not a
human approval. Before a future Production query, the change owner must provide
and verify:

- approved read-only change ID;
- governance mode `pilot-stage-compensating-control`;
- named Production operator Patrick McKenna;
- an absent independent reviewer value, accurately reflecting current
  unavailability;
- Patrick McKenna's exact accountability acknowledgement;
- current restore-point or backup evidence reference;
- controlled Production database connection and all identity guard values;
- expected Production project and environment;
- exact live database fingerprint `db_4e1d3bd23cff6801`;
- no concurrent migration, database deployment or maintenance operation;
- no alias promotion in progress;
- current live and latest blocked deployment references;
- pending attestation and pending password-reset migration state; and
- strict repaired Preview exclusion.

The normal standard path still requires genuine approvals from the CTO,
Database Reliability Reviewer, Security Reviewer and Production Owner, with
the existing independence rule. This operation instead selects the explicit
temporary pilot-stage path. It requires Patrick McKenna's sole human
Production-owner approval, exact timestamp, repository approval evidence,
accepted scope, conditions, every acknowledgement, two externally retained
complete capture artifacts and their SHA-256 digests. It also requires later
qualified human review before the first 10 pilot installers or when another
engineer or qualified external database reviewer joins, whichever occurs
first.

## Capture, Review And Activation Boundary

Capture may begin only after every operational precondition is genuine and
verified. Capture produces secret-free evidence but grants no approval. Both
complete external artifacts must be retained outside Git and compared across
every deterministic field against ADR-0024, the incident, manifest, known
pinned records, disposable evidence and current deployment state. Activation
is a later repository edit and is permitted only after both artifact
references and SHA-256 digests, lifecycle timestamps and Patrick McKenna's
approval exist. The attestation schema pins the only permitted subsequent
status outcome; the actual `verified-pending-blocked` exit `20` artifact is
retained immediately after activation.

Any unknown identity, record, digest, fingerprint, reference, approval or
lifecycle value is a stop. Evidence drift, an unexpected migration, failed
schema assertion, secret exposure, Production write, migration invocation or
alias movement is also an immediate stop.

## Command Boundary

The verifier reserves exit `20` for a valid active Production attestation with
the expected pending migration and `deploymentAllowed=false`. Pending
attestation validation exits `21`; expiry exits `22`; identity, inventory,
ledger and schema failures exit `23` through `26`; unsafe configuration exits
`27`; internal failure exits `70`.

Exit `20` was not sought because activation prerequisites are incomplete.
Neither the application build nor Prisma migration execution was started.

## Unchanged Scope And Next Action

- The Production attestation remains pending.
- Historical SQL remains unknown and the historical ledger remains divergent.
- No Production evidence digest, ledger row count, related record ID, failed-log
  digest or live schema fingerprint is claimed.
- No migration was applied by this operation.
- No Production schema, data or migration-ledger mutation was initiated.
- The live alias still resolves to
  `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` at the recorded inspection time.
- Preview lineage is repaired, strict, clean and outside the Production
  exception.
- `20260724180000_password_reset_foundation` remains expected to be pending; a
  live query was not made.
- Password-reset request-flow work remains paused.
- The incident remains open.
- The unrelated July 23 incident edit in the primary worktree remains untouched
  and excluded.

This repository-only amendment ends before any further capture. A later
complete read-only capture may begin only under a new, separately authorised
change ID after the
[PR #45 operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
is freshly completed. No R12 operation is authorised by this record. Migration
execution remains a different, separately approved change after attestation
activation and exit `20` status verification.

## Closed R13 Operation And Repository-Only Follow-Up

R13 later received the separate change ID
`CHG-2026-08-10-ADR0024-PROD-EVIDENCE-R13` for one read-only invocation at
`cd6cd164ad99f8f7c3f76a00c9fc5d7eb6b4743e`. It is now permanently closed.
The repository returned typed exit `25` at `first-evidence-generation` for
`20260716183000_pilot_installer_auth`: the checksum differed from the canonical
manifest and the exact record had zero applied steps.

Later repository-only work classified the checksum A and the historical
lifecycle L1, based on reversible bytes and the retained original reviewed
repair plus `migrate resolve --applied` artifact. No fourth tuple was added.
ADR-0024 now defines the separate exact
`attestedHistoricalResolvedMigration` state while preserving ordinary
one-step success. The attestation remains pending with zero captures and zero
approvals because exact current ledger timestamps, evolved catalog proof, two
matching R14 artifacts and current recovery evidence are still required. See
the [R13 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R13.md)
and [lineage investigation](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md).

This follow-up did not access Production, run capture or status, execute or
resolve a migration, deploy, move an alias or create R14 authority.

## Repository-Only Historical-State Amendment

Attestation v5 contains exactly one pending historical-resolved entry. Known
R13 fields and retained evidence hashes are pinned; current Production ledger
timestamps, schema fingerprint, catalog assertion digest, R14 change and
repository revision, capture references and recovery evidence remain null or
empty. The fixed capture path can collect those values only during a newly
authorised read-only R14 operation and cannot activate the attestation merely
because the historical explanation is known.

This amendment changed no migration SQL or manifest, queried no database, and
ran no Production status, migration, deployment or alias operation. R13 stays
closed and, at that amendment point, no R14 authority had been created.

## Closed R14 Operation And Repository-Only Follow-Up

R14 later received the separate change ID
`CHG-2026-08-10-ADR0024-PROD-EVIDENCE-R14` for one read-only invocation at
`90c2f1f95a7dbc6eeaac48df3d2ef0b3a336ac7c`. It is permanently closed. The
repository returned typed exit `25` at `first-evidence-generation` for the
exact `20260718130000_tenant_provisioning_data_model` record ID
`5eeca647-5429-4beb-873b-cff91ec58ddf`: the observed checksum
`2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805`
differed from canonical checksum
`a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7`.
No lifecycle failure was reported.

R10, R11 and R12 passed before the R14 stop. The separate pilot-auth
historical ledger state also passed with zero applied steps, null rollback and
no logs. The stop occurred before complete evidence serialization, so R14
emitted no complete capture, second capture, digest, schema fingerprint,
catalog assertions, normalized ledger or live pending set. The attestation
remains pending with zero captures and zero approvals; its historical R14
capture-binding fields remain null or empty.

The repository-only follow-up proved classification A: converting the exact
3,795-byte UTF-8/no-BOM committed blob's 110 LF endings to CRLF, retaining the
final newline, creates the exact 3,905-byte observed checksum. Reverse
normalization is byte-for-byte exact. Attestation v5 therefore adds one fourth
independently pinned ordinary one-step tuple. The immutable SQL and manifest
remain unchanged, and the pilot-auth zero-step state remains separate.

This investigation did not connect to Production, run capture or status,
execute SQL, migrate, resolve, deploy or move an alias. It does not reopen R14
or authorise another Production operation.

## Closed R15 Operation And Repository-Only Follow-Up

R15 received separate change ID
`CHG-2026-08-13-ADR0024-PROD-EVIDENCE-R15` for one read-only invocation at
`da3db4dd71050c902ee2f6266d42fd456e2654cb`. It is permanently closed. The
repository returned typed exit `25` at `first-evidence-generation` for
`20260718150000_tenant_first_login_activation`, record
`e0d71f73-e278-4a79-9906-650a8c43881f`. Expected checksum
`f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f`
differed from observed checksum
`8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab`.
The exhaustive safe report contained no lifecycle failure.

The first read-only transaction and fixed reads completed. The verifier emitted
no complete evidence, started no second capture, produced no digest and did
not run Production status. The attestation stayed pending with zero captures
and approvals. No Production write, migration, deployment or alias movement
occurred.

The separate repository-only investigation proves classification A with 16
reversible LF-to-CRLF insertions and adds one exact fifth ordinary tuple. It
also records non-runtime candidate hashes for the three later migrations.
Those candidates are not Production values; password reset remains expected
pending. The investigation made no Production connection and does not
authorise R16.
