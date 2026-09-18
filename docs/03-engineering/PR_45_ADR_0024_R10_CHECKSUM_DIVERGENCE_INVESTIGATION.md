# PR #45 ADR-0024 R10 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R10-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; narrow repository treatment implemented; Production recapture pending separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before the next separately authorised ADR-0024 Production evidence capture and at attestation retirement |
| Last reviewed | 2026-08-06 |

## Scope And Evidence Boundary

This repository-only investigation follows the permanently closed read-only
operation `CHG-2026-08-05-ADR0024-PROD-EVIDENCE-R10`. R10 itself established
only the typed `LEDGER_MISMATCH` stop, the exact safe record ID and the expected
and observed checksums recorded in the
[R10 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R10.md). R10 did not
prove a line-ending cause and that historical record has not been rewritten to
imply otherwise.

This investigation did not connect to Production, run the Production capture
or status command, execute SQL, apply or resolve a migration, edit a database
ledger, deploy an application or move an alias.

The mechanically retained candidate set is
[ADR_0024_R10_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R10_CHECKSUM_DIVERGENCE.json),
whose raw-file SHA-256 is
`1a9e69ad0be6fd7127be11cee7f993da6418d5f7a4e0f8431a67cd83d0252a65`.

## Fixed Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `1949ebe495801b26f6f59d2785a6b86b2864b153` |
| Migration | `20260710120000_identity_organisation_foundation` |
| Production record ID | `112c6124-f0c2-4b6b-8d02-f6ce835746e3` |
| Canonical repository checksum | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` |
| Observed Production checksum | `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint scope | `db_4e1d3bd23cff6801` |
| Record normalisation | `adr-0024-migration-record-normalization/v1` |

The authoritative source bytes were read from the exact committed Git blob,
not from the working tree. `.gitattributes` pins every executable migration SQL
file to LF and local `core.autocrlf` is false.

## Mechanically Justified Candidates

No SQL statement, token, comment, space or ordering permutation was attempted.
The tested candidates cover Git bytes, normal LF/CRLF materialisation, UTF-8
BOM state, final-newline state and the legacy Windows PowerShell UTF-16
encoding default.

| Transformation | Bytes | SHA-256 | Canonical | Production |
| --- | ---: | --- | --- | --- |
| Exact committed Git blob | 6,162 | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | Match | No |
| UTF-8 no BOM, LF | 6,162 | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | Match | No |
| UTF-8 no BOM, CRLF | 6,296 | `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` | No | Match |
| UTF-8 BOM, LF | 6,165 | `00d6f43b720fea0b0b57ec1439bde16320e59411177d1577e35b293b9f5920bc` | No | No |
| UTF-8 BOM, CRLF | 6,299 | `3c8cfc9848783e0494eb22f92919bccd36fb3ad59962cb6a54bc87d87b8a4163` | No | No |
| UTF-8 no BOM, LF, no final newline | 6,161 | `37a78b1e1dbc98365c8c39f7fc5c5b3d155e126b9fc281588bf51f0eadb484e0` | No | No |
| UTF-8 no BOM, LF, final newline | 6,162 | `fc396b2cac59d7dee67ad7f0b91fb379dba9f021f26be9c0e93ae29d74752cb3` | Match | No |
| UTF-8 no BOM, CRLF, no final newline | 6,294 | `d2c9e654ec668230d37db4e1cf7e8147a802cee14c76f0eef97cdf649b3e35fc` | No | No |
| UTF-8 no BOM, CRLF, final newline | 6,296 | `c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714` | No | Match |
| UTF-8 BOM, LF, no final newline | 6,164 | `203a9f18761d02d4a0ee663565eeb8bb5db7473ff435d2937eb6330083fe6cbb` | No | No |
| UTF-8 BOM, CRLF, no final newline | 6,297 | `0b12b9d8e34ebb1dc4575c01cfcf214f330f9582e6b2107368c0b52058e2c3c7` | No | No |
| Windows PowerShell UTF-16LE BOM, LF | 12,326 | `034048a811ae8b3ff3364e3588aae95db6d2760c1946fd4a6632c3b0a5fe0db3` | No | No |
| Windows PowerShell UTF-16LE BOM, CRLF | 12,594 | `f06f76393b8904649fb45e50decbfa0452eb9b782036221a403f303b92807a55` | No | No |
| UTF-16BE BOM, LF | 12,326 | `44da6923a74da6effde6fbfa270e761f763aacb73ec1907f0264031d761a5a5a` | No | No |

The committed blob contains 134 LF bytes, has no UTF-8 BOM and retains a final
newline. Replacing each LF byte with CRLF adds exactly 134 bytes and produces
the 6,296-byte Production checksum. Converting only those CRLF pairs back to
LF returns byte-for-byte equality with the committed blob. Therefore the SQL
semantic content is unchanged; only its line-ending representation differs.

Git working-tree conversion before the later LF pin is the mechanically
plausible source of the matching bytes. UTF-8 BOM insertion, final-newline
removal and Windows PowerShell's legacy UTF-16 output do not match. Nothing in
the retained repository evidence requires Prisma to reconstruct or rewrite the
SQL: a migration tool reading a CRLF working-tree file would receive the exact
matching bytes. The historical applying command, checkout configuration and
operator were not recovered, so the representation is proven but its original
process provenance is not claimed.

## Repository And Historical Evidence Search

The search covered every fetched local and remote branch, tag and PR #45 ref;
the complete path history; Git object inventory; reflogs; stashes; reachable
and unreachable objects; registered and archived worktrees; manifests; local
CI/evidence names; Preview lineage documentation; R1 through R10 records; and
the incident and runbook. Git contained 3,363 enumerated objects and no blob of
the required 6,296-byte size, so classification B is not claimed.

The [Preview repair record](PR_45_PREVIEW_MIGRATION_LINEAGE_REPAIR_2026_07_29.md)
contains the exact same
`c1d5440e4efe0426fea04a4aa480a285bd74aa47dd82a57d673305c3200ac714`
checksum and independently records the same current SQL transformed from
6,162 LF bytes to 6,296 CRLF bytes. Preview was rebuilt to the canonical
checksum and receives no exception. The precedent is corroborating evidence;
the local exact-byte reproduction is the classification proof.

## Classification

Classification is **A - Exact alternate-byte representation proven**, with
high confidence. The exact observed checksum is mechanically reproducible,
the reverse normalisation is byte-for-byte exact and no SQL token changes.
Classification B is false because no matching authoritative Git blob was
recovered. C and D do not apply.

## Narrow Repository Treatment

The immutable migration and manifest remain unchanged. Attestation schema
`clada-adr-0024-lineage-attestation/v3` explicitly and separately records the
canonical repository checksum and exact observed Production checksum. The
attested path requires all of:

- environment `production` and fingerprint `db_4e1d3bd23cff6801`;
- exact migration name and record ID;
- canonical checksum equality between committed Git bytes, manifest and the
  attestation's `repositoryChecksum`;
- exact Production row equality to `observedProductionChecksum`;
- a valid started and finished timestamp, one applied step, no rollback and no
  logs or log digest;
- exact approved manifest and repository-lineage baseline;
- the fixed classification, byte representation, evidence reference and
  evidence-file SHA-256; and
- pending or active ADR-0024 lifecycle, retiring with the attestation.

This is a singular tuple, not an alternate-checksum list. Strict verification
for Preview, test, development and fresh databases still accepts only the
canonical manifest checksum. Another migration, record ID, fingerprint,
checksum, lifecycle, manifest, evidence file or attestation value fails
closed. Even the canonical checksum fails for this exact historical
Production attestation tuple because the active verifier must prove the row
that Production actually contains, while a fresh canonical database passes
the strict path.

The pending attestation retains zero accepted captures and zero approvals. It
has not been activated and no lineage acceptance is claimed. Another
separately authorised complete read-only Production evidence capture is
required before any activation review. R10 remains closed and this work grants
no R11 authority.
