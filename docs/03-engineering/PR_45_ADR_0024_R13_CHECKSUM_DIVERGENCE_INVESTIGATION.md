# PR #45 ADR-0024 R13 Checksum Divergence Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-PR-45-ADR-0024-R13-CHECKSUM-INVESTIGATION |
| Status | Complete; classification A; no acceptance implemented |
| Owner | Patrick McKenna |
| Review cycle | Before any fourth historical-state decision |
| Last reviewed | 2026-08-10 |

## Scope

This was a repository-only investigation at approved HEAD
`cd6cd164ad99f8f7c3f76a00c9fc5d7eb6b4743e`. It made no Production
connection, did not run capture or status, and did not execute or resolve a
migration. R13 remains permanently closed.

## Canonical Migration

The committed
`prisma/migrations/20260716183000_pilot_installer_auth/migration.sql` is a
2,572-byte UTF-8 file without a BOM. It has 81 LF line endings, no CRLF or lone
CR line ending, and one final LF. Its SHA-256 is the unchanged manifest value:

```text
d35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb
```

It is non-empty and has 18 top-level statements. The SQL adds organisation
slugs and verification state, deterministic slug backfill and uniqueness,
pilot-user password and last-login fields, email normalisation and its guard,
the exact legacy-membership cleanup and duplicate-membership guard, unique
membership enforcement, and the `AuthSession` table with its primary key,
indexes and cascading user foreign key. An ordinary successful Prisma
application of this migration must record one applied step.

## Mechanically Justified Candidates

| Representation | Bytes | SHA-256 | Canonical | R13 observed |
| --- | ---: | --- | --- | --- |
| Exact Git blob / LF / final LF | 2,572 | `d35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb` | yes | no |
| LF / no final LF | 2,571 | `1f53651931bfeca58872ef57d45ad3885c5200d339d537f844e45a9e098f48a7` | no | no |
| CRLF / final CRLF | 2,653 | `fee0749e78b3ecc7aea1f6823b338a16c0ed5fb8e4613e079042bb52192913a9` | no | yes |
| CRLF / no final newline | 2,651 | `a0821aaa7116cd8a7aae28298bf4186a99f50c785b41635daa80f4de2df5171b` | no | no |
| UTF-8 BOM + LF / final LF | 2,575 | `691ddcbce4af83f2bac5771dd67c5ca0e5572db96c82296e45efca919de132e0` | no | no |
| UTF-8 BOM + CRLF / final CRLF | 2,656 | `61689326db270a2ff3930ece73a90ee03f292564940c2cc364e4c31cb88ca604` | no | no |

Converting each of the 81 CRLF sequences in the exact match back to LF returns
the committed Git blob byte for byte. SQL tokens, comments and statement order
are unchanged. This is checksum classification **A: exact alternate-byte
representation proven**.

Matching CRLF materialisations were found in retained Windows worktrees. The
same primary Windows materialisation reproduces the observed R10, R11, R12 and
R13 Production checksums exactly. The migration was introduced once in commit
`7b014d1cedeffc8f38e04d309769c281a47ab26a`; no separate checksum-identical
committed blob was recovered.

## Boundary

Classification A proves only byte and SQL-content equivalence. It does not
prove that this migration file executed and does not make a finished zero-step
record an ordinary successful migration. The independent
[zero-step lifecycle investigation](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md)
therefore remains mandatory.

The deterministic evidence file is
`docs/03-engineering/evidence/ADR_0024_R13_CHECKSUM_DIVERGENCE.json`, SHA-256
`9134ad417c1fba9ff440af03c1e0853b83eca69aa0b0696f67b538d728532ed8`.
