# ADR-0024 Migration Lineage Verifier

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-MIGRATION-LINEAGE-VERIFIER-001 |
| Status | Implemented; attestation retired pending Production post-migration evidence and approval |
| Owner | Clada Systems Engineering |
| Review cycle | Before every Production database release and after migration or Prisma tooling changes |
| Last reviewed | 2026-08-26 |

## Purpose And Boundary

The verifier implements the repository-controlled, single-incident path required
by [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md).
It independently verifies repository migration inventory, connected database
identity, migration-ledger state, supported catalog state, named assertions and
attestation lifecycle. It never edits `_prisma_migrations`, schema or
application data.

The checked-in attestation is `retired`. R19's historical evidence remains
preserved, but closed reconciliation R4 proved that the former Production
post-migration expectation came from disposable PostgreSQL. The exact observed
Production post-migration fingerprint was not emitted and is not invented.

Production remains on `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`.
Prisma reported `20260724180000_password_reset_foundation` successfully applied
during closed R4, but postflight did not verify the resulting Production state.
The migration must not be invoked again. Merging this implementation must not
move the Production alias or start password-reset request-flow work.

## Repository Artifacts

| Artifact | Purpose |
| --- | --- |
| `prisma/migration-manifest.json` | Approved ordered inventory of all 16 committed migrations. |
| `prisma/lineage-attestations/adr-0024-production.json` | Fixed-path versioned single-incident attestation. |
| `lib/migration-manifest.ts` | Deterministic inventory and manifest hash. |
| `lib/lineage-attestation.ts` | Exact lifecycle, identity and approval validation. |
| `lib/migration-ledger.ts` | Exact ledger normalization and comparison. |
| `lib/schema-fingerprint.ts` | Versioned catalog canonicalization, fingerprint and named assertions. |
| `lib/postgres-catalog.ts` | Fixed read-only PostgreSQL catalog queries. |
| `lib/lineage-verifier.ts` | Modes, decisions, evidence and exit mapping. |
| `scripts/verify-migration-lineage.ts` | Fixed command boundary and read-only transaction. |

No command accepts an attestation or manifest path. This prevents an operator
or build input from substituting a different exception.

## Commands

```text
pnpm db:manifest:verify
pnpm db:manifest:generate
pnpm db:history:verify-base
pnpm db:attestation:verify
pnpm db:status
pnpm db:migrate:preview
pnpm db:migrate:production
```

`db:manifest:generate` prints a proposed manifest to standard output. It never
rewrites the approved file. A deliberate update requires the migration to be
committed or staged, review of the complete JSON diff, and a separate
`db:manifest:verify`.

`db:history:verify-base` compares every migration present on `origin/main`
against the staged raw Git blob and rejects deletion, rename or byte change.
CI fetches full history and runs both inventory checks before linting.

`db:attestation:verify` returns exit `21` for the checked-in pending
attestation. That is the expected implementation-stage result.

Schema evidence is generated with a fixed profile:

```text
pnpm db:lineage:verify schema-fingerprint pre-password-reset
pnpm db:lineage:verify schema-fingerprint post-password-reset
pnpm db:lineage:verify schema-fingerprint fresh-head
```

The command uses the normal database identity guard and a repeatable-read,
read-only transaction. Production use is a separately approved read-only
reconciliation action; it is not part of this implementation PR.

## Migration Manifest Algorithm

Manifest version `clada-migration-manifest/v1`:

1. enumerate only directories immediately below `prisma/migrations`;
2. require names matching an exact 14-digit timestamp and lower-case
   underscore-separated description;
3. sort names ordinally and assign zero-based positions;
4. require exactly the expected `migration.sql` and reject additional
   executable files;
5. use repository-relative POSIX paths;
6. read the raw committed Git blob bytes, require LF bytes, and calculate
   SHA-256 without decoding or newline conversion;
7. canonicalize the manifest body by recursively sorting JSON object keys; and
8. calculate the manifest SHA-256 over its UTF-8 canonical JSON.

`.gitattributes` pins migration SQL to LF. The algorithm is identical on
Windows and Linux and rejects uncommitted modification before inventory.

## Database And Ledger Identity

The existing database safety guard derives the approved non-secret fingerprint
from normalized host, port and database name in the secret URL before
connection. It binds that value to `APP_ENV`, `DATABASE_ENVIRONMENT`,
`DATABASE_FINGERPRINT` and the positive
`PRODUCTION_DATABASE_FINGERPRINT`. The verifier then queries
`current_database()` inside the guarded connection and requires it to match the
parsed database name. An environment label alone cannot activate acceptance.

The ledger query returns only Prisma migration metadata. Timestamps are
normalized to exact UTC ISO values without discarding significant
microseconds; step counts must be safe
non-negative integers. Empty logs normalize to `none`; non-empty logs are not
emitted and normalize only to a SHA-256 digest. Comparison pins ID, name,
checksum, start/finish, step count, rollback and log state. It rejects every
additional, missing, duplicate, failed, unfinished, changed or ambiguous row.

Attested migration-record timestamps must already be canonical under
`adr-0024-migration-record-normalization/v1`: exactly 3 to 6 fractional digits
with no insignificant trailing zero. Validation is string-only, so significant
microseconds are preserved. Expected attestation values are never silently
normalized before the exact ledger comparison.

The only special states available to an active attestation are the exact
database-only record and exact two-record
`20260428120000_manual_submission_prep` state. There is no ignore list, regular
expression exception or name-only match.

## Schema Fingerprint

Version `clada-postgres-schema-fingerprint/v2` canonicalizes the `public`
namespace, tables, ordered columns, PostgreSQL and information-schema types,
nullability, defaults, identity/generated expressions, primary/foreign/unique/
check constraints, indexes, enums, installed extensions, non-internal
triggers, sequences and unsupported relation kinds. Every query is explicitly
sorted and canonical JSON is sorted again before SHA-256.

Excluded unstable values are object OIDs, owners/ACLs, creation times, planner
statistics, physical storage/tablespace details and
`public._prisma_migrations`. The migration table is excluded from schema
fingerprinting because the ledger verifier checks it separately and exactly.
Changing these semantics requires a new explicit algorithm version.

Index evidence includes ordered key-column names, separately ordered included
columns, expression and predicate state, uniqueness, primary status and
constraint linkage. `pg_get_indexdef` remains fingerprint evidence but is not
parsed to make named-assertion decisions.

Named assertions version `adr-0024-catalog-assertions/v2` proves the four
nullable, default-free `Lead` columns have the exact PostgreSQL types and no
dedicated index or constraint. Any ordinary single-key-column index is
rejected, including unique, partial and constraint-backed forms. A
multi-column index is retained in the whole-schema fingerprint but is not
misclassified as dedicated. Expression-only keys are represented by a null
ordinary-column slot plus their catalog expression, and INCLUDE-only
occurrences remain separate from keys; neither is silently treated as a
dedicated ordinary-column index. The assertions also prove
`PasswordResetRequest` is absent for preflight and present for
postflight/fresh head.

## Modes

| Mode | Behaviour |
| --- | --- |
| `strict-status` | Preview, Development or test repository-only lineage; pending migrations block status. |
| `strict-preflight` / `strict-postflight` | Independent checks around guarded non-Production deploy; no attestation accepted. |
| `production-status` | Exact active attestation, identity, inventory, ledger and pre-migration schema; pending repository migration returns the expected blocked decision. |
| `production-preflight` | Same verification plus exact attestation ID, existing acknowledgement/change ID, restore-point confirmation and only the approved pending password-reset migration. |
| `production-postflight` | Exact historical state retained, password-reset migration applied exactly once, no pending/failed row and approved post-migration schema. |

Production builds remain status-only. Only the existing
`db:migrate:production` wrapper can call Prisma deploy, and it now runs the
independent verifier before and after Prisma. Preview, Development and test
receive no lineage exception.

## Exit Codes

| Exit | Meaning |
| --- | --- |
| `0` | Verified clean. |
| `20` | Verified lineage but repository migration pending; status/deployment blocked. |
| `21` | Attestation inactive, pending, withdrawn or retired. |
| `22` | Attestation expired. |
| `23` | Database or environment identity mismatch. |
| `24` | Repository inventory or manifest mismatch. |
| `25` | Migration-ledger mismatch. |
| `26` | Schema fingerprint or named assertion mismatch. |
| `27` | Unsafe or incomplete configuration/attestation. |
| `70` | Internal verifier/query failure. |

Every non-zero outcome is fail closed. Only `production-status` recognizes
exit `20` as the expected `verified-pending-blocked` decision, logs that no
migration was applied, and immediately terminates the status/build operation
with the original exit code. Strict modes, Production preflight and Production
postflight accept only exit `0`. The guarded deploy never treats exit `20` or
any verifier failure as permission to continue.

## Preview Drift Record

Automatic Preview deployment `dpl_3UQs1dFpJrXnHiTugjjs1N7fvSho` originally
reached the strict verifier and stopped with exit `25` because the Preview
ledger checksum for `20260710120000_identity_organisation_foundation` was the
same 6,296-byte CRLF checksum later observed by R10. The separately governed
Preview repair rebuilt that disposable database from the canonical committed
LF migrations. Preview is now strict and clean and receives no Production
attestation treatment.

## Evidence And Redaction

Evidence version `adr-0024-verifier-evidence/v1` contains verifier/mode,
environment, safe database fingerprint, repository revision, manifest hash,
migration counts, pending names, attested and duplicate-state results, schema
version/fingerprint, named assertions, lifecycle, final decision, UTC timestamp
and change ID when required.

It contains no URL, credentials, password, token, cookie, customer data, raw
application rows, raw migration log or arbitrary SQL. A recursive secret-key
and URL guard checks the evidence before output. Unexpected errors emit a
stable safe category rather than raw driver text.

## Exact Production Repository-Checksum Divergences

The closed R10, R11, R12, R14, R15, R17 and R18 operations each established
one checksum-only exact-success mismatch:

| Operation | Migration | Record ID | Canonical checksum | Observed Production checksum |
| --- | --- | --- | --- | --- |
| R10 | `20260710120000_identity_organisation_foundation` | `112c6124-f0c2-4b6b-8d02-f6ce835746e3` | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` |
| R11 | `20260710130000_users_roles_permissions_audit` | `93c04529-1d5b-4350-af01-ef225b69b008` | `cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf` | `4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb` |
| R12 | `20260710140000_workflow_foundation` | `ce4489c9-fa9b-41e0-90fc-23a584e162da` | `7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d` | `fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8` |
| R14 | `20260718130000_tenant_provisioning_data_model` | `5eeca647-5429-4beb-873b-cff91ec58ddf` | `a741bc49cf4e8d92c36344f68706161ecdcc04625903eeb2a777b87b0f0151d7` | `2f45f84bce236107538226d722a64daf1fba564725d6c79a89f5c161a2d80805` |
| R15 | `20260718150000_tenant_first_login_activation` | `e0d71f73-e278-4a79-9906-650a8c43881f` | `f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f` | `8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab` |
| R17 | `20260720100000_tenant_operator_recovery` | `4c2d5692-de53-4156-84da-eff6184f9c1d` | `e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215` | `11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96` |
| R18 | `20260722190000_manual_lead_creation` | `5920b218-8952-4f39-9862-3a26465e5cbf` | `443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160` | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` |

Separate repository-only investigations proved classification A for each
tuple. Converting the exact committed UTF-8, no-BOM, LF Git blob to CRLF while
retaining the final newline produces the exact observed checksum; reversing
the conversion returns the committed bytes exactly. The versioned evidence
files and their raw digests are pinned by attestation v5.

The implementation keeps two controls separate:

1. Immutable repository integrity always verifies the canonical committed LF
   checksum against the unchanged manifest.
2. The ADR-0024 Production path separately verifies all seven exact historical
   Production records against their respective attested checksum, record ID,
   lifecycle, fingerprint, manifest and repository-lineage scope.

The seven-entry structure is an exact tuple set, not an alternate-checksum
list. Every declared tuple must verify independently and one cannot satisfy
another. Preview, test, development and fresh databases receive no exception and
must use canonical checksums. A missing, duplicated, cross-matched or changed
tuple fails closed. The Production-specific treatment retires with ADR-0024.

## Activation And Retirement

Activation is a separate reviewed repository change after the read-only
reconciliation evidence exists. It must:

1. insert exact related record IDs and exact failed-log digest;
2. insert independently reproduced pre/post/fresh schema fingerprints;
3. record four genuine named approvals, exact scope, required
   acknowledgements, conditions and repository evidence references;
4. change status to `active`, set review time and retain expiry within 90 days;
5. verify the manifest hash and exact Production fingerprint;
6. pass all negative/disposable tests; and
7. receive separate approval before any Production migration execution.

Do not fabricate values to make validation pass. Withdraw or retire immediately
on any ADR-0024 retirement condition. Expiry, withdrawal and retirement block
both Production deployment and migration.

## Failure Handling

Preserve secret-free JSON and the exit code. Do not retry an ambiguous
preflight, run raw Prisma deploy, resolve a migration, push schema, edit the
ledger, apply manual SQL or bypass the gate. Follow the migration-history
incident runbook with the incident owner and the reviewer required by the
selected explicit governance mode.

## PR #44 Evidence-Capture Tooling Preparation

PR #44 prepares the fixed
`pnpm db:lineage:capture-production-evidence` command because the pending
attestation correctly blocks `production-status` before a database read and
the schema-only command does not retain exact normalized ledger records.

The capture command remains fail closed. It requires the exact Production
identity, explicit governance mode, named operator, approved read-only change
ID and restore-point evidence reference. Standard mode requires a distinct
independent reviewer. Pilot-stage mode requires Patrick McKenna as operator,
prohibits an invented reviewer and requires his exact accountability
acknowledgement. It uses the same fixed queries and read-only repeatable-read
transactions, emits log digests without raw logs, produces a deterministic
evidence digest and stops when its two internal captures differ.

Active standard validation rejects placeholder reviewer/evidence values,
missing or duplicate roles, unindexed or missing repository evidence, altered
approval scope/acknowledgements, lifecycle errors and lost reviewer
independence. Active pilot-stage validation instead requires Patrick McKenna's
sole human Production-owner approval, two distinct external artifacts and
digests, exact matching deterministic identity/control/schema fields, exact
`verified-pending-blocked` exit `20` proof, activation and expiry timestamps,
and the later qualified-human-review trigger.

The [PR #44 preparation record](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md)
defines the retention boundary, disposable fingerprints and outstanding
Production gates. PR #44 performs no Production query and captures no live
evidence. The attestation remains pending; activation belongs to a separate
operational PR.

## PR #45 Operational Readiness

PR #45 remains before Production access and retains its
[authoritative operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md).
Its
[operational readiness checklist](PR_45_ADR_0024_OPERATIONAL_READINESS_CHECKLIST.md)
is the single resume package for the later approved read-only operation. PR #45
adds the narrow dual-mode governance schema and command controls without
relaxing ledger, schema, identity or status verification. See
[PR #45 Pilot-Stage Production Governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md).

The stage boundaries are fixed: repository preparation is complete; Production
evidence and attestation activation belong to PR #45; migration execution
requires a different approved change; and application deployment follows only
after successful execution and postflight.

## Historical-Resolved-Migration Boundary After R13

The closed R13 operation reached the first evidence transaction and rejected
`20260716183000_pilot_installer_auth` for both checksum and applied-step-count
mismatches. Repository-only investigation proved an exact reversible CRLF
representation and recovered the original authorised repair, verification and
`migrate resolve --applied` operation artifact. The checksum is classification
A and the zero-step lifecycle is classification L1.

Attestation v5 and verifier v2 implement the separate exact
`attestedHistoricalResolvedMigration` path. Ordinary repository migrations
still require exactly one applied step, and the three R10-R12 checksum tuples
remain unchanged. The historical path cannot be reached through ordinary or
checksum-divergence verification and is never available to strict Preview,
Development, test or fresh-database verification.

The exact pilot-auth known fields are pinned to the R13 checksum, lifecycle
and resolve evidence. A deterministic inventory separately lists objects
introduced by pilot authentication and the one declared compatible later
`AuthSession.sessionType` evolution. Named assertions verify every protected
table, column, constraint, index and enum exactly; the full current catalog
fingerprint remains an independent activation input.

While the attestation is pending, the fixed capture path may only emit the
exact zero-step ledger record and current catalog evidence for review. It does
not convert that evidence into acceptance. Active verification additionally
requires pinned canonical timestamps, schema fingerprint and assertion digest,
two distinct complete artifact references and hashes, the authorised
repository revision, current recovery evidence and all attestation governance
controls.

The checked-in entry deliberately leaves those current values null or empty,
so `attestation-verify` with active enforcement remains exit `21`. The
[R13 lifecycle investigation](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md)
defines the historical proof. The closed R14 operation did not populate the
schema-named R14 capture fields. The
[R14 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R14.md) and
[checksum investigation](PR_45_ADR_0024_R14_CHECKSUM_DIVERGENCE_INVESTIGATION.md)
define the later stop and fourth exact tuple; neither authorises new Production
access.

## R15 Fifth-Tuple And Candidate-Matrix Boundary

R15 stopped at first evidence generation with only a checksum failure for the
tenant first-login record. Repository-only proof reproduces the observed hash
by changing the exact Git blob's 16 LF bytes to CRLF and reverses byte-for-byte
without changing SQL. The verifier therefore has one new exact ordinary tuple
bound to that migration, record, fingerprint, lifecycle, baseline and evidence
digest. The four earlier tuples and pilot-auth historical state are unchanged
and cannot cross-satisfy it.

The post-R15 candidate matrix is never read by the verifier. Later migrations
remain canonical-only, including password reset, which remains pending. A
mechanically valid candidate is not a Production observation and grants no
runtime acceptance or operational authority.

## R16 Diagnostic-Retention Boundary

R16 returned repository typed exit `25`, but its one-off external PowerShell
reporter failed before writing the detailed diagnostic. The exact migration,
stage, invariant and mismatch fields are unknown and must not be inferred.
R16 remains closed and created no new lineage acceptance fact.

The fixed Node operator launcher now owns write-first retention. It stores the
operation start before launch, then stores permitted raw child streams,
repository exit and child completion before optional hashing, parsing and
report generation. A later reporting failure remains separate from the child
result and cannot trigger a retry. This reliability repair does not change any
identity, ledger, historical-state, schema, attestation or status predicate.

## R17 Sixth-Tuple Boundary

R17 proved that write-first retention preserves a typed ledger stop and every
safe mismatch field. The exact tenant-operator record differed only in
checksum. Repository-only analysis independently reproduced the observed hash
by converting the canonical 804-byte LF Git blob to an 828-byte CRLF
representation, then reversed it byte-for-byte without changing SQL.

The verifier's sixth ordinary tuple is independently pinned to R17's exact
Production fingerprint, migration, record ID, canonical and observed hashes,
completed one-step/no-log lifecycle, manifest, baseline and evidence digest.
All six entries must be present exactly; no entry can satisfy another.

The candidate matrix is not imported or read by verifier code. The manual-lead
and password-reset candidates remain canonical-only and fail strict and
Production verification. Password reset remains expected pending. No generic
CRLF, pattern, date, prefix or automatic promotion rule exists.

## R18 Seventh-Tuple Boundary

R18 retained typed exit `25` and the exact manual-lead checksum-only mismatch.
Repository-only analysis independently reproduced the observed hash by
converting the canonical 4,491-byte LF Git blob to a 4,603-byte CRLF
representation. Removing the 112 inserted carriage returns restores the
canonical blob byte-for-byte without changing SQL.

The verifier's seventh ordinary tuple is independently pinned to R18's exact
Production fingerprint, migration, record ID, canonical and observed hashes,
completed one-step/no-log lifecycle, manifest, baseline and dedicated evidence
digest. All seven entries must be present exactly and cannot cross-satisfy.

R18's separately observed manual-lead value is no longer accepted merely as a
candidate: only the complete exact tuple is accepted. The remaining
password-reset matrix entry is still repository-only, remains unaccepted and
the migration remains expected pending. The matrix is not verifier input and
no generic CRLF or automatic-promotion rule exists.
