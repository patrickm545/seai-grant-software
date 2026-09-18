# PR #45 ADR-0024 Windows Guarded Database Launcher Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-WINDOWS-GUARDED-DB-LAUNCHER-2026-08-17 |
| Status | Repository repair validated; no Production operation performed |
| Owner | Clada Systems Engineering |
| Review cycle | After guarded database-launcher changes |
| Last reviewed | 2026-08-17 |
| Approved repair baseline | `01475ac625864acaa14516666c000b900c053ad3` |
| Closed reconciliation | `CHG-2026-08-17-ADR0024-PASSWORD-RESET-RECONCILIATION` |
| Authoritative evidence baseline | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19` |

## Closed Reconciliation Boundary

The password-reset reconciliation is permanently closed. It stopped during
its disposable PostgreSQL rehearsal, before Production credentials were
loaded and before any Production connection, query, SQL, migration,
deployment or alias movement. Its retained boundary reports
`WINDOWS_LAUNCHER_HANDOFF_FAILURE`, repository exit `1`, and no Production
access.

The external boundary and rehearsal diagnostic remain outside Git under the
closed change record. Their SHA-256 digests are respectively
`c093a8933e0be813d96ecb649113885f300c2d5c6c55ff4455cac6e6366867b2`
and
`a8dd4bbf3f72e4589bc463d587e98253e79a7c730d6eb830778899c25ace11a6`.
This repair does not reopen or retry that operation. A future Production
reconciliation requires a new explicit authorisation.

## Root Cause

The failure originated in `scripts/run-database-command.ts` at the process
boundary used by `runVerifier('preflight')`. The former helper passed
`process.execPath` and a separate argument array to `spawnSync` while setting
`shell: process.platform === 'win32'`.

On Windows, Node therefore constructed a shell command instead of launching
the executable directly. The executable was
`C:\Program Files\nodejs\node.exe`; shell parsing treated the unprotected
space as a command boundary and attempted to execute `C:\Program`. The child
verifier never started. POSIX hosts did not expose the defect because the old
branch selected `shell:false` outside Windows.

A focused harmless reproduction at the approved baseline returned:

```text
'C:\Program' is not recognized as an internal or external command
MIGRATION_LINEAGE_VERIFIER_FAILED: mode=strict-preflight exitCode=1
```

## Repair

`lib/fixed-database-command-launcher.ts` now owns the guarded child-process
boundary. It reuses the existing fixed-launcher Node resolution and argv
validation, resolves repository scripts and the installed Prisma JavaScript
entry point deterministically, validates the Prisma package identity, and
launches only enumerated operations.

The resulting architecture is:

```text
run-database-command.ts
  -> fixed, enumerated verifier / Prisma / seed operation
  -> resolved Node executable
  -> exact argv array
  -> spawnSync(..., shell:false)
```

The runner accepts no executable or script path from the caller. Verifier
modes and Prisma operations are fixed unions with runtime allowlists. Paths
with spaces remain single process-boundary values; metacharacters in
environment values cannot become commands. Spawn errors expose only a safe OS
error code. Existing verifier exits, including typed non-zero exits, remain
the authoritative child status. Database identity guards, strict preflight,
Prisma deployment ordering, strict postflight, attestation semantics and
migration acceptance are unchanged.

The harmless command `node --import tsx
scripts/smoke-guarded-database-launcher.ts` prints only:

```text
guarded launcher OK
```

## Windows Validation

The repaired smoke ran on the same class of Windows environment that exposed
the defect:

| Property | Result |
| --- | --- |
| Windows PowerShell | `5.1.26100.8875` |
| CLR | `4.0.30319.42000` |
| Node | `v24.14.1` |
| Resolved executable | `C:\Program Files\nodejs\node.exe` |
| Executable contains spaces | Yes |
| Shell | `false` |
| Result | `guarded launcher OK`, exit `0` |

No `C:\Program` truncation occurred. Synthetic tests also cover PowerShell,
`cmd.exe`, Windows Terminal and VS Code environment markers without invoking
those shells.

## Disposable PostgreSQL Rehearsal

A new local PostgreSQL 18 cluster was created at loopback port `55434` with
database `clada_launcher_rehearsal` and fingerprint
`db_56c71f251883c4cd`. The fingerprint differed from the pinned Production,
Preview and Development fingerprints. No persistent environment URL or
Production credential was used.

Fifteen canonical migrations through
`20260722190000_manual_lead_creation` were applied as disposable preparation.
The repaired normal runner then executed `migrate-test` end to end:

1. strict preflight returned `verified-clean`, applied count `15`, and the
   sole pending migration
   `20260724180000_password_reset_foundation`;
2. the fixed Prisma entry point applied that migration once;
3. strict postflight returned `verified-clean`, applied count `16`, schema
   fingerprint
   `685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343`,
   and an empty pending set.

The target ledger row used canonical checksum
`cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7`,
one applied step, present start and finish timestamps, no rollback, and no
logs. The `PasswordResetRequest` table, both password-reset enums, all seven
expected indexes and the restrictive `User` foreign key were present. Prisma
validation and all 68 disposable PostgreSQL integration tests passed. The
server was stopped, readiness returned no response, and the exact temporary
directory was removed.

## Validation

- Focused launcher/security/lineage set: 66 passed, 0 failed.
- Full unit/platform/security set: 507 passed, 0 failed.
- Disposable PostgreSQL integration: 68 passed, 0 failed.
- Windows guarded-launcher, existing package-launcher and diagnostic-retention
  smokes: passed.
- ESLint and TypeScript: passed.
- Prisma schema validation and production build without deployment: passed.
- Migration manifest and immutable history verification: passed for all 16
  migrations.
- Active attestation validation: passed.

The migration SQL, manifest, R19 evidence, seven checksum tuples, pilot-auth
historical state, active attestation evidence, Production fingerprint and
password-reset migration contents were not changed. R19 remains authoritative
and permanently closed. This repository repair supplies no Production
execution authority.
