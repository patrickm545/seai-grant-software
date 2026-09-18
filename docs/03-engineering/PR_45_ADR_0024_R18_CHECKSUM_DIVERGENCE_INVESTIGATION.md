# PR #45 ADR-0024 R18 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R18-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact seventh tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-17 |

## Scope And Evidence Boundary

This repository-only investigation follows permanently closed operation
`CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R18`. It loaded no Production credential,
made no Production connection, ran no capture or status command, executed no
SQL, applied or resolved no migration, deployed no application and moved no
alias.

Dedicated evidence is
[ADR_0024_R18_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R18_CHECKSUM_DIVERGENCE.json),
raw SHA-256
`d195e7781bfd170721390986e5e143a1d3e0d36525863ce16318cbccc6c85a8f`.
It binds the retained R18 diagnostic hashes to the independent byte proof. The
source candidate matrix remains
[ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json](evidence/ADR_0024_REMAINING_MIGRATION_BYTE_CANDIDATES_AFTER_R15.json),
raw SHA-256
`af41af8aa3ff53d85afbff1b421a6a599cd7dcab4f7644fde1205b878ae7515f`.

## Fixed R18 Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `1fae81c39e4ad70f5083f8562323f7b0c42b754c` |
| Change ID | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R18` |
| Migration | `20260722190000_manual_lead_creation` |
| Production record ID | `5920b218-8952-4f39-9862-3a26465e5cbf` |
| Canonical checksum | `443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160` |
| Observed checksum | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint | `db_4e1d3bd23cff6801` |

## Canonical Migration And Mechanical Proof

The normal non-empty migration has fourteen top-level statements and ten line
comments. It introduces explicit lead origin and progressive unknowns, trusted
creator and assignment relations, tenant-scoped idempotency and normalized
duplicate signals. Its ordinary Prisma lifecycle remains one applied step,
present canonical timestamps, finished, not rolled back and no logs.

The exact Git blob is valid UTF-8 without BOM, is 4,491 bytes, contains 112 LF
bytes and no CR bytes, and ends with a newline. Inserting one carriage return
before each LF produces 4,603 bytes and the exact R18-observed checksum.
Removing only those 112 inserted bytes restores the committed blob and
canonical checksum byte-for-byte.

| Representation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob, LF with final newline | 4,491 | `443ebd35fee716599eb70c0df329a68a486f240b7ce179cef0abfec240c75160` | Canonical match |
| CRLF with final newline | 4,603 | `8f3cbfd0e3137fa858884ff5e096af9ee74124250aacba2690c1a127d9fe2c1e` | Exact R18-observed match |

SQL tokens, statement order, comments apart from line-ending bytes, UTF-8
content and semantic content are unchanged. Reverse equality, not visual
similarity, is the acceptance evidence.

## Historical Artifact Search And Classification

An exhaustive Git object-database scan, including unreachable objects, found
no 4,603-byte blob with the observed SHA-256. Reachable history, refs, reflogs,
stashes and the migration's commits expose no checksum-identical committed
artifact or authoritative applying command.

The registered primary, drift-investigation and PR41 Windows worktrees each
reproduce the exact CRLF bytes. They prove mechanical reproducibility but do
not identify the historical applying checkout, command, shell or operator.

Classification is **A - exact alternate-byte representation proven**, with
high confidence. Classification B is not used because no authoritative
applying historical blob, checkout or command was recovered.

## Lifecycle Review

R18's retained exact-success report contained only `checksum-mismatch`. The
report implementation evaluates all ordinary fields before returning:
exactly one row, migration identity, checksum, present `finishedAt`, null
rollback, one applied step, no logs and finished-not-rolled-back state. It
would retain every differing lifecycle field in deterministic order.

No lifecycle anomaly was reported. Exact timestamps were not emitted because
first evidence generation stopped, so this amendment neither invents nor pins
them. Tuple 7 instead requires the complete normal lifecycle when a later live
verifier observes it. The pilot-auth zero-step historical state remains
separate and cannot satisfy this tuple.

## Exact Seventh Tuple

The migration SQL and manifest remain unchanged. Tuple 7 permits only the
exact Production environment and fingerprint, migration, record ID, canonical
and observed checksums, completed one-step/no-log lifecycle, manifest hash,
R18 repository baseline, Classification A, dedicated evidence reference and
evidence digest. The pending or active ADR-0024 attestation must retain the
entire exact seven-tuple array.

Tuples 1 through 6 remain byte-for-byte unchanged. Cross-tuple use, wildcards,
alternate fingerprints, non-Production environments, zero or multiple steps,
rollback, logs, unfinished records, changed evidence and one-bit checksum
changes fail closed. No generic CRLF, date, prefix, checkout or candidate
lookup rule exists.

## Candidate Isolation And Operational State

The candidate matrix remains immutable historical evidence and is not verifier
input. R18's separately retained observation and dedicated evidence justify
only the manual-lead tuple. The password-reset candidate remains unaccepted,
and `20260724180000_password_reset_foundation` remains exactly expected pending.

The attestation remains pending with zero captures and zero approvals. No
complete Production evidence, schema equivalence, deterministic digest or live
pending set is claimed. Another Production operation requires a separately
authorised R19 with the exact resulting repository SHA; this amendment does
not authorise or run R19.

## Validation

Repository-only validation must pass without Production access: focused
seven-tuple, historical-state and candidate-isolation tests; the full unit,
platform and security suite; disposable PostgreSQL integration after all 16
canonical migrations; ESLint; TypeScript; Prisma validation; Production build
without deployment; manifest and immutable-history verification; expected
pending-attestation exit `21`; Markdown, link, metadata, JSON and secret checks;
and `git diff --check`.
