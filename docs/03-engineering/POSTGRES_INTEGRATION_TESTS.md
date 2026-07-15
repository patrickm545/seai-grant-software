# PostgreSQL Integration Tests

| Field | Value |
| --- | --- |
| Document ID | ENG-POSTGRES-INTEGRATION-TESTS-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When database test strategy changes |
| Last reviewed | 2026-07-15 |

## Purpose

Database-backed integration tests prove Prisma migrations, constraints, and tenant-boundary helpers against real PostgreSQL rather than only inspecting generated query objects.

## Configuration

The integration test runner requires `TEST_DATABASE_URL`.

The runner requires explicit test classification and fingerprint metadata. It rejects the positive Production fingerprint and rejects a test target that resolves to the same host/database/branch identity as `DATABASE_URL`, even when credentials differ. It validates before connecting, maps the accepted `TEST_DATABASE_URL` to `DATABASE_URL`, runs guarded `prisma migrate deploy`, then executes tests under `tests/integration`.

Example local setup with PostgreSQL running on localhost:

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/clada_platform_11_test?schema=public'
$env:TEST_DATABASE_ENVIRONMENT='test'
$env:TEST_DATABASE_FINGERPRINT='db_value_from_a_temporary_db_fingerprint_check'
$env:PRODUCTION_DATABASE_FINGERPRINT='db_approved_production_marker'
$env:PREVIEW_DATABASE_FINGERPRINT='db_approved_preview_marker'
$env:DEVELOPMENT_DATABASE_FINGERPRINT='db_approved_development_marker'
pnpm test:integration:postgres
```

## Rules

- Do not point `TEST_DATABASE_URL` at production or shared customer data.
- Use a disposable database per local run or CI job.
- Let migrations create the schema; do not hand-create tables for integration tests.
- Integration tests must clean up their own test records.
- Do not claim tenant-isolation integration tests passed unless they executed against PostgreSQL.
- Create and destroy the local database using an independently reviewed local PostgreSQL procedure; this repository intentionally does not automate provider provisioning or deletion.
- See [DATABASE_OPERATIONS_RUNBOOK.md](DATABASE_OPERATIONS_RUNBOOK.md) for fingerprinting and CI requirements.

## Related Documents

- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)
- [../06-sprints/PLATFORM_RELEASE_1_1_IDENTITY_AND_ORGANISATION.md](../06-sprints/PLATFORM_RELEASE_1_1_IDENTITY_AND_ORGANISATION.md)
