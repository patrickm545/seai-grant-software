# PR #45 ADR-0024 Timestamp Audit Before R9

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-TIMESTAMP-AUDIT-BEFORE-R9-2026-08-05 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before any later ADR-0024 Production evidence operation |
| Last reviewed | 2026-08-05 |
| Repository head audited | `248f25bdcf32325f52d9dd13896db5caca5c2564` |
| Attestation status | `pending` |
| Accepted captures | `0` |
| Approvals | `0` |

## Scope And Result

This repository-only audit reviewed every timestamp path in the pending
ADR-0024 attestation and fixed template, the evidence-capture timestamp
surface, R1-R8 operational records, governing ADR and incident documents,
the reconciliation runbook, and timestamp/ledger fixtures. It did not load a
Production credential, connect to Production, run capture or status, apply a
migration, activate the attestation, deploy, or move an alias.

The attestation/template contains 14 logical timestamp paths: seven currently
hold values and seven are null or absent by design. Six non-null values are
exact observed Production ledger timestamps. The remaining non-null value is
the authored attestation lifecycle `createdAt` value. No additional exact
correction is supported, so this audit changes no attestation value.

| Audit count | Result |
| --- | --- |
| Attestation/template timestamp paths | 14 |
| Concrete current values | 7 |
| Null or absent by design | 7 |
| Suspicious concrete current values | 1 (`createdAt`; supported lifecycle format, kept) |
| Additional exact supported corrections | 0 |
| Unsupported concrete governing values | 0 |
| Future lifecycle field paths blocking activation | 4 |

## Complete Attestation And Template Inventory

| JSON or code path | Current value | Purpose and classification | Canonicality and precision | Evidence and action |
| --- | --- | --- | --- | --- |
| `createdAt` | `2026-07-28T00:00:00.000Z` | Governing lifecycle creation time | Exact UTC millisecond lifecycle format; 3 digits with zero fraction | Introduced with the attestation in `5b2f2758969ba9818c0c7d828a995167546aab40`; historical governance evidence; keep |
| `reviewedAt` | `null` | Future lifecycle review time | Blank by design while pending | Pending-state validator and no review; leave blank; activation blocker until genuine review |
| `expiresAt` | `null` | Future lifecycle expiry | Blank by design while pending | Pending-state validator; leave blank; activation blocker until genuine expiry within 90 days is selected |
| `missingMigration.startedAt` | `2026-04-23T07:04:10.39554Z` | Governing observed Production ledger value | Canonical UTC, 5 significant fractional digits | R4 retained boundary artifact; exact; keep |
| `missingMigration.finishedAt` | `2026-04-23T07:04:10.527739Z` | Governing observed Production ledger value | Canonical UTC, 6 significant fractional digits | R4 retained boundary artifact; exact; keep |
| `missingMigration.rolledBackAt` | `null` | Governing successful-record rollback state | Null is distinct from absent | R4 reported only the two timestamp mismatches; exact matched null; keep |
| `relatedMigration.failedRecord.startedAt` | `2026-04-29T06:01:05.497406Z` | Governing observed Production ledger value | Canonical UTC, 6 significant fractional digits | R7 safe diagnostic; exact; keep |
| `relatedMigration.failedRecord.finishedAt` | `null` | Governing failed-record completion state | Null is distinct from absent | R7 reported only `startedAt` and `rolledBackAt`; exact matched null; keep |
| `relatedMigration.failedRecord.rolledBackAt` | `2026-04-29T06:01:38.423504Z` | Governing observed Production ledger value | Canonical UTC, 6 significant fractional digits | R7 safe diagnostic; exact; keep |
| `relatedMigration.completedZeroStepRecord.startedAt` | `2026-04-29T06:01:38.54346Z` | Governing observed Production ledger value | Canonical UTC, 5 significant fractional digits | R8 safe diagnostic; exact; keep |
| `relatedMigration.completedZeroStepRecord.finishedAt` | `2026-04-29T06:01:38.54346Z` | Governing observed Production ledger value | Canonical UTC, 5 significant fractional digits | R8 safe diagnostic; exact; keep |
| `relatedMigration.completedZeroStepRecord.rolledBackAt` | `null` | Governing completed-record rollback state | Null is distinct from absent | R8 reported only `startedAt` and `finishedAt`; exact matched null; keep |
| `pilotStageCompensatingControl.activatedAt` | `null` | Future lifecycle activation time | Blank by design while pending | Pending pilot validator; leave blank; activation blocker until genuine activation and review coincide |
| `approvals[*].approvedAt` | no entries | Future human approval time | Absent because approvals are empty | Pending pilot validator requires zero approvals; leave blank; activation blocker until genuine approval |

The fixed attestation template in `lib/lineage-attestation.ts` pins the same
nine migration timestamp/null paths. It does not provide future lifecycle
values. The pending JSON and fixed pins agree exactly.

## Evidence Matrix

| Field group | Exact retained source | Change ID | Artifact reference and hash | Confidence | Action |
| --- | --- | --- | --- | --- | --- |
| Missing migration start, finish and null rollback | R4 boundary artifact and committed R4 record | `CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4` | `ADR0024/CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R4/operation-boundary.json`; SHA-256 `b59168be39582cc8854214b5ccc2a9ace6dcb1ced0a23813955485649b9c5196` | Exact | Keep |
| Failed related start, null finish and rollback | Committed R7 safe mismatch record; no other mismatch | `CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R7` | No complete artifact or digest produced | Exact | Keep |
| Completed zero-step start, finish and null rollback | Committed R8 safe mismatch record; no other mismatch | `CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R8` | No complete artifact or digest produced | Exact | Keep |
| Attestation `createdAt` | Initial attestation commit and unchanged lifecycle history | Not an operation value | Commit `5b2f2758969ba9818c0c7d828a995167546aab40` | Historical-only; exact as authored, not Production-observed | Keep |
| Review, expiry, activation and approval times | None yet; future lifecycle events | Future separately authorised operation | None | Unsupported because not yet known | Leave blank; block activation |

## Suspicious Pattern Classification

The scan checked exactly 3, 4, 5 and 6 fractional digits, insignificant
trailing zeroes, missing fractions, non-`Z` offsets, and inconsistent casing.

- One concrete current governing value matched the three-digit suspicion
  pattern: `createdAt`. It is intentionally millisecond-precise lifecycle
  metadata and is accepted by the separate lifecycle validator. It is not a
  truncated Production ledger belief and cannot be replaced by inference.
- No current governing Production ledger value has only three digits.
- The earlier `.395Z`, `.527Z`, `.497Z`, `.423Z` and `.543Z` values occur only
  as closed-operation history, explanatory evidence, or fail-closed fixtures.
- Values with trailing fractional zeroes, changed last digits, missing
  fractions, or lifecycle ordering boundaries occur only in negative tests.
- R3, R4, R7 and R8 start/stop times are historical operation-clock records
  with millisecond precision and must not be rewritten as ledger evidence.
- No current relevant value uses a non-`Z` ISO offset, lowercase `t`/`z`, or a
  non-canonical migration timestamp.

## Related Timestamp Surfaces

Complete evidence would contain `capturedAt`, while deterministic comparison
returns `firstCapturedAt` and `secondCapturedAt`. No complete Production
evidence object exists, so these values are unknown and must be produced only
by a future authorised capture. The attestation capture entries do not contain
a timestamp field; their `restorePointReference` is an exact opaque control
string and both entries are currently absent. Schema fingerprints and catalog
assertions contain no timestamp field.

## Validator And Comparison Audit

Migration timestamps remain governed by
`adr-0024-migration-record-normalization/v1`. The validator requires UTC `Z`,
3-6 fractional digits, valid calendar components, no insignificant trailing
zero, and preservation of significant microseconds. Normalization operates on
strings. Attestation migration values must already be canonical and are not
silently rewritten. Exact record comparison uses canonical JSON, retains null
as distinct from absence, and emits a typed fail-closed mismatch report.

JavaScript `Date` is not used for migration timestamp normalization. It is
used only for separately defined lifecycle millisecond validation and runtime
evidence capture time, where the schema intentionally requires or emits three
fractional digits. No validator or comparison implementation changed during
this audit.

## Decision Before R9

No further repository-only timestamp correction is justified. There is no
unsupported concrete governing timestamp and no timestamp-specific blocker to
a new separately authorised read-only capture. From timestamp evidence alone,
R9 is justified, subject to a new change ID, fresh recovery and deployment
preconditions, exact repository identity, and every existing fail-closed
control. This audit is not R9 authorization and R1-R8 remain permanently
closed.

## Validation

Validation ran without loading Production configuration:

| Check | Result |
| --- | --- |
| Focused timestamp audit, ledger, attestation and evidence tests | Pass, 41 tests |
| ESLint | Pass |
| TypeScript | Pass |
| Unit, platform and security tests | Pass, 323 tests |
| Disposable local PostgreSQL integration tests | Pass, 68 tests; database removed |
| Prisma schema validation | Pass |
| Production build without deployment | Pass with localhost-only placeholder identity |
| Migration manifest | Pass; approved hash unchanged |
| Immutable migration history | Pass; 16 migrations against `origin/main` |
| Pending attestation validation | Pass with expected inactive exit `21` |

Markdown lint, internal links, metadata, added-content secret scanning and
`git diff --check` also passed. No Production command, connection, migration,
deployment or alias operation ran during this audit.
