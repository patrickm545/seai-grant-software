# PR #45 ADR-0024 R15 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R15-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact fifth tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-13 |

## Scope And Evidence Boundary

This repository-only investigation follows permanently closed operation
`CHG-2026-08-13-ADR0024-PROD-EVIDENCE-R15`. It made no Production connection,
ran no Production capture or status command, executed no SQL, applied or
resolved no migration, deployed no application and moved no alias.

The retained mechanical evidence is
[ADR_0024_R15_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R15_CHECKSUM_DIVERGENCE.json),
raw SHA-256
`b2eac4e30c8871d31668b4b78c2bde40f477ad37ac080e6f4d6c5462d94e0e7d`.
The repository-only later-migration audit is
[ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json](evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json),
raw SHA-256
`af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f`.

## Fixed R15 Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `da3db4dd71050c902ee2f6266d42fd456e2654cb` |
| Migration | `20260718150000_tenant_first_login_activation` |
| Production record ID | `e0d71f73-e278-4a79-9906-650a8c43881f` |
| Canonical checksum | `f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f` |
| Observed checksum | `8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint | `db_4e1d3bd23cff6801` |

## Canonical Migration And Mechanical Proof

The normal non-empty migration has five top-level statements and two line
comments. It creates `AuthSessionType`, adds and backfills
`AuthSession.sessionType`, makes that column non-nullable and creates the
user/session-type/expiry index. Its ordinary Prisma lifecycle is one applied
step, present canonical timestamps, finished, not rolled back and no logs.

The exact Git blob is 575 bytes, valid UTF-8 without BOM, contains 16 LF bytes
and no CR byte, and ends with a newline.

| Representation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob / LF with final newline | 575 | `f704351558f4d253746482b87a65f19e03cc210732d5d6c6f0059e52c8198f6f` | Canonical match |
| LF without final newline | 574 | `ccfc48ffac1d3722258f8cd78d709a6d023c6c8c2dd4734f499fbe295149aaac` | No match |
| CRLF with final newline | 591 | `8446029a82124d42544db7799c2116fce1811f1a802e6f2ee722562d798225ab` | R15-observed match |
| CRLF without final newline | 589 | `fd2081892a3ca04ec720446c29768d11f6a685a87b138d15f1d02f8d6228eb26` | No match |
| UTF-8 BOM and LF | 578 | `7fe040deebf85bf922f9b95c18b1bfa2b9a86225bc526351546da9d462e05dae` | No match |
| UTF-8 BOM and CRLF | 594 | `23b2d776d755c121961a171df9206cf167c2d29f3cc5f1cb0997622247bab874` | No match |

Converting only the 16 LF bytes to CRLF while retaining the final newline
produces the exact observed checksum. Removing those 16 inserted carriage
returns restores the 575-byte Git blob and canonical checksum byte-for-byte.
SQL tokens, statement order, comments apart from line-ending bytes, UTF-8
content and semantics are unchanged.

## Historical And Lifecycle Evidence

The search covered 132 branch, remote, tag and pull-request refs; 736 reflog
entries; stashes; 559 unreachable entries; 3,562 Git objects including 1,625
blobs; path history; and every registered retained worktree. No 591-byte Git
blob exists and no authoritative matching historical Git artifact was
recovered.

Three retained Windows worktrees reproduce the exact observed checksum. This
is strong materialization evidence, not proof of the applying checkout. The
July 23 incident independently records this migration in the same guarded
four-migration batch as tenant provisioning and preserves the command
`pnpm db:migrate:production`. The exact applying checkout configuration, shell
and operator execution artifact do not survive.

R15's exhaustive structured exact-success report contained only
`checksum-mismatch`. It would also have reported unfinished, rollback,
non-one-step, unexpected-log or lifecycle-state failures in the same report.
No separate lifecycle anomaly exists, and the ordinary tuple gate is met.

Classification is **A - Exact alternate-byte representation proven**, with
high confidence. Classification B is not used because no authoritative
checksum-identical applied artifact was recovered.

## Exact Fifth Tuple

The immutable migration and manifest are unchanged. The fifth entry is
restricted to the exact Production fingerprint, migration, record ID,
canonical and observed checksums, ordinary one-step lifecycle, manifest,
approved baseline, classification, representation, evidence reference and raw
digest. R10, R11, R12 and R14 remain unchanged. The pilot-auth historical
resolved state remains separate. Cross-tuple use, wildcard matching and
non-Production use fail closed.

## Informational Candidate Matrix

Three later migrations were audited. All have mechanically reversible CRLF
candidates:

| Migration | Canonical SHA-256 | CRLF candidate SHA-256 | Retained Windows materialization |
| --- | --- | --- | --- |
| `20260720100000_tenant_operator_recovery` | `e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215` | `11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96` | Yes |
| `20260722190000_manual_lead_creation` | `443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160` | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` | Yes |
| `20260724180000_password_reset_foundation` | `cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7` | `81450e157375eb262d46339e78e912161383a0d27cfdf03952978cc65a174a71` | Yes |

Candidate byte representations are repository-only evidence and are not
accepted Production lineage values unless separately observed and authorised.
No candidate is present in the runtime verifier or attestation. Password reset
remains expected pending and has no tuple.

## Operational State

The attestation remains pending with zero captures and zero approvals. R15
remains closed. A complete evidence capture still requires a new separately
authorised operation; this investigation does not authorise R16.

## Validation

Repository-only validation passed: ESLint; TypeScript; 72 focused five-tuple,
historical-state and candidate-audit tests; 443 full unit/platform/security
tests; 68 disposable PostgreSQL integration tests after all 16 canonical
migrations; Prisma schema validation; a Production build using only a dummy
loopback test identity; manifest verification; immutable-history verification;
expected pending-attestation exit `21`; Markdown lint; internal links; durable
metadata; JSON parsing; changed-content secret scan; and `git diff --check`.

The disposable PostgreSQL server was bound only to loopback, used a fingerprint
distinct from Production, and was stopped; its temporary data directory was
removed. No Production credential was present during validation.
