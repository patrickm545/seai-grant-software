# PR #45 ADR-0024 R11 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R11-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact second tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-06 |

## Scope And Evidence Boundary

This repository-only investigation follows the permanently closed read-only
operation `CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R11`. R11 itself established
only the typed `LEDGER_MISMATCH` stop and the exact safe values in the
[R11 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R11.md). R11 did not
prove a line-ending cause, and its historical record has not been rewritten to
imply otherwise.

This investigation did not connect to Production, run the Production capture
or status command, execute SQL, apply or resolve a migration, edit a database
ledger, deploy an application or move an alias.

The mechanically retained evidence is
[ADR_0024_R11_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R11_CHECKSUM_DIVERGENCE.json),
whose raw-file SHA-256 is
`0eed74ab3945d45a0915631a99824fd7a2ecd7ec5cb7653ffbb3e80fd54b6eed`.

## Fixed Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `3281da65c013e9ad63dbc6c5da507640db586452` |
| Migration | `20260710130000_users_roles_permissions_audit` |
| Production record ID | `93c04529-1d5b-4350-af01-ef225b69b008` |
| Canonical repository checksum | `cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf` |
| Observed Production checksum | `4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint scope | `db_4e1d3bd23cff6801` |
| Record normalization | `adr-0024-migration-record-normalization/v1` |

The authoritative source bytes were read from the exact committed Git blob,
not from a working-tree copy.

## Mechanical Proof

The committed blob is UTF-8 without a BOM, contains 113 LF bytes, ends with a
newline and is 3,951 bytes. Replacing every LF with CRLF while retaining the
final newline creates a 4,064-byte file whose SHA-256 is exactly the observed
Production checksum. Replacing those CRLF pairs with LF returns byte-for-byte
equality with the committed blob.

| Transformation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob / LF with final newline | 3,951 | `cfebbcb43d7922fc8443b5562a57286e326971db2d6c664f5a06de82030537bf` | Canonical match |
| LF without final newline | 3,950 | `8484a13cda5e9c32aad307a5da1789b2e80b00eadc5c398d447844730dddad20` | No match |
| CRLF with final newline | 4,064 | `4d6442c505228abcfde3c1a1be960c27ec25bf96c5955077dfe003423bb34cfb` | Production match |
| CRLF without final newline | 4,062 | `6c2ee9cf7eb3dfe12701523c3cce73807e12e09e81e16c1309aaa8bee4b80cb9` | No match |
| UTF-8 BOM and LF | 3,954 | `c1d171f17ed7f128f54c040f419785d5152389704d64ba127bde57b0034e3a62` | No match |
| UTF-8 BOM and CRLF | 4,067 | `3a3406e397704fd618754d25ff5288bc10682134300acd3d81b911f598355343` | No match |
| UTF-8 BOM, LF, no final newline | 3,953 | `d4b144f872e98e14b8eeb2256baf4f6c266400b4a22d0f8ddc9391a2afdfc8f7` | No match |
| UTF-8 BOM, CRLF, no final newline | 4,065 | `78f51ed767983043c3e528b3193f9bb2bc34b8d540081b4c04144e0a12307b33` | No match |

Only 113 carriage-return bytes differ. No SQL token, statement, comment,
ordering or UTF-8 content differs. The proof is therefore an exact alternate
byte representation of the same SQL, not a semantically different migration.

## Repository And Historical Search

The migration entered history once in commit
`cf165e490fee78ec20b1b0aad4da7c609bc4f63c`. The search covered 88 fetched
branch, tag and PR references; path history; 3,395 reachable and unreachable
Git objects; 673 reflog entries; stashes; and registered and archived
worktrees. No authoritative Git blob with the observed checksum was found.

Several retained older Windows working-tree materialisations contain the exact
4,064 CRLF bytes and checksum observed by R11. The same working trees also
contain the independently proven R10 CRLF representation. Current PR #45 pins
executable migration SQL to LF; the older branch attributes used automatic
text handling without an explicit EOL. This corroborates the mechanical
explanation but does not recover the historical checkout configuration,
wrapper, operator or exact applied artifact.

Repository history documents that the July 10 migrations were applied in one
`prisma migrate deploy` batch. That establishes the documented command family,
not the byte provenance of the historical checkout. No unsupported provenance
claim is made.

## Classification

Classification is **A - Exact alternate-byte representation proven**, with
high confidence. The exact observed checksum is mechanically reproducible and
reverse normalization is byte-for-byte exact. Classification B is not used
because no matching authoritative historical Git blob was recovered. C and D
do not apply.

## Exact Repository Treatment

The immutable migration and manifest remain unchanged. Attestation schema
`clada-adr-0024-lineage-attestation/v4` holds an exact two-entry tuple array:
the previously proven R10 tuple and this independently proven R11 tuple. Each
entry binds all of the following:

- exact Production fingerprint, migration name and record ID;
- exact canonical repository and observed Production checksums;
- successful lifecycle metadata and no migration log;
- classification, byte representation, evidence reference and raw evidence
  SHA-256;
- exact manifest and approved repository-lineage baseline; and
- pending or active ADR-0024 lifecycle, retiring with the attestation.

The verifier requires every declared tuple and verifies each one
independently. One tuple cannot satisfy the other. Missing, duplicated,
cross-matched, changed or wildcard values fail closed. The legacy singular
summary result remains only as a compatibility status and is backed by the
complete per-migration result array.

Strict Preview, test, development and fresh-database verification still
accepts only canonical manifest checksums. There is no checksum pattern,
global CRLF allowance, name-only match or cross-database exception.

The pending attestation retains zero accepted captures and zero approvals. It
has not been activated and no lineage acceptance is claimed. R11 remains
closed; another complete Production evidence capture requires an independently
approved change and this work creates no R12 authority.
