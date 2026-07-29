# PR #45 Preview Migration Lineage Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-PREVIEW-LINEAGE-REPAIR-2026-07-29 |
| Status | Implemented and validated |
| Owner | Clada Systems Engineering |
| Review cycle | Retain with PR #45 and the migration-history incident record |
| Last reviewed | 2026-07-29 |

## Scope And Safety Boundary

This record covers only the isolated Vercel Preview database used by Draft
PR #45. Production was not connected to, queried, migrated, reset, resolved,
deployed or changed. No Production evidence capture or Production database
status command ran, and no alias moved.

The guarded Preview identity was unchanged before and after repair:

```text
environment=preview
host=ep-crimson-flower-abstj9wf-pooler.eu-west-2.aws.neon.tech
database=seai_preview_pr21_20260716
branch=preview
fingerprint=db_d4111aafcb4de645
```

The Preview and Production fingerprints were distinct. A generic local Neon
integration URL resolved to the positive Production fingerprint and was
rejected by the database safety guard before any connection or query. The
Preview repair used only the non-downloadable branch-scoped `DATABASE_URL`
inside Vercel's Preview build environment. No credential or connection string
was printed or retained.

Before repair, recent Vercel deployments were terminal rather than Building or
Queued. Two repeatable-read, read-only database diagnostics found no concurrent
non-idle database session and no PostgreSQL maintenance progress.

## Root Cause

The strict verifier correctly rejected
`20260710120000_identity_organisation_foundation` because its one Preview
ledger row had checksum:

```text
c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714
```

The immutable repository manifest requires:

```text
fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3
```

The database checksum exactly matches the current 6,162-byte migration SQL
after LF line endings are converted to CRLF (6,296 bytes). The repository
checksum exactly matches the committed LF bytes pinned by `.gitattributes`.
The mismatch was therefore caused by the same current SQL being applied from a
Windows CRLF working-tree representation before the immutable raw-byte
manifest control was in force.

Neither committed historical version of the migration has the Preview ledger
checksum in its canonical LF form:

| Commit | Canonical LF checksum | Bytes |
| --- | --- | ---: |
| `c5e5d40624f5bcf77cfd985e5d6b5d15b3c41e43` | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | 6,162 |
| `63b7b2977c1015a72fc9a897668464148bee9702` | `6dc0e0ac3566eb49c46597d09e7d90e8d6c45f3d7298e46ea06deda036e832da` | 5,347 |

No repository migration was edited, rewritten or deleted.

## Original Ledger Record

The mismatch was unique; no failed or duplicate row existed for this
migration.

| Field | Original value |
| --- | --- |
| Record ID | `2906420d-fd08-4bd1-b341-03eae86d3959` |
| Migration | `20260710120000_identity_organisation_foundation` |
| Checksum | `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` |
| Started | `2026-07-16T18:11:33.556063Z` |
| Finished | `2026-07-16T18:11:33.733369Z` |
| Applied steps | `1` |
| Rolled back | `null` |
| Logs state | `none` |
| Logs digest | `null` |

The only mismatching exact-success field was `checksum`. The row was otherwise
finished, one-step, not rolled back and log-free.

## Schema And Data Findings

The actual Preview schema contained every object expected from the migration:

- all four identity/organisation enum types;
- `Organisation`, `User` and `OrganisationMembership` with all expected
  columns and primary keys;
- `Installer.organisationId` and `Lead.organisationId`;
- all expected unique and ordinary indexes;
- all expected organisation, membership, installer and composite lead foreign
  keys;
- no old `Lead_installerId_fkey`;
- no default on `InstallerQuotePricing.updatedAt` or
  `LeadDocument.updatedAt`.

There were no missing or structurally different expected tables, columns,
indexes or constraints.

The disposable Preview contained no leads, lead documents, lead activity,
provisioning operations or password-reset requests. Its non-zero rows were
limited to small Preview/test or migration-seeded identity, authentication,
audit, installer-pricing and workflow records. It contained no retained
customer workflow data that justified preserving the unreliable ledger.

## Chosen Remediation

The isolated Preview database was reset in place and rebuilt from the exact 16
immutable repository migrations. This was safer than reconciling the row
because:

- the database was disposable and contained no customer lead/document data;
- the SQL effects were fully present but the historical byte lineage was not
  exact;
- recreating the ledger from committed files is deterministic;
- `prisma migrate resolve`, manual ledger edits, manual SQL and `prisma db push`
  were neither needed nor used.

The one-time execution path was deliberately not committed. Before reset it
required:

- `APP_ENV=preview` and `DATABASE_ENVIRONMENT=preview`;
- exact database name, branch and fingerprint;
- a positive Production fingerprint distinct from the target;
- the exact original migration record and mismatch checksum;
- all 16 manifest migrations and the exact repository checksum;
- zero customer lead/document/activity/provisioning rows;
- no concurrent database activity; and
- an exact non-secret rebuild acknowledgement.

It then ran Prisma's normal reset/apply workflow with `--skip-seed`. It did not
insert, update or resolve any migration row manually.

## Commands And Evidence

Secret-free commands and operations used:

```text
git fetch origin ops/adr-0024-production-evidence-activation main
git log -- prisma/migrations/20260710120000_identity_organisation_foundation/migration.sql
pnpm db:fingerprint
pnpm db:manifest:verify
vercel inspect <preview-deployment> --logs
vercel deploy
prisma migrate reset --force --skip-seed
node --import tsx scripts/verify-migration-lineage.ts strict-postflight
```

The reset command ran only inside the fingerprint-pinned Preview repair
wrapper. The wrapper first emitted the complete secret-free read-only record
and intentionally prevented an application deployment.

| Evidence | Deployment | Result |
| --- | --- | --- |
| Initial read-only diagnosis | `dpl_zwmxVkVaLgaJpxXqWZLAULVtcdLv` | Expected diagnostic stop; no write |
| Complete schema/data diagnosis | `dpl_CDpP626BoFBFG4JeLqCDB7XFcSLU` | Expected diagnostic stop; no write |
| Guarded rebuild | `dpl_EixUfYtrxQoyhdvp7Gdaf7Edqnga` | Reset and all 16 migrations succeeded; application build intentionally absent |
| Final Git-backed Preview | `dpl_EKRwycWsgG5SMfbim6ABYQ5FxfX4` | Ready; strict preflight and postflight verified clean |

## Resulting Ledger

Prisma applied all 16 committed migrations in manifest order. The repaired
target row is:

| Field | Rebuilt value |
| --- | --- |
| Record ID | `813c1ed5-380e-4d27-9998-caab6cb1a11a` |
| Migration | `20260710120000_identity_organisation_foundation` |
| Checksum | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` |
| Started | `2026-07-29T11:33:41.34266Z` |
| Finished | `2026-07-29T11:33:41.799662Z` |
| Applied steps | `1` |
| Rolled back | `null` |
| Logs state | `none` |
| Logs digest | `null` |

The repair deployment's direct post-reset query proved 16 ledger rows and the
exact successful target record. Its later repository-inventory check failed
closed because a Vercel CLI source upload does not contain the trusted Git
metadata required by the verifier. This did not undo or invalidate the
successful rebuild. Final strict validation is therefore performed by the
normal Git-backed Preview deployment below.

## Validation

Completed local validation:

- migration manifest: pass,
  `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872`;
- immutable migration history: pass, 16 migrations;
- pending Production attestation structural validation: expected exit `21`;
- Prisma schema validation: pass;
- TypeScript: pass;
- ESLint: pass;
- unit, platform and security tests: 283 passed, including the governance-mode
  amendment tests;
- disposable PostgreSQL integration tests: 68 passed after all 16 migrations
  applied to a temporary local PostgreSQL 16 container;
- temporary PostgreSQL container: removed;
- production application build: pass;
- Markdown lint: pass;
- secret-pattern scan: pass;
- `git diff --check`: pass.

Git-backed validation:

- database safety guard: pass for Preview identity
  `db_d4111aafcb4de645`;
- strict Preview preflight: `verified-clean`;
- Prisma Preview migration inventory/status: 16 found, 16 applied, no pending
  migrations;
- strict Preview postflight: `verified-clean`;
- schema fingerprint:
  `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649`,
  verified with the `fresh-head` profile and all named assertions passing;
- application compilation, type checking, static generation and packaging:
  pass;
- Git-backed Preview deployment
  `dpl_EKRwycWsgG5SMfbim6ABYQ5FxfX4`: Ready;
- immutable Preview URL:
  `https://seai-grant-software-k6y4tf2h2-patrick-mc-kennas-projects.vercel.app`.

## Production Controls Preserved

- PR #45 remains Draft.
- The fixed Production attestation remains `pending`; its pilot-stage
  governance allocation is recorded, but capture, approval and activation
  evidence remain empty.
- No Production evidence capture or Production database status command ran.
- No Production migration, schema/data/ledger change, deployment, promotion or
  alias movement occurred.
- The current live Production deployment was not changed.
- `20260724180000_password_reset_foundation` remains pending in Production.
- Password-reset request-flow work remains paused.
- Preview strictness and every database safety guard remain unchanged.
