# PR #45 ADR-0024 R17 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R17-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact sixth tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-17 |

## Scope And Evidence Boundary

This repository-only investigation follows permanently closed operation
`CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R17`. It made no Production connection,
ran no Production capture or status command, executed no SQL, applied or
resolved no migration, deployed no application and moved no alias.

Dedicated evidence is
[ADR_0024_R17_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R17_CHECKSUM_DIVERGENCE.json),
raw SHA-256
`c45a5290b897a408981a0a124ab7f08ac26ac05a874e12d7a58307fc5d72b2b6`.
It binds the retained R17 diagnostic hashes to the independent byte proof. The
source candidate matrix remains
[ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json](evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json),
raw SHA-256
`af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f`.

## Fixed R17 Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `0762b5eb93c1ac1ac9909507bff4638ac0aa8b04` |
| Change ID | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R17` |
| Migration | `20260720100000_tenant_operator_recovery` |
| Production record ID | `4c2d5692-de53-4156-84da-eff6184f9c1d` |
| Canonical checksum | `e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215` |
| Observed checksum | `11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint | `db_4e1d3bd23cff6801` |

## Canonical Migration And Mechanical Proof

The normal non-empty migration has five top-level statements and two line
comments. It creates `ProvisioningOperationType`, adds
`ProvisioningOperation.operationType` and `resultSnapshot`, backfills existing
operations, makes `operationType` non-nullable and creates the operation-type
and status index. Its ordinary Prisma lifecycle is one applied step, present
canonical timestamps, finished, not rolled back and no logs.

The exact committed Git blob is valid UTF-8 without BOM, is 804 bytes, contains
24 LF bytes and no CR bytes, and ends with a newline. Inserting one carriage
return before each LF produces 828 bytes and the exact R17-observed checksum.
Removing only those 24 inserted bytes restores the committed blob and
canonical checksum byte-for-byte.

| Representation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob, LF with final newline | 804 | `e32cb837f4bd9055554080ae4261e2040f13974b2fed72de1008f881a95f3215` | Canonical match |
| CRLF with final newline | 828 | `11f3b33fd9189ffa549fac4c0a66a9705c6a26e6420bc0d42cdf572aa7ed8f96` | Exact R17-observed match |

SQL tokens, statement order, comments apart from line-ending bytes, UTF-8
content and semantic content are unchanged. Visual similarity is not used as
evidence; the reverse transformation is byte-for-byte exact.

## Lifecycle Review

R17's structured exact-success report contained only `checksum-mismatch`. The
report implementation evaluates all ordinary fields before returning: exactly
one row, migration identity, checksum, present `finishedAt`, null rollback,
one applied step, no logs and finished-not-rolled-back state. It would have
included every differing lifecycle field in the same retained report.

No lifecycle anomaly was reported. The exact timestamps were not emitted
because first evidence generation stopped, so this amendment neither invents
nor pins them. The ordinary one-step tuple is appropriate; the separate
pilot-auth zero-step historical state remains isolated.

Classification is **A - exact alternate-byte representation proven**, with
high confidence. Classification B is not used because no authoritative
checksum-identical historical applied artifact was recovered.

## Exact Sixth Tuple

The immutable migration SQL and manifest remain unchanged. Tuple 6 permits
only the exact Production environment and fingerprint, migration, record ID,
canonical and observed checksums, ordinary completed one-step lifecycle,
manifest hash, R17 repository baseline, Classification A, evidence reference
and evidence digest. The pending or active ADR-0024 attestation must retain the
entire exact tuple array.

The five previous ordinary tuples remain byte-for-byte unchanged. The
pilot-auth historical resolved state remains separate. Cross-tuple use,
wildcards, alternate fingerprints, non-Production environments, zero-step,
rollback, logs, unfinished records and one-bit checksum changes fail closed.

## Candidate Isolation

The candidate matrix is immutable repository evidence, not a runtime
allowlist. R17's exact Production observation and dedicated evidence justify
only the tenant-operator tuple. No generic CRLF, date, prefix, checkout or
candidate-lookup rule exists.

The remaining candidates are not accepted:

| Migration | Candidate SHA-256 | Runtime state |
| --- | --- | --- |
| `20260722190000_manual_lead_creation` | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` | Canonical-only; no tuple |
| `20260724180000_password_reset_foundation` | `81450e157375eb262d46339e78e912161383a0d27cfdf03952978cc65a174a71` | Canonical-only; no tuple; expected pending |

## Operational State

The attestation remains pending with zero captures and zero approvals. No
complete Production evidence, schema equivalence, deterministic digest or live
pending set is claimed. The incident remains open. Another complete read-only
capture requires a new separately authorised operation; this amendment does
not authorise R18.

## Validation

Repository-only validation passed without Production access: 52 focused
six-tuple, historical-state and candidate-isolation tests; 478 full unit,
platform and security tests; and 68 disposable PostgreSQL integration tests.
ESLint, TypeScript, Prisma schema validation, the Production build without
deployment, manifest verification, immutable-history verification, the
expected pending-attestation exit `21`, Markdown lint, internal links,
metadata, JSON parsing, changed-file secret scanning and `git diff --check`
also passed.
