# PR #45 ADR-0024 Production Evidence Operation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-OPERATION-2026-07-28 |
| Status | Draft; pilot-stage governance prepared, operational evidence and activation pending |
| Owner | Patrick McKenna |
| Operation date | Pending |
| Repository baseline | `bd1fcc8eb8796c01bad2ab866e11abbb082f6389` |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [2026-07-25 Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |
| Preparation record | [PR #44 evidence-capture preparation](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md) |
| Resume checklist | [PR #45 operational readiness](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md) |
| Governance | [PR #45 pilot-stage Production governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md) |

## Decision

The operation remains at the Phase 2 precondition boundary. No Production
database connection or query was made. This amendment records an honest
pilot-stage operating model because no independent human technical reviewer is
currently available. Patrick McKenna is CEO, Production Owner, Production
Operator, Recovery Owner and final accountable human approver. The approved
change ID, current restore-point evidence, controlled guarded Production
connection metadata, two capture artifacts and activation evidence are still
unavailable.

The fixed attestation remains `pending`. Its governance mode was prepared, but
no operational evidence or approval evidence was populated and it was not
activated.
The capture command and Production status verifier were not run. No migration
command, Prisma deploy, manual SQL, database console, deployment, promotion or
alias operation was run.

The only permitted successful status remains:

> **Production lineage accepted under ADR-0024 attestation.**

That status has not been reached by this Draft PR.

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

The next task is to complete the
[PR #45 operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
with genuine operational inputs, then resume this Draft PR from the Phase 2
boundary under the documented pilot-stage mode. Migration execution remains a
different, separately approved change after attestation activation and exit
`20` status verification.
