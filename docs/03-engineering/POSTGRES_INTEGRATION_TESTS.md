# PostgreSQL Integration Tests

| Field | Value |
| --- | --- |
| Document ID | ENG-POSTGRES-INTEGRATION-TESTS-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | When database test strategy changes |
| Last reviewed | 2026-07-10 |

## Purpose

Database-backed integration tests prove Prisma migrations, constraints, and tenant-boundary helpers against real PostgreSQL rather than only inspecting generated query objects.

## Configuration

The integration test runner requires `TEST_DATABASE_URL`.

The database name must include `test`, `ci`, `tmp`, or `temp`; the runner refuses to execute against other database names. The runner maps `TEST_DATABASE_URL` to `DATABASE_URL`, runs `prisma migrate deploy`, then executes tests under `tests/integration`.

Example local setup with PostgreSQL running on localhost:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -p 5432 -U postgres -d postgres -c 'DROP DATABASE IF EXISTS clada_platform_11_test WITH (FORCE);'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -p 5432 -U postgres -d postgres -c 'CREATE DATABASE clada_platform_11_test;'
$env:TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/clada_platform_11_test?schema=public'
pnpm test:integration:postgres
```

## Rules

- Do not point `TEST_DATABASE_URL` at production or shared customer data.
- Use a disposable database per local run or CI job.
- Let migrations create the schema; do not hand-create tables for integration tests.
- Integration tests must clean up their own test records.
- Do not claim tenant-isolation integration tests passed unless they executed against PostgreSQL.

## Related Documents

- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)
- [../06-sprints/PLATFORM_RELEASE_1_1_IDENTITY_AND_ORGANISATION.md](../06-sprints/PLATFORM_RELEASE_1_1_IDENTITY_AND_ORGANISATION.md)
