# ADR-0024 Password-Reset Pre-Production Validation Gate Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PREPRODUCTION-VALIDATION-GATE-2026-08-18 |
| Status | Validated repository-only repair |
| Owner | Patrick McKenna |
| Review cycle | Before each separately authorised password-reset Production reconciliation |
| Last reviewed | 2026-08-18 |
| Approved baseline | `d8a8dc1b8fbd6beebb89344f458366fc43b4a7ba` |
| Closed operation | `CHG-2026-08-18-ADR0024-PASSWORD-RESET-PROD-RECONCILIATION-R2` |
| Authoritative lineage baseline | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19` |

## Decision

R2 is permanently closed. It stopped before Production access because two
bounded disposable PostgreSQL attempts were inconclusive and whole-repository
Markdown lint mixed unchanged historical debt with the validation scope. This
repository-only repair makes both gates deterministic and fail-closed. It does
not reopen R2, authorise a Production operation or change ADR-0024 acceptance.

The repaired gate is invoked with:

```text
npm run validate:preproduction
```

The command must start without `DATABASE_URL`. Its only database is a fresh
loopback PostgreSQL cluster under a uniquely named operating-system temporary
directory. A future Production operation requires a new change ID, an exact
new repository head and separate approval.

## Disposable PostgreSQL Diagnosis

The approximately 244-second and 654-second R2 attempts both stopped at the
local PostgreSQL launcher handoff. PostgreSQL itself reached Ready in under one
second. Neither attempt reached `createdb`, Prisma, the lineage verifier or the
integration suite.

On Windows, `pg_ctl.exe` starts PostgreSQL through a background `cmd.exe`
process. The R2 PowerShell command captured the launcher's output through a
pipeline. A descendant retained the captured stdout pipe handle, so PowerShell
waited indefinitely for end-of-file even after `pg_ctl` and PostgreSQL reported
successful startup. The outer bounds ended the attempts. This was a process
handle-inheritance defect, not database or test-suite slowness.

The repair invokes each executable directly with a fixed argument array and
`shell:false`. The PostgreSQL start and stop boundaries use ignored standard
streams because their durable diagnostics already go to the fixed PostgreSQL
log. No descendant can retain a parent-captured pipe. Every other stage retains
and mirrors output for exact failure diagnostics.

## Measured Timing

The final repaired disposable run completed in 46.5 seconds on the repair
host. The two R2 runs never left startup and ended at their outer bounds. An
earlier instrumented proof took 62.8 seconds; both healthy measurements are
comfortably inside every stage limit.

| Stage | R2 observation | Repaired duration |
| --- | --- | --- |
| Database initialization | Reached | 9,123 ms |
| Database startup | PostgreSQL Ready in about 0.45-0.54 seconds; parent remained blocked | 454 ms |
| Database creation | Not reached | 531 ms |
| Canonical pre-target migrations | Not reached | 1,348 ms |
| Strict preflight | Not reached | 2,585 ms |
| Guarded password-reset rehearsal | Not reached | 6,333 ms |
| Independent strict postflight | Not reached | 2,624 ms |
| Integration suite | Not reached | 20,605 ms |
| Database cleanup stop | Outer cleanup only | 1,919 ms |

The integration stage included its normal no-op migration check and all 68
database-backed integration tests across 13 files. The slowest file in the
final run took 3.1 seconds. No test was removed, skipped or moved to a
persistent database.

## Bounded Timeout Policy

| Boundary | Limit | Failure behavior |
| --- | --- | --- |
| Database initialization | 60 seconds | Exact `database-initialization` timeout |
| Database startup/readiness | 30 seconds | Exact startup/readiness timeout and process-tree termination |
| Database creation | 30 seconds | Exact `database-creation` timeout |
| Canonical migration application | 180 seconds | Exact migration-stage timeout |
| Each verifier | 90 seconds | Exact preflight or postflight timeout |
| Guarded password-reset rehearsal | 360 seconds | Exact guarded-rehearsal timeout |
| Each integration test file | 300 seconds | Exact numbered file-stage timeout |
| Complete integration suite | 900 seconds | Exact `integration-suite` timeout |
| Database stop and port closure | 30 seconds each | Cleanup failure is retained separately |

The outer disposable stage has a 30-minute safety ceiling. It does not replace
the smaller authoritative per-stage limits. Timeout handling terminates the
child process tree and reports the exact stage. Cleanup runs from a `finally`
boundary after success or failure, verifies the port is closed, and removes
only a real system-temp child whose name has the fixed
`clada-adr0024-preproduction-` prefix.

## Password-Reset Rehearsal

The repaired gate creates a pre-target database from the first 15 canonical
migrations and proves that the sole pending migration is:

```text
20260724180000_password_reset_foundation
```

Its immutable checksum remains:

```text
cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7
```

Strict preflight returned verified-clean with 15 applied migrations. The
normal guarded `migrate-test` path applied the target exactly once and ran its
own strict preflight and postflight. An independent strict postflight then
returned verified-clean with 16 applied migrations, no pending migrations and
schema fingerprint
`685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343`.
The existing versioned catalog assertions verify the password-reset table,
enum, indexes and foreign key. The full integration suite also passed.

The evidence explicitly records that ordinary Production checksum-divergence
tuples and `attestedHistoricalResolvedMigration` were not applicable. The gate
does not run `migrate resolve`, manual SQL or any Production operation.

## Markdown Debt Gate

The approved baseline contains 79 pre-existing Markdown violations:

- 78 `MD060` violations in
  `docs/03-engineering/PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md`;
- one `MD036` violation in
  `docs/product/audits/SOLARGRANT_PRO_PILOT_READINESS_AUDIT_V1.md`.

The checked-in baseline pins the exact baseline commit, tool version, rule
configuration and complete normalized violation set. The gate lints every
repository document, requires every Markdown file changed since the approved
baseline to be clean, and rejects every violation absent from the baseline.
Resolved legacy debt may disappear, but no new debt may appear. Neither
`MD060` nor `MD036` is disabled.

## Validation Scope Preserved

The single pre-production command keeps all substantive gates mandatory:
focused launcher, retention, lineage, attestation and security tests; the full
unit/platform/security suite; ESLint; TypeScript; Prisma schema validation;
production build without deployment; manifest and immutable-history checks;
active attestation validation; Markdown baseline validation; internal links;
metadata; JSON; secret scanning; `git diff --check`; and the disposable
PostgreSQL rehearsal.

The R19 attestation remains active with two retained captures and one human
approval. Its evidence, migration SQL, manifest and acceptance semantics are
unchanged. R2 made no Production connection, query, migration, deployment or
alias movement. This repair also made none.

## Complete Repaired Gate Result

The final pre-production invocation completed in 128.2 seconds and passed:

| Validation | Result |
| --- | --- |
| Focused gate, launcher, security, retention, lineage and attestation tests | 78 passed |
| Full unit, platform and security suite | 513 passed |
| Disposable PostgreSQL integration | 68 passed; 46.5-second complete database gate |
| Strict preflight and postflight | Verified clean |
| ESLint and TypeScript | Passed |
| Prisma schema validation | Passed |
| Production build without deployment | Passed |
| Manifest and immutable migration history | Passed |
| Active attestation validation | Passed |
| Markdown changed-file validation | Four changed documents clean |
| Markdown baseline | 79 pre-existing; zero new |
| Internal links, metadata, JSON, secret scan and diff check | Passed |

The build and ESLint stages run through the pinned Corepack/pnpm executable
with fixed arguments and `shell:false`. The build stage additionally treats an
ESLint-load diagnostic as fatal even if a framework subprocess returns zero.
