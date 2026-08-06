# Database Operations Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-DATABASE-OPERATIONS-RUNBOOK-001 |
| Status | Active; environment isolation verified, recovery evidence pending |
| Owner | Clada Systems Engineering; pilot-stage Production and Recovery Owner: Patrick McKenna |
| Review cycle | Before every Production database release and quarterly recovery rehearsal |
| Last reviewed | 2026-08-06 |

## Guarded Commands

| Command | Intended target | Notes |
| --- | --- | --- |
| `pnpm db:fingerprint` | Any configured URL | Parses only; does not connect. Prints safe identity. |
| `pnpm db:status` | Matching environment | Read-only independent lineage status. Production pending status preserves exit `20`. |
| `pnpm db:lineage:capture-production-evidence` | Production only | Fixed two-pass, repeatable-read evidence capture; requires an approved read-only change, explicit governance mode and its exact role controls. |
| `pnpm db:migrate:development` | Development | Prisma `migrate dev`; never Preview or Production. |
| `pnpm db:migrate:preview` | Preview | Runs guarded status, deploy, then clean status. |
| `pnpm db:migrate:test` | test | Runs guarded status, deploy, then clean status. |
| `pnpm db:migrate:production` | Production | Dedicated deliberate path below. |
| `pnpm db:seed:development` / `pnpm db:seed:test` | Development/test | Seed is never allowed in Preview or Production. |
| `pnpm db:reset` | Development/test | Also requires `ACKNOWLEDGE_DATABASE_RESET=RESET_DISPOSABLE_DATABASE`. |
| `pnpm test:integration:postgres` | disposable test | Uses `TEST_DATABASE_URL`, applies migrations, and runs database tests. |

Raw `prisma migrate`, reset, and seed commands are operationally unsupported. Review one-off mutation scripts against `assertDatabaseOperationAllowed` using the `one-off-mutation` operation before execution.

Environment-specific command names are enforced, not descriptive aliases: Preview, test, Development, and Production migration/seed wrappers refuse to run when `APP_ENV` identifies a different environment, even if that other environment's database metadata is internally consistent.

## Migration Gate

### Current Production release block

Production contains the completed migration
`20260423093000_application_pack_admin_fields`, whose repository artifact is
permanently unavailable unless new authoritative evidence is recovered. Every
Production migration and deployment remains blocked under
[ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md).
Raw Prisma status or deploy output must not be used to waive this incident.
Only the separately approved
[migration-history reconciliation runbook](MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md)
governs the attested path.

PR #43 implements the independent verifier described in
[ADR-0024 Migration Lineage Verifier](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md).
`db:status` and guarded deploy now use the independent manifest, ledger and
schema verifier. The checked-in attestation remains pending and returns exit
`21`; it cannot accept Production until exact remaining evidence and the
approval required by its explicit governance mode are added in a separate
reviewed activation change.

PR #45 selects the temporary
`pilot-stage-compensating-control` mode documented in
[PR #45 Pilot-Stage Production Governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md).
Patrick McKenna is the real human CEO, Production Owner, Production Operator,
Recovery Owner and final accountable approver. No independent human technical
reviewer is currently available; AI-assisted CTO review is a method, not an
approver. This mode is limited to two read-only captures, activation and exact
blocked status verification. It authorises no migration, deployment or alias
movement and must be reviewed before the first 10 pilot installers or when a
qualified reviewer joins.

R10 and R11 are permanently closed typed diagnostic stops. Later
repository-only investigations proved two exact CRLF historical checksum
representations and attestation v4 binds each one to its complete Production
tuple. This is not a general normalization or alternate-checksum rule. The
attestation remains pending with zero captures and approvals; no Production
capture, status, migration or deployment is authorised by those investigations.

For Preview/test, verify the safe identity, run the named migration command, and retain its exit status. The wrapper runs `prisma migrate status` before deployment, proceeds only if status is clean or reports pending repository migrations without a failed-migration signal, deploys, then requires a clean status.

The following sequence is for a later, separately approved Production
migration execution. It is prohibited until PR #45 has activated the
attestation from reviewed evidence and `pnpm db:status` has returned the exact
expected `verified-pending-blocked` decision with exit `20`.

For that later Production execution:

1. Confirm the approved commit/PR and assign a change identifier.
2. Confirm a recent recovery point and named rollback/escalation owner.
3. Export the Production-scoped variables into a controlled, non-shared operator shell. Do not echo them.
4. Run `pnpm db:fingerprint` and compare the safe fingerprint with the approved Production record.
5. Run `pnpm db:status`. Require the approved `verified-pending-blocked`
   decision and exact exit `20`; every other result stops execution.
6. Set `PRODUCTION_MIGRATION_CHANGE_ID` to the approved PR/change reference.
7. Set `ACKNOWLEDGE_PRODUCTION_MIGRATION=APPLY_APPROVED_PRODUCTION_MIGRATIONS`.
8. Run `pnpm db:migrate:production` once. Preserve the output and exit code without storing credentials.
9. Run `pnpm db:status` again and require a clean result.
10. Only after the migration status is clean, deploy or promote the application artifact that consumes the schema.
11. Follow the non-destructive smoke checklist below.

The Production command never resets or seeds. Prisma migrations are forward operations and are not automatically reversible. Rollback means a reviewed forward repair, application rollback when schema-compatible, or provider recovery after an incident decision.

After separate attestation activation, the deliberate command additionally
requires:

```text
ADR0024_ATTESTATION_ID=ADR-0024-PRODUCTION-2026-07-25
PRODUCTION_RESTORE_POINT_CONFIRMED=CONFIRMED_CURRENT_RESTORE_POINT
```

These supplement rather than replace the existing change ID and exact
acknowledgement. The wrapper runs `production-preflight`, Prisma deploy, then
`production-postflight`. Deliberate preflight and postflight accept only exit
`0`; exit `20` and every other non-zero result stop before continuation.
Production status-only handling recognizes exit `20` only as the expected
`verified-pending-blocked` decision, emits a secret-free boundary record, then
terminates the build with exit `20`. It never converts the result to success or
reaches Prisma deploy while an approved repository migration remains pending.

`vercel.json` runs the environment-aware database preflight before the
application build. `VERCEL_ENV` and `APP_ENV` must match. The Vercel environment
must contain the matching database classification and fingerprint variables.

- Preview runs the dedicated `db:migrate:preview` path: guarded status, committed
  migration deploy, and clean post-status before `next build`.
- Production is status-only. Production migrations remain a deliberate operator
  step through `db:migrate:production`; a Git deployment never applies them.
- Development is status-only.

A deployment whose target has divergent history, a failed migration, an unsafe
identity, or a classification mismatch must fail before `next build`; do not
bypass this gate. Apply approved Production migrations through the dedicated
command before deploying the consuming application artifact.

The migration wrapper accepts pending migrations only when Prisma reports a
non-divergent repository history with no failed migration. A database-only
migration, a local-only history mismatch beyond ordinary pending migrations, or
an ambiguous status is an incident requiring review; it is not eligible for
automatic deployment.

## Disposable Integration Database

Set `TEST_DATABASE_URL`, `TEST_DATABASE_ENVIRONMENT=test`, `TEST_DATABASE_FINGERPRINT`, optional `TEST_DATABASE_BRANCH_ID`, and the known `PRODUCTION_DATABASE_FINGERPRINT`, `PREVIEW_DATABASE_FINGERPRINT`, and `DEVELOPMENT_DATABASE_FINGERPRINT`. Missing persistent-target markers fail closed. `TEST_DATABASE_URL` must resolve to a different identity from `DATABASE_URL`, Preview, Development persistent targets, and Production. Use a fresh local PostgreSQL database or disposable Neon branch. No Neon resources are provisioned by this repository.

The runner validates all metadata before connecting, maps the accepted URL into the child process as `DATABASE_URL`, applies migrations, and runs `tests/integration`. Tests clean only their uniquely named fixtures. Missing configuration fails non-zero locally. CI skips the integration step only when `TEST_DATABASE_URL` is not configured and reports that skip explicitly.

## Backup And Recovery Verification

Production backup/recovery ownership belongs to Patrick or the named deployment owner; Neon supplies the provider capability. Neon currently exposes Backup & Restore/PITR based on retained history and may offer scheduled snapshots depending on plan and feature availability. Do not assume a default recovery window. Verify the active project settings in the Neon Console and record the exact history/snapshot retention. See [Neon PITR](https://neon.com/blog/announcing-point-in-time-restore) and the [Neon Backup & Restore update](https://neon.com/docs/changelog/2025-10-31).

Before pilot go-live, record:

- owner and deputy;
- Neon project and protected Production branch IDs (no credentials);
- plan/tier and whether Backup & Restore, PITR history, scheduled snapshots, and branch protection are enabled;
- exact recovery window and most recent recovery point timestamp;
- date, operator, evidence, duration, and outcome of a recovery rehearsal;
- escalation contact and the approved write-pause action.

Recovery rehearsal (non-Production only):

1. Choose a timestamp inside the verified history window.
2. Use Neon's multi-step/new-branch restore workflow to create a separate recovery branch or target. Never select one-step restore of Production for a rehearsal.
3. Create separate credentials/compute for the recovery target and fingerprint it as non-Production.
4. Connect only with read-only diagnostics; verify expected schema and a small set of non-sensitive counts or known record IDs.
5. Record evidence and delete the rehearsal target only after review and according to provider restrictions.
6. Do not repoint Vercel Production during a rehearsal.

No restore was performed as part of this repository change. Backup/PITR retention, Production branch protection where available, and a non-Production recovery rehearsal remain manual and pending.

## Provider Verification Record (2026-07-16)

- Vercel project/team: `seai-grant-software` / `patrick-mc-kennas-projects`.
- Neon project: `seai-grant-db`; Production `main`, persistent `preview`, and persistent `development` branches were present and left unchanged.
- Safe fingerprints: Production `db_4e1d3bd23cff6801`; Preview `db_31449de1074844bb`; Development `db_04701984b484da4b`. All are distinct.
- Vercel contains separate Production, Preview, and Development `DATABASE_URL` records plus the required scope-specific identity variables. No broad multi-scope `DATABASE_URL` or `TEST_DATABASE_URL` remains/configured.
- Clean-cache Preview deployment `seai-grant-software-r25e9dktw-patrick-mc-kennas-projects.vercel.app` became Ready after compilation, type checking, static generation, and serverless packaging.
- Read-only Preview checks passed for `/`, `/embed`, `/admin`, and unauthenticated denial/redirect from `/admin/dashboard`. No form was submitted and no database read or write diagnostic was run.
- No Production deployment, migration, seed, reset, smoke write, customer-data read, branch mutation, credential rotation, or restore was performed.

## Suspected Corruption Or Unsafe Writes

1. Incident owner declares the event and records UTC time, affected deployment, and last known good time.
2. Stop new writes. The strongest immediate database control is to revoke/reset the Production application role credential in Neon; this intentionally causes an outage. The Vercel owner should also stop Production traffic using the available project control. Do not improvise data edits.
3. Preserve logs and identify the deployment and migration state. Do not run reset, seed, or speculative repair SQL.
4. Use Neon Time Travel/restore preview against a separate branch to inspect candidate recovery points.
5. Decide between forward repair, application rollback, or provider restore with the incident owner and a second reviewer.
6. Rotate credentials, update only the Production Vercel scope, redeploy, verify the fingerprint, and reopen traffic after approval.

## Non-Destructive Production Smoke Checklist

- [ ] Rollback/escalation owner is named and available.
- [ ] `pnpm db:fingerprint` matches the approved Production fingerprint without printing a URL.
- [ ] `pnpm db:status` is clean.
- [ ] Public application shell loads.
- [ ] Authentication entry route `/admin` loads without signing in.
- [ ] Public intake `/` and `/embed` load, but no form is submitted.
- [ ] Protected routes deny an unauthenticated request.
- [ ] A read-only provider/Prisma health query succeeds only if an approved diagnostic exists; otherwise record this item as not available rather than opening an authenticated page.
- [ ] Logs contain no database-target mismatch or safety error.
- [ ] No test lead, default identity, installer, membership, upload, proposal, or generated file was created.
- [ ] No seed, reset, intake submission, portal upload, proposal generation, or smoke write was attempted.

Authenticated dashboard reads are excluded until the implicit setup upserts documented in `DATABASE_ENVIRONMENT_SAFETY.md` are removed. In isolated Preview, the same checklist may include test sign-in, test submissions, and cleanup of Preview-owned records.
