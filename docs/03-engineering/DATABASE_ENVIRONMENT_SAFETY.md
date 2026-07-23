# Database Environment Safety

| Field | Value |
| --- | --- |
| Document ID | ENG-DATABASE-ENVIRONMENT-SAFETY-001 |
| Status | Active; provider isolation configured, recovery evidence pending |
| Owner | Clada Systems Engineering; Production configuration owner: Patrick or delegated deployment owner |
| Review cycle | Every database or deployment change |
| Last reviewed | 2026-07-23 |

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

## Manual Lead Privacy Enablement

`APP_ENV` also supplies the authoritative classification for the Platform Release 1.5 PR 2 Manual Lead Creation gate. The separate `MANUAL_LEAD_CREATION_ENABLED` value must equal the exact lower-case string `true`; missing, false, invalid, ambiguous, whitespace-padded, differently cased, or loose-truthy values remain disabled. An absent or unsupported `APP_ENV` also disables the feature.

The same explicit rule applies to Production, Preview, Development, and test. Production and Preview default closed because either may contain real customer data. Development and test are not implicitly trusted: they must opt in explicitly, and integration execution separately proves a disposable database before the runner supplies the test-only value. Enabling Production or Preview requires a recorded Project Shield decision plus the relevant company/privacy owner’s approval; test success alone is insufficient. Rollback removes or changes the value from exact `true`. The UI then removes active entry points, the canonical page reports controlled unavailability, and the protected service rejects direct calls before replay lookup or writes.

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

## Provider Configuration Evidence

Provider isolation was verified on 2026-07-16 for Vercel project `seai-grant-software` and Neon project `seai-grant-db`:

- Neon `main` is the Production branch (`br-cool-wave-abysq3lu`), `preview` is the persistent Preview branch (`br-rough-firefly-abs3tpq4`), and `development` is the persistent Development branch (`br-tiny-feather-ab45i5tq`). No branch was created, reset, deleted, renamed, or recreated during verification.
- The safe fingerprints are Production `db_4e1d3bd23cff6801`, Preview `db_31449de1074844bb`, and Development `db_04701984b484da4b`. All three were computed through `lib/database-safety.ts`, match their supplied branch URLs, and are distinct.
- Vercel has one `DATABASE_URL` record per environment. The former multi-scope record was narrowed in place to Production before the separate Preview and Development records were added; the Production value was not overwritten or exposed.
- The required classification, fingerprint, branch, and positive Production marker variables are configured in each scope. Persistent Preview and Development fingerprint markers are limited to the Development/integration-runner scope. No `TEST_DATABASE_URL` is configured.
- A clean-cache Preview deployment completed successfully at `seai-grant-software-r25e9dktw-patrick-mc-kennas-projects.vercel.app`. The build compiled, typechecked, generated all pages, and became Ready without `DB_IDENTITY_MISSING`, `DB_ENV_MISMATCH`, `DB_FINGERPRINT_MISMATCH`, or `DB_PRODUCTION_TARGET_FORBIDDEN`.
- Read-only checks loaded `/`, `/embed`, and `/admin`; unauthenticated `/admin/dashboard` redirected to `/admin`. No form, authentication, database diagnostic, migration, seed, reset, upload, proposal, or Production deployment was attempted.

Production branch protection remains unverified where the current Neon plan exposes no enabled protection control. Backup/PITR retention and a non-Production recovery rehearsal also remain pending. A deliberately mismatched live Preview deployment was not created because the repository tests already prove fail-closed mismatch behaviour and changing a live provider value would add avoidable configuration risk. Production must not be redeployed until its mapping is reviewed by a second person.

Repository and provider environment isolation mitigate TD-015. TD-015 remains open as **Mitigated; recovery evidence pending**.

## Known Limitation: Reads That Write

Authenticated dashboard reads no longer bootstrap installer or membership records. Pilot organisations and owners are created only through the guarded `pnpm pilot:provision` command documented in [PILOT_AUTHENTICATION.md](PILOT_AUTHENTICATION.md).
