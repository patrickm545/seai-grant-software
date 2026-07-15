# Database Operations Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-DATABASE-OPERATIONS-RUNBOOK-001 |
| Status | Active; provider verification pending |
| Owner | Clada Systems Engineering; incident and Production execution owner: Patrick or delegated deployment owner |
| Review cycle | Before every Production database release and quarterly recovery rehearsal |
| Last reviewed | 2026-07-15 |

## Guarded Commands

| Command | Intended target | Notes |
| --- | --- | --- |
| `pnpm db:fingerprint` | Any configured URL | Parses only; does not connect. Prints safe identity. |
| `pnpm db:status` | Matching environment | Read-only Prisma migration status. |
| `pnpm db:migrate:development` | Development | Prisma `migrate dev`; never Preview or Production. |
| `pnpm db:migrate:preview` | Preview | Runs guarded status, deploy, then clean status. |
| `pnpm db:migrate:test` | test | Runs guarded status, deploy, then clean status. |
| `pnpm db:migrate:production` | Production | Dedicated deliberate path below. |
| `pnpm db:seed:development` / `pnpm db:seed:test` | Development/test | Seed is never allowed in Preview or Production. |
| `pnpm db:reset` | Development/test | Also requires `ACKNOWLEDGE_DATABASE_RESET=RESET_DISPOSABLE_DATABASE`. |
| `pnpm test:integration:postgres` | disposable test | Uses `TEST_DATABASE_URL`, applies migrations, and runs database tests. |

Raw `prisma migrate`, reset, and seed commands are operationally unsupported. Review one-off mutation scripts against `assertDatabaseOperationAllowed` using the `one-off-mutation` operation before execution.

## Migration Gate

For Preview/test, verify the safe identity, run the named migration command, and retain its exit status. The wrapper runs `prisma migrate status` before deployment, proceeds only if status is clean or reports pending repository migrations without a failed-migration signal, deploys, then requires a clean status.

For Production:

1. Confirm the approved commit/PR and assign a change identifier.
2. Confirm a recent recovery point and named rollback/escalation owner.
3. Export the Production-scoped variables into a controlled, non-shared operator shell. Do not echo them.
4. Run `pnpm db:fingerprint` and compare the safe fingerprint with the approved Production record.
5. Run `pnpm db:status`. Investigate any failed state; do not continue.
6. Set `PRODUCTION_MIGRATION_CHANGE_ID` to the approved PR/change reference.
7. Set `ACKNOWLEDGE_PRODUCTION_MIGRATION=APPLY_APPROVED_PRODUCTION_MIGRATIONS`.
8. Run `pnpm db:migrate:production` once. Preserve the output and exit code without storing credentials.
9. Run `pnpm db:status` again and require a clean result.
10. Follow the non-destructive smoke checklist below.

The Production command never resets or seeds. Prisma migrations are forward operations and are not automatically reversible. Rollback means a reviewed forward repair, application rollback when schema-compatible, or provider recovery after an incident decision.

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

No restore was performed as part of this repository change. Provider verification and rehearsal are manual and pending.

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
