# Database Environment Safety

| Field | Value |
| --- | --- |
| Document ID | ENG-DATABASE-ENVIRONMENT-SAFETY-001 |
| Status | Active; provider configuration pending |
| Owner | Clada Systems Engineering; Production configuration owner: Patrick or delegated deployment owner |
| Review cycle | Every database or deployment change |
| Last reviewed | 2026-07-15 |

## Environment Model

`APP_ENV` is the authoritative application classification. Valid values are `production`, `preview`, `development`, and `test`. `NODE_ENV` and `VERCEL_ENV` are not substitutes because Preview and Production can both use optimised builds.

The required mapping is:

```text
Vercel Production -> APP_ENV=production -> Production Neon branch/database
Vercel Preview    -> APP_ENV=preview    -> Preview Neon branch/database
Local development -> APP_ENV=development -> Development Neon branch/database or local PostgreSQL
Integration tests -> APP_ENV=test at runner execution -> disposable test database
```

The reusable guard in `lib/database-safety.ts` requires:

- `DATABASE_ENVIRONMENT`: classification of the primary target; it must equal `APP_ENV`.
- `DATABASE_FINGERPRINT`: expected fingerprint for the primary target.
- `PRODUCTION_DATABASE_FINGERPRINT`: positive identity marker for the single approved Production target. Set the same value in all scopes.
- `PREVIEW_DATABASE_FINGERPRINT` and `DEVELOPMENT_DATABASE_FINGERPRINT`: known persistent-target markers required in local/CI integration-test configuration, not application runtime.
- `DATABASE_BRANCH_ID`: optional safe Neon branch identifier used in diagnostics. It must use only letters, numbers, `_`, or `-`; it deliberately cannot alter the fingerprint.
- `DATABASE_URL`: secret connection URL. It is parsed but never printed.

The fingerprint is `db_` plus the first 16 hexadecimal characters of SHA-256 over normalised host, port, and database name. Username, password, query parameters, and the operator-supplied branch label are excluded. Compute it locally with `pnpm db:fingerprint`; the command prints only safe identity fields.

## Positive Production Marker

A non-Production label is not proof of safety. Every guarded operation compares the computed target with `PRODUCTION_DATABASE_FINGERPRINT`. A non-Production target that resolves to that fingerprint is rejected. A database labelled `production` that does not match it is also rejected.

Keep the Production fingerprint non-secret but change-controlled. It must be calculated from the verified Production connection target and branch identifier by the deployment owner. Never copy the Production URL into a non-Production scope.

## Vercel Variable Mapping

Vercel variables apply only to new deployments after a change. Configure and redeploy each scope independently as described by [Vercel environment variables](https://vercel.com/docs/environment-variables).

| Vercel scope | Values |
| --- | --- |
| Production | `APP_ENV=production`; Production `DATABASE_URL`; `DATABASE_ENVIRONMENT=production`; Production `DATABASE_FINGERPRINT`; Production `DATABASE_BRANCH_ID`; shared `PRODUCTION_DATABASE_FINGERPRINT` |
| Preview | `APP_ENV=preview`; Preview-only `DATABASE_URL`; `DATABASE_ENVIRONMENT=preview`; Preview `DATABASE_FINGERPRINT`; Preview `DATABASE_BRANCH_ID`; shared `PRODUCTION_DATABASE_FINGERPRINT` |
| Development | `APP_ENV=development`; Development-only `DATABASE_URL`; `DATABASE_ENVIRONMENT=development`; Development `DATABASE_FINGERPRINT`; Development `DATABASE_BRANCH_ID`; shared `PRODUCTION_DATABASE_FINGERPRINT` |

Configure `PREVIEW_DATABASE_FINGERPRINT` and `DEVELOPMENT_DATABASE_FINGERPRINT` only where the integration runner executes (developer/CI configuration). They let the runner reject persistent non-Production targets without loading their URLs.

Do not select multiple Vercel scopes for a `DATABASE_URL`. Inspect branch-specific Preview overrides so none inherit the Production URL. After changing values, create fresh deployments; old deployments retain their previous values.

## Neon Mapping

The minimum pilot layout is one protected Production branch/database plus distinct persistent Preview and Development branches. Disposable tests use a separate test branch/database that may be recreated manually per CI job or local test run. Neon branches are isolated copies, but branches created from Production can contain Production data; do not use customer-bearing copies for destructive tests unless data handling has been separately approved.

Production should be marked as a Neon protected branch when the subscribed plan supports it. Neon documents that protected branches cannot be deleted or reset and child branches receive new role passwords. See [Neon protected branches](https://neon.com/docs/guides/protected-branches).

## Runtime And Command Failure

When `DATABASE_URL` is present, Prisma client initialisation validates the environment/fingerprint contract before a connection can be used. This blocks the known `APP_ENV=preview` plus Production target combination at startup. Database wrappers apply the same guard before Prisma CLI, seed, reset, and integration-test execution.

Failures exit non-zero and include operation, application/database classifications, safe host/database label, and fingerprint. They never include credentials, URL query parameters, or a complete connection URL.

## Provider Configuration Checklist (Manual And Pending)

Patrick or the delegated deployment owner must:

1. Name and record the Neon Production, Preview, Development, and disposable test branch/database IDs.
2. Verify Production branch protection and role separation in Neon.
3. Compute and record each fingerprint from the intended connection target.
4. Configure the exact Vercel scopes above and remove any multi-scope Production `DATABASE_URL`.
5. Redeploy Preview and confirm startup succeeds; deliberately test a safe mismatched fingerprint and confirm startup fails before restoring the correct value.
6. Redeploy Production only after the Production mapping has been reviewed by a second person.
7. Record screenshots or exported configuration evidence without connection strings or credentials.

Repository guardrails mitigate TD-015, but TD-015 remains blocked on this provider configuration and recovery evidence.

## Known Limitation: Reads That Write

`requireDefaultInstallerOrganisationContext()` currently calls `ensureDefaultInstallerWithOrganisation()`, which upserts the default installer, organisation, internal admin user, and memberships during authenticated dashboard/page reads. Production smoke testing must not open those authenticated data pages until the expected records exist and the next authentication/onboarding PR removes this implicit bootstrap path. This is a named blocker for `Authenticate pilot users into one verified installer organisation`; it is not expanded into identity work here.
