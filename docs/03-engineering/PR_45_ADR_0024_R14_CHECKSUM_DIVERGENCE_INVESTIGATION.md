# PR #45 ADR-0024 R14 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R14-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact fourth tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-10 |

## Scope And Evidence Boundary

This repository-only investigation follows the permanently closed read-only
operation `CHG-2026-08-10-ADR0024-PROD-EVIDENCE-R14`. R14 itself established
only the typed `LEDGER_MISMATCH` stop and exact safe values in the
[R14 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R14.md). It did not
prove a line-ending cause, and that operation record does not claim otherwise.

This investigation did not connect to Production, run Production capture or
status, execute SQL, apply or resolve a migration, edit a database ledger,
deploy an application or move an alias.

The retained mechanical evidence is
[ADR_0024_R14_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R14_CHECKSUM_DIVERGENCE.json),
whose raw-file SHA-256 is
`ca79db4c782a76b76e1dcbb84e46496d16b36cb463e68be904bc1962fe603da8`.

## Fixed Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `90c2f1f95a7dbc6eeaac48df3d2ef0b3a336ac7c` |
| Migration | `20260718130000_tenant_provisioning_data_model` |
| Production record ID | `5eeca647-5429-4beb-873b-cff91ec58ddf` |
| Canonical repository checksum | `a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7` |
| Observed Production checksum | `2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint scope | `db_4e1d3bd23cff6801` |
| Record normalization | `adr-0024-migration-record-normalization/v1` |

The authoritative source bytes were read from the exact committed Git blob,
not from a working-tree copy.

## Committed Migration

The normal non-empty migration contains 21 top-level statements and four line
comments. It extends organisation and user lifecycle enums; creates the
provisioning-operation enum; adds invited-user credential columns and
constraints; adds, backfills, constrains and indexes the installer slug;
creates the provisioning-operation table, indexes and foreign keys; and links
audit logs to provisioning operations. Ordinary Prisma application therefore
requires a finished, non-rolled-back, no-log row with exactly one applied
step.

The Git blob is 3,795 bytes, valid UTF-8 without a BOM, contains 110 LF bytes,
contains no CR byte and ends with a newline. Its SHA-256 exactly matches the
immutable manifest.

## Mechanical Proof

| Transformation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob / LF with final newline | 3,795 | `a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7` | Canonical match |
| LF without final newline | 3,794 | `155a9089402853dcf8eebbffb5f4226398f326bc3b3f04d0bdea6cfb8fa8ee4a` | No match |
| CRLF with final newline | 3,905 | `2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805` | Production match |
| CRLF without final newline | 3,903 | `121b6faabba3792e06e897d051c0a28990468a665330668b02d844fe0d9fdbad` | No match |
| UTF-8 BOM and LF | 3,798 | `b2e7be9a4a3b2df9df8fc71391f131e6ee6831603a869907c25a3e88ef942228` | No match |
| UTF-8 BOM and CRLF | 3,908 | `f00c090cc8699d976461e4ed853084467a9129cdd4950d9c841298a8a3fb60a3` | No match |

Converting only the 110 LF bytes to CRLF while retaining the final newline
produces the exact observed checksum. Removing those 110 inserted carriage
returns restores the 3,795-byte Git blob and its canonical checksum
byte-for-byte. No SQL token, statement, comment content, ordering, UTF-8
content or semantics changes.

## Repository And Historical Search

The migration entered history once in commit
`2f183b4a89453ec791219335a36a5d66b3a2765e`. The search covered 132 fetched
branch, tag and pull-request references; path history; 3,530 reachable and
unreachable Git objects, including 1,605 blobs; 733 reflog entries; stashes;
563 unreachable entries; and all registered and retained local worktrees. No
Git blob has the alternate 3,905-byte size, so no authoritative historical Git
blob with the observed checksum was recovered.

Three retained Windows worktrees contain the exact 3,905-byte representation.
The primary retained worktree also reproduces the exact observed R10, R11, R12
and pilot-auth checksums. Historical attributes used `text=auto` without a
migration-specific EOL pin; current PR #45 pins migration SQL to LF. These are
strong corroborating materializations, not proof of the exact applying
checkout.

The retained July 23 incident records the guarded applying repository command
as `pnpm db:migrate:production`, change ID
`INCIDENT-2026-07-23-PRODUCTION-AUTH-503`, and one four-migration batch that
included tenant provisioning. The exact historical checkout configuration,
shell environment and operator execution evidence were not recovered, so no
unsupported provenance claim is made.

## Classification And Lifecycle

Classification is **A - Exact alternate-byte representation proven**, with
high confidence. The exact observed checksum is mechanically reproducible and
reverse normalization is byte-for-byte exact. Classification B is not used
because no matching authoritative historical blob or applied artifact was
recovered. C and D do not apply.

R14 reported only `checksum-mismatch` for this record. It reported no separate
lifecycle problem. Repository SQL and the retained successful four-migration
incident establish ordinary one-step expectations: started, finished, one
applied step, no rollback and no logs. Nothing supports treating this migration
as historical zero-step state.

## Exact Repository Treatment

The immutable migration and manifest remain unchanged. Attestation v5 now
holds four independently pinned ordinary one-step tuples: the unchanged R10,
R11 and R12 entries plus this exact R14 entry. The new entry binds the exact
Production fingerprint, migration, record ID, canonical and observed
checksums, successful lifecycle, manifest, approved repository baseline,
classification, byte representation, evidence reference and raw digest.

The separate pilot-auth `attestedHistoricalResolvedMigration` remains the only
historical zero-step structure and is unchanged. No ordinary tuple can satisfy
it, and it cannot satisfy R14.

Strict Preview, test, development and fresh-database verification still
accepts only canonical manifest checksums. There is no checksum pattern,
global line-ending allowance, date or migration-family exception, alternate
checksum derivation or cross-database acceptance.

The attestation remains pending with zero accepted captures and zero
approvals. R14 remains closed. Complete evidence, schema proof, the live
pending set and attestation review require a new separately authorised
Production operation; this investigation does not create that authority.
