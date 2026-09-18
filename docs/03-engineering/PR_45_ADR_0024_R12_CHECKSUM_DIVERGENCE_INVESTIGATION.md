# PR #45 ADR-0024 R12 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R12-CHECKSUM-DIVERGENCE |
| Status | Classification A proven; exact third tuple implemented; Production recapture requires separate authorisation |
| Owner | Clada Systems Engineering |
| Review cycle | Before any separately authorised ADR-0024 Production capture and at attestation retirement |
| Last reviewed | 2026-08-07 |

## Scope And Evidence Boundary

This repository-only investigation follows the permanently closed read-only
operation `CHG-2026-08-06-ADR0024-PROD-EVIDENCE-R12`. R12 itself established
only the typed `LEDGER_MISMATCH` stop and the exact safe values in the
[R12 operation record](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R12.md). R12 did not
prove a line-ending cause, and its historical record has not been rewritten to
imply otherwise.

This investigation did not connect to Production, run the Production capture
or status command, execute SQL, apply or resolve a migration, edit a database
ledger, deploy an application or move an alias.

The mechanically retained evidence is
[ADR_0024_R12_CHECKSUM_DIVERGENCE.json](evidence/ADR_0024_R12_CHECKSUM_DIVERGENCE.json),
whose raw-file SHA-256 is
`0b773879debbf8250f4a5f67c06d2ce9fbb31c2d2774b9d79089a7cefe60c915`.

## Fixed Inputs

| Field | Exact value |
| --- | --- |
| Repository baseline | `a60da87c62bb22d406f3e36f8484a13d14086a32` |
| Migration | `20260710140000_workflow_foundation` |
| Production record ID | `ce4489c9-fa9b-41e0-90fc-23a584e162da` |
| Canonical repository checksum | `7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d` |
| Observed Production checksum | `fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Production fingerprint scope | `db_4e1d3bd23cff6801` |
| Record normalization | `adr-0024-migration-record-normalization/v1` |

The authoritative source bytes were read from the exact committed Git blob,
not from a working-tree copy.

## Mechanical Proof

The committed blob is UTF-8 without a BOM, contains 263 LF bytes, ends with a
newline and is 12,927 bytes. Replacing every LF with CRLF while retaining the
final newline creates a 13,190-byte file whose SHA-256 is exactly the observed
Production checksum. Replacing those CRLF pairs with LF returns byte-for-byte
equality with the committed blob.

| Transformation | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Exact Git blob / LF with final newline | 12,927 | `7874c3e8fe00b0b0058e4147508e03b2c617b2910b34f707179fc9f3e994110d` | Canonical match |
| LF without final newline | 12,926 | `e7606ae3e506d2ae026c362f429f262516e8ebcb1586039e561fe90e2fba257f` | No match |
| CRLF with final newline | 13,190 | `fbcc4133e665566e6aadd542c094dcc527d565a64ca0339f054025f4e8b709f8` | Production match |
| CRLF without final newline | 13,188 | `7ddddd222886df878d753edb676712159dc7d115e91acfbcdc1e395a1fa3b5fe` | No match |
| UTF-8 BOM and LF | 12,930 | `d0a8e829c51c13e1efb62f6fd0206b6c8e01d1b75625652ffc9ef5b77e36b3f1` | No match |
| UTF-8 BOM and CRLF | 13,193 | `9abb6f066ec45a7628671c3f219ce4d8fd89d28f1598b6029d1df911ea7250ab` | No match |
| UTF-8 BOM, LF, no final newline | 12,929 | `f18d140a6f52944fe51b13ae6b30f85334b231efb11d253c4fd597cc789d7551` | No match |
| UTF-8 BOM, CRLF, no final newline | 13,191 | `c29a568e155fc4863613083f799265c64bc054fe94c17375d70fabfbb228acee` | No match |

Only 263 carriage-return bytes differ. No SQL token, statement, comment,
ordering or UTF-8 content differs. The proof is therefore an exact alternate
byte representation of the same SQL, not a semantically different migration.

## Repository And Historical Search

The migration entered history in commit
`9932f63eb2a35e99a0f443d2eb6a0b992981fef4` and was updated in commit
`3b045301f01c041eefc3ad28482dcd91d579b04d`. The search covered 89 fetched
branch, tag and PR references; path history; 3,428 reachable and unreachable
Git objects, including 1,544 blobs; 676 reflog entries; stashes; 578
unreachable entries; and registered worktrees. No Git blob has the alternate
13,190-byte size, and no authoritative historical Git blob with the observed
checksum was recovered.

The retained main Windows worktree contains the exact 13,190 CRLF bytes and
checksum observed by R12. It also contains the independently proven R10 and
R11 CRLF representations. Current PR #45 pins executable migration SQL to LF;
the older branch attributes used automatic text handling without an explicit
EOL. This corroborates the mechanical explanation but does not recover the
historical checkout configuration, wrapper, operator or exact applied
artifact.

Repository history documents that the three adjacent July 10 migrations were
applied in one `prisma migrate deploy` batch. That establishes the documented
command family, not the byte provenance of the historical checkout. No
unsupported provenance claim is made.

## Classification

Classification is **A - Exact alternate-byte representation proven**, with
high confidence. The exact observed checksum is mechanically reproducible and
reverse normalization is byte-for-byte exact. Classification B is not used
because no matching authoritative historical Git blob was recovered. C and D
do not apply.

## Exact Repository Treatment

The immutable migration and manifest remain unchanged. Attestation schema
`clada-adr-0024-lineage-attestation/v4` now holds an exact three-entry tuple
array: the unchanged R10 and R11 tuples and this independently proven R12
tuple. Each entry binds all of the following:

- exact Production fingerprint, migration name and record ID;
- exact canonical repository and observed Production checksums;
- successful lifecycle metadata and no migration log;
- classification, byte representation, evidence reference and raw evidence
  SHA-256;
- exact manifest and approved repository-lineage baseline; and
- pending or active ADR-0024 lifecycle, retiring with the attestation.

The verifier requires every declared tuple and verifies each one
independently. No tuple can satisfy another. Missing, duplicated,
cross-matched, changed or wildcard values fail closed. The fact that the three
adjacent migrations share a byte transformation remains evidence and does not
create a generalized rule.

Strict Preview, test, development and fresh-database verification still
accepts only canonical manifest checksums. There is no checksum pattern,
global CRLF allowance, name-only match or cross-database exception.

The pending attestation retains zero accepted captures and zero approvals. It
has not been activated and no lineage acceptance is claimed. R12 remains
closed; another complete Production evidence capture requires an independently
approved change and this work creates no R13 authority.
