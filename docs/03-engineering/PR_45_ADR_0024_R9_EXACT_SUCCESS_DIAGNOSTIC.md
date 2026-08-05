# PR #45 ADR-0024 R9 Exact-Success Diagnostic Amendment

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R9-EXACT-SUCCESS-DIAGNOSTIC |
| Status | Implemented and repository-validated |
| Owner | Clada Systems Engineering |
| Review cycle | Retain with PR #45 and the ADR-0024 operation record |
| Last reviewed | 2026-08-05 |

## Scope And Closed Operation

This repository-only amendment follows the closed operation
`CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R9`. R9 began at
`2026-08-05T14:35:18.132Z` and stopped at `2026-08-05T14:36:31.813Z` during
`first-evidence-generation`. The repository classified the stop as
`LEDGER_MISMATCH`, exit `25`, against the invariant that the first ledger,
schema and identity evidence satisfies ADR-0024. Its safe diagnostic named
`20260710120000_identity_organisation_foundation` as not being an exact
successful application.

The diagnostic did not identify a live field or value. It therefore does not
establish that the Production row is failed, unfinished, rolled back,
duplicated or checksum-mismatched. R9 remains permanently closed. A separate
authorised read-only operation is required to obtain any further Production
evidence.

No Production connection or command was used for this amendment. It did not
run evidence capture, Production status, a migration, a deployment or an alias
operation. The attestation remains pending with zero captures and zero
approvals.

## Exact-Success Rule And Diagnostic Gap

`verifyAttestedLedger` in `lib/migration-ledger.ts` normalises ledger rows,
groups them by migration name, and compares each repository migration with the
immutable manifest. A repository migration is exact-successful only when:

- exactly one normalised row exists for the manifest migration name;
- the normalised migration name equals the manifest name;
- its checksum equals the immutable-manifest SHA-256 checksum;
- `startedAt` was accepted as a valid canonical UTC timestamp during
  normalisation;
- `finishedAt` is present;
- `rolledBackAt` is `null`;
- `appliedStepsCount` is exactly `1`;
- its log state is `none`, which also requires a `null` log digest; and
- its lifecycle is therefore finished, not rolled back and unambiguous.

Before this amendment, a one-row field failure produced only the migration
name. Missing and duplicate rows also lacked the same structured, typed
expected-versus-observed detail.

## Safe Structured Report

The exact acceptance predicate is unchanged. Rejected records now carry
`adr-0024-repository-migration-exact-success/v1`, the migration name,
`adr-0024-migration-record-normalization/v1`, record count, safely classified
record IDs, and all applicable failures in fixed order:

1. `missing-record` or `duplicate-records`;
2. `migration-name-mismatch`;
3. `checksum-mismatch`;
4. `unfinished`;
5. `rolled-back`;
6. `applied-step-count-mismatch`;
7. `unexpected-log-state`;
8. `unexpected-log-digest`;
9. `unexpected-lifecycle-state`.

Each failure includes a field, typed safe expected value, typed safe observed
value and comparison rule. Valid migration names, UUIDs, canonical UTC
timestamps, SHA-256 values, numeric counts, nulls and approved classifications
may be emitted. Invalid-format identifiers are redacted.

Raw logs, SQL, connection strings, credentials, usernames, passwords,
secret-bearing hostnames, stack traces, customer data and unrelated environment
variables are excluded. Logs are represented only by `none` or `sha256` and a
SHA-256 digest. An exact-success rejection remains `LEDGER_MISMATCH`, exit
`25`, and still prevents complete evidence, the second capture, deterministic
comparison, attestation activation and Production status.

## Repository-Only Migration History Review

The committed SQL is 6,162 LF bytes and the manifest pins SHA-256
`fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3`.
The migration has two committed historical versions: its introduction in
`63b7b2977c1015a72fc9a897668464148bee9702` and its tenant-isolation amendment
in `c5e5d40624f5bcf77cfd985e5d6b5d15b3c41e43`. Immutable-history and manifest
verification continue to protect the approved bytes.

The retained Preview repair record documents that Preview once held the CRLF
byte checksum for this migration while its lifecycle fields were otherwise
successful. That is repository evidence about Preview only. R9 did not reveal
the Production field, so the Preview history cannot be used to infer the live
Production cause or update the pending attestation.

## Validation

Repository-only validation covers the focused exact-success cases, complete
unit/platform/security suite, disposable PostgreSQL integration suite, ESLint,
TypeScript, Prisma schema validation, production build without deployment,
manifest and immutable-history verification, expected pending-attestation exit
`21`, Markdown, links, metadata, secret scanning and `git diff --check`.

All checks passed: 24 focused diagnostic/capture tests, 336 complete
unit/platform/security tests and 68 disposable PostgreSQL integration tests.
Manifest verification retained hash
`1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872`;
immutable-history verification retained 16 migrations against `origin/main`.
The disposable local database was removed after the suite. No deployment was
performed by the successful production-mode build.
