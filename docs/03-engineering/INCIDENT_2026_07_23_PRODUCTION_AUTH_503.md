# Incident 2026-07-23 - Production Authentication 503

| Field | Value |
| --- | --- |
| Document ID | ENG-INCIDENT-2026-07-23-PRODUCTION-AUTH-503 |
| Status | Production service restored; successful pilot-user smoke approval pending |
| Severity | High - pilot authentication unavailable |
| Incident owner | Clada Systems Engineering; Production execution owner Patrick |
| Affected commit | `0f438efd8453b3bc68d6456fd2ca30a528865cf7` |
| Affected deployment | `dpl_4XA7MifjdScwRf2Wn3TENvutzBtC` |
| Last reviewed | 2026-07-23 |

## Detection And Impact

After PR #36 merged, `POST /api/auth/login` returned the generic fail-closed
response `503 {"error":"Sign-in is temporarily unavailable."}`. Invalid
credentials normally return 401, so the 503 established that authentication
infrastructure threw before a safe credential decision completed.

The affected deployment was
`seai-grant-software-e9yk4gsk3-patrick-mc-kennas-projects.vercel.app`, a Ready
Production deployment from commit
`0f438efd8453b3bc68d6456fd2ca30a528865cf7`. Pilot users could not establish
new sessions. Public error handling did not expose database or configuration
details.

## Exact Root Cause

The deployed Prisma client expected four committed migrations that had not been
applied to Production:

1. `20260718130000_tenant_provisioning_data_model`
2. `20260718150000_tenant_first_login_activation`
3. `20260720100000_tenant_operator_recovery`
4. `20260722190000_manual_lead_creation`

The first missing migration adds `User.mustChangePassword`. The login query
selects the Prisma `User` shape before credential validation, so PostgreSQL
rejected the query because that column did not exist. The route caught the
infrastructure exception and correctly returned a generic 503.

PR #36 introduced the fourth missing migration, but the incident was not limited
to that migration. Production had stopped at the earlier pilot-auth boundary.
The release process validated all 15 migrations only in disposable PostgreSQL
and deployed the new application without first proving or advancing the
Production migration state.

Production also contains the completed legacy ledger entry
`20260423093000_application_pack_admin_fields`, which is absent from the current
repository. Prisma reported this history divergence while migrations were
pending. It did not cause the login query failure, but it is a residual migration
provenance risk.

## Safe Runtime Evidence

At `2026-07-23T15:02:41.372Z`, request
`gpb9d-1784818961372-10fa63cca403` produced:

```text
POST /api/auth/login -> 503
prisma:error Invalid prisma.user.findUnique() invocation:
The column User.mustChangePassword does not exist in the current database.
```

The excerpt contains no credential, password, session token, database URL, or
customer data.

## Timeline

| UTC time | Event |
| --- | --- |
| 2026-07-23 14:43:47 | PR #36 merged as `0f438efd8453b3bc68d6456fd2ca30a528865cf7`. |
| 2026-07-23 14:43:49 | Affected Production deployment created and became Ready. |
| 2026-07-23 15:02:41.372 | Correlated login request failed with the missing-column exception and returned 503. |
| 2026-07-23 15:28:25.427 | Guarded pre-change integrity checkpoint captured; Neon six-hour PITR window verified. |
| 2026-07-23 15:28-15:29 | Dedicated guarded Production command applied the four pending committed migrations and required clean status. |
| 2026-07-23 15:29:00.653 | Post-change counts and hashes matched the checkpoint; controlled wrong credentials returned 401 and created no session. |

## Migration State Before And After

The read-only guard proved:

- `APP_ENV=production`;
- `DATABASE_ENVIRONMENT=production`;
- Production branch marker `main`;
- computed and expected fingerprint `db_4e1d3bd23cff6801`;
- no pending migration artifact, index, constraint, enum, table, or column was
  partially present;
- no currently unfinished or unrolled-back failed migration existed;
- one historical `20260428120000_manual_submission_prep` attempt was rolled back
  and followed by its completed ledger record;
- last common repository migration was
  `20260716183000_pilot_installer_auth`;
- the four migrations listed above were pending.

The approved command applied those four migrations in repository order. Its
post-check found 15 repository migrations and reported `Database schema is up
to date!`. No migration was edited, resolved, reset, seeded, or manually
replayed. The database-only legacy ledger entry remains unchanged.

## Recovery And Rollback Evidence

Neon Production `main` exposed a continuous six-hour history window. The
pre-change timestamp `2026-07-23T15:28:25.427Z` is the recovery checkpoint. The
current Free plan showed one existing manual snapshot and no additional
snapshot slot; the existing snapshot was not deleted or altered.

Static review of all four pending SQL files found no `DROP TABLE`, `DROP
COLUMN`, `DROP TYPE`, destructive index/constraint removal, `TRUNCATE`, or
`DELETE FROM`. Duplicate pending artifact names and partial residue were absent.

If the forward migration had failed or integrity evidence had changed, the
incident path was to stop writes and use Neon point-in-time recovery for the
recorded timestamp under a separately approved provider restore decision. No
restore was required.

## Data Integrity Evidence

The following safe aggregates were identical before and after recovery:

| Evidence | Before | After |
| --- | ---: | ---: |
| Organisations | 2 | 2 |
| Users | 2 | 2 |
| Memberships | 2 | 2 |
| Leads | 32 | 32 |
| Workflow instances | 32 | 32 |
| Lead activities | 55 | 55 |
| Audit records | 30 | 30 |
| Auth sessions | 0 | 0 |
| Existing lead-fact hash | `6a8ff4360f4a96d41002d2a4884b18eb` | `6a8ff4360f4a96d41002d2a4884b18eb` |
| Workflow hash | `c798389afedf55deb79523b215720807` | `c798389afedf55deb79523b215720807` |

Hashes were computed in the database and only the digests were emitted. No
customer values were printed. New migration-owned classification and derived
columns were excluded from the existing lead-fact comparison.

## Authentication Recovery Evidence

- A controlled unknown user and wrong password returned the generic 401
  response after migration, rather than 503.
- The authentication query therefore completed against the recovered schema.
- Auth session count stayed zero, proving that the invalid attempt created no
  session.
- Automated regression coverage proves a successful authentication result sets
  a secure, HTTP-only session cookie and an infrastructure exception returns
  only the generic 503.
- Automated PostgreSQL integration coverage proves valid pilot credentials
  create a durable session and resolve the single organisation context.

A real approved Production pilot login was not performed because no pilot
credential was exposed to or available in this incident workspace. The
Production owner must complete that controlled smoke test and confirm the
resolved organisation before closing the incident.

## Commands Used

Secrets were injected by Vercel or a temporary ignored environment file, never
printed, and the temporary file was removed after use.

```text
vercel inspect <affected-deployment> --scope <team>
vercel logs <deployment-id> --since <UTC> --until <UTC> --query /api/auth/login --json
vercel env ls production --scope <team>
pnpm db:fingerprint
pnpm db:status
ACKNOWLEDGE_PRODUCTION_MIGRATION=<approved-exact-value>
PRODUCTION_MIGRATION_CHANGE_ID=INCIDENT-2026-07-23-PRODUCTION-AUTH-503
pnpm db:migrate:production
POST https://seai-grant-software.vercel.app/api/auth/login <controlled-invalid-payload>
```

No `prisma db push`, `migrate reset`, reseed, database recreation, manual SQL
mutation, credential rotation, or feature-flag enablement was performed.

## Containment And Remediation

The fail-closed 503 response was retained. The immediate remediation applied
only pending committed migrations through the repository-approved Production
wrapper. The hotfix adds:

- safe server-side authentication infrastructure logging with a bounded request
  correlation ID and error category;
- no raw exception, Prisma detail, credential, session token, URL, or PII in the
  structured log;
- regression tests for 401, generic 503, safe logging, successful session-cookie
  behavior, and missing-pepper fail-closed behavior;
- stricter migration preflight rejection for failed, ambiguous, or divergent
  histories;
- a Vercel pre-build `pnpm db:status` gate, so database state and identity must
  be clean before an application artifact can build.

## Validation

- Frozen install with pnpm 10.11.0: passed; lockfile unchanged.
- Prisma format, generate, and validate: passed.
- Typecheck: passed.
- Lint: passed.
- Unit/platform tests: 185 passed, 0 failed.
- Disposable PostgreSQL 16 fresh migration: all 15 migrations applied.
- PostgreSQL integration tests: 50 passed, 0 failed, including successful
  durable session creation, generic invalid-credential denial, single-tenant
  context, cross-tenant denial, and transaction rollback.
- Approved baseline upgrade: commit
  `3cd9ded8cc93a98ed1a0136ba13d4cc9bf63e7fd` supplied exactly 14 migrations;
  the current `20260722190000_manual_lead_creation` migration applied next and
  final status was clean.
- Production build: passed.
- Live public shell, `/admin`, and `/embed`: 200.
- Live unauthenticated `/admin/dashboard`: 307 to the login challenge.
- Controlled invalid Production login: 401 with generic body and zero session
  writes.
- Toolchain note: the repository declares Node 22.x; the available validation
  host supplied Node 24.14.1 and emitted the recorded engine warning.

## Project Shield Review

- Tenant ownership and membership data was neither reset nor rewritten.
- Existing lead and workflow facts are unchanged by count and hash.
- Public authentication errors remain generic.
- Invalid login created no session or audit/customer record.
- No secret, credential, token, database URL, password hash, or PII was placed
  in logs, documentation, tests, or commits.
- `MANUAL_LEAD_CREATION_ENABLED` was absent from the Production variable list
  and therefore remained fail-closed. It was not added or enabled.
- No Manual Lead Creation Production flow was exercised.
- Platform Release 1.5 PR3 was not started.

## Residual Risks And Required Actions

1. Production owner must perform one approved pilot-user login, confirm session
   creation, confirm the expected single installer organisation, and confirm no
   cross-tenant visibility.
2. Reconcile and document the provenance/checksum of
   `20260423093000_application_pack_admin_fields`; do not delete or resolve its
   ledger entry without a separately reviewed migration-history plan.
3. Require the Vercel migration-status build check as a protected deployment
   gate and retain migration output in release evidence.
4. Upgrade provider recovery capability or free a reviewed snapshot slot only
   through a separate change; do not delete the existing snapshot as part of
   this incident.
5. Add a controlled successful-authentication Production smoke test to every
   pilot release, using an approved test identity and auditable session cleanup
   policy.

## Prevention

Future schema releases use this order:

1. approve the exact application commit and migrations;
2. verify Production identity, backup/PITR, and migration status;
3. run the guarded Production migration command;
4. require a clean post-migration status;
5. deploy the consuming application artifact;
6. run controlled wrong-credential and approved successful-login smoke tests;
7. attach database status, deployment ID, runtime error scan, and smoke evidence
   to the release record.
