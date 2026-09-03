# PR #45 ADR-0024 R4 Post-Migration Schema Fingerprint Investigation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-R4-POST-MIGRATION-SCHEMA-INVESTIGATION-2026-08-26 |
| Status | Complete; repository defect repaired fail closed |
| Owner | Clada Systems Engineering |
| Review cycle | Before any ADR-0024 Production post-migration verification |
| Last reviewed | 2026-08-26 |
| Closed operation | `CHG-2026-08-26-ADR0024-PASSWORD-RESET-PROD-RECONCILIATION-R4` |
| Authoritative pre-migration evidence | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19` |

## Scope and immutable R4 result

This investigation used repository history, retained secret-free artifacts and
disposable database evidence only. It did not load a Production credential or
connect to a database.

R4 is permanently closed. Prisma reported that the one authorised invocation
of `20260724180000_password_reset_foundation` completed successfully. Strict
Production postflight then stopped with repository exit `26`, classification
`SCHEMA_MISMATCH`, at the exact comparison between the computed catalog
fingerprint and the attestation's expected `postMigrationFingerprint`.

The expected value was
`685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343`.
The observed value was not emitted. No structured postflight evidence object
was emitted. This investigation does not reconstruct the observed value,
ledger timestamps, or pending set and does not claim that postflight passed.

The retained R4 artifacts were rehashed before investigation:

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| `operation-boundary-final.json` | `dd66adb9422e806b6e5142bb68457415d34e4f332b75fc6de94ad9425aa557cd` | matched |
| `pre-migration-boundary.json` | `9e68d39dbca36854b406b1eb86d9081edbf17dd957125ceadc466a9c0385a16d` | matched |
| `migration-child-stdout.bin` | `d8e25b7d39733add457c9cedf0146ba34bd433da7a194072c9bd4615b29225d0` | matched |
| `migration-child-stderr.bin` | `ecc5e60cefd80559f285763c174611ed698c1f67da340d4a2000ae9faf74a688` | matched |
| `migration-child-complete.json` | `2241b7d413cdeec95dc7e2b43bf9c7a8b8cd6fe1630215d6c8e38bd34800f32e` | matched |

The authoritative final boundary records operation start
`2026-08-26T10:24:08.7212974+00:00`, stop
`2026-08-26T10:27:42.3335884+00:00`, one migration invocation, Prisma success
and commit reported, no retry, no manual SQL, and no later Production command.

## Expected fingerprint provenance

Git history proves that `685ee5...` first entered the attestation in commit
`01475ac625864acaa14516666c000b900c053ad3` at
`2026-08-17T18:43:07+01:00`, `Activate ADR-0024 Production lineage
attestation`. The parent revision had null pre-, post- and fresh-head
fingerprints. The activation commit populated:

- `preMigrationFingerprint` from R19's observed Production catalog;
- `postMigrationFingerprint` from a disposable 16-migration database; and
- `freshHeadFingerprint` from that same disposable database.

The R19 operation record states explicitly that the post/fresh value was
derived only on disposable local PostgreSQL after all 16 canonical migrations
and was not derived from a Production write. The later fixed pre-production
database gate reproduced `685ee5...` on disposable PostgreSQL. No retained
artifact shows a Production-specific post-migration catalog producing it, and
the fingerprint contract defines no algebraic `pre-hash + migration` operation.

The value was therefore a valid disposable rehearsal fingerprint but an
unsupported Production postflight expectation.

## Fingerprint contract

`lib/schema-fingerprint.ts` defines version
`clada-postgres-schema-fingerprint/v2`. It canonicalises the following catalog
arrays and hashes the canonical JSON with SHA-256:

- public namespace and table identity;
- column position, name, PostgreSQL and information-schema types, nullability,
  exact default expression, identity and generated state;
- constraint name, type, exact definition, ordered columns and referenced
  schema/table;
- index name, uniqueness, primary state, key and included columns,
  expressions, predicates, constraint backing and exact definition;
- enum schema, name and ordered values;
- installed extension name, version and schema;
- non-internal public trigger identity, enabled state and exact definition;
- public sequence properties; and
- unsupported public relation objects.

Each top-level array is sorted by canonical JSON. Object keys are sorted by the
canonical JSON implementation. Enum values and constraint columns retain their
meaningful order. The hash includes the fingerprint version, public scope and
the fixed exclusion declaration.

The contract excludes `public._prisma_migrations` because the ledger is
verified separately. It also excludes OIDs, owners/ACLs, timestamps, planner
statistics and physical storage/tablespace metadata. It does not exclude
extension versions or textual catalog definitions. PostgreSQL/provider/version
formatting and approved historical objects can therefore affect the hash.

Applying the same additive migration to two distinct valid pre-migration
catalogs does not make their canonical JSON equal. A focused regression test
adds the same password-reset marker to disposable and approved-historical
fixtures: both pass the named post-reset assertions and their full fingerprints
remain different. This rejects convergence hypothesis H3.

## Retained environment evidence

| Environment/source | Applied repository migrations | Fingerprint | Catalog evidence |
| --- | ---: | --- | --- |
| R19 Production pre-migration | 15 | `1d1354ca5bf23142fee9cbe3302b7a88c670c1426594563d70a1c24d35151d81` | 1 namespace, 17 tables, 250 columns, 50 constraints, 92 indexes, 18 enums, 1 extension, no triggers/sequences/unsupported objects |
| PR #44 disposable pre-reset | 15 | `fbe0fae4569e466df55764a5d23926c22f03727d822c48e0f6566b08dbfde5ee` | retained tooling fingerprint; full catalog rows not retained |
| PR #44 disposable/fresh head | 16 | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` | reset schema present; full catalog rows not retained |
| Retained Preview 16-migration state | 16 | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` | strict Preview clean; full catalog rows not retained |
| Current disposable pre-production gate | 16 | `685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343` | canonical reset migration applied; full catalog rows not retained |

The same nominal 16 migrations have produced at least two retained
non-Production fingerprints. Production's approved 15-migration fingerprint
also differs from the disposable 15-migration fingerprint. The empirical and
contract evidence supports H1 and H2: the R4 expectation was copied from a
fresh/disposable catalog, while approved Production history can legitimately
preserve a different post-migration fingerprint.

## R19 reconstruction limit

Both R19 capture artifacts were rechecked. They retain the complete normalized
17-row ledger, fingerprint, catalog counts, five named assertions, 21 selected
pilot-auth historical assertions, unsupported-object count and deterministic
evidence digest
`19027bc451ba6fd25b17ccfd69f4106c5562df1cb396928b7b91aab74697fb98`.

They do not retain the full rows needed by fingerprint v2: all 17 table
descriptors, 250 column descriptors, 50 constraint definitions, 92 index
definitions, 18 enum definitions and extension metadata. No other retained
repository or local artifact contains a complete R19 canonical catalog
snapshot. A local reconstruction therefore cannot be required to reproduce
`1d1354...` exactly and cannot produce a trusted Production post-migration
hash. No derived post hash is recorded.

## R4 catalog assertions

Control flow in `lib/lineage-verifier.ts` proves that the safe R4 mismatch was
raised only after `assertNamedCatalog` and `fingerprintCatalog` returned. For
the `post-password-reset` profile, exactly five named assertions ran:

1. each of `Lead.internalNotes`, `Lead.followUpDate`, `Lead.assignedAdmin` and
   `Lead.assignedInstaller` existed once with the exact expected type, nullable
   state, null default and no dedicated one-column index or constraint; and
2. `PasswordResetRequest` existed exactly once.

This safely establishes the reset table's presence and the four Lead
conditions at the read instant. The named assertions do not check the two reset
enums, all 16 reset columns, six explicit indexes, primary-key index, primary
key, foreign key, defaults or unrelated catalog objects. They cannot replace
the full fingerprint and cannot establish complete schema equivalence.

## Mechanically supported catalog model

The canonical reset migration adds one table, 16 columns, two constraints (the
primary key and foreign key), seven indexes (the primary-key index and six
explicit indexes), and two enums. It adds no namespace, extension, trigger,
sequence or unsupported relation. Applied to the R19 counts, the diagnostic
model is therefore 18 tables, 266 columns, 52 constraints, 99 indexes and 20
enums, with other counts unchanged. Count agreement would not prove the full
fingerprint.

## Classification

Classification is **A — incorrect expected `postMigrationFingerprint`
proven**, with high confidence.

The proof concerns the invalid expected value, not the unknown observed
Production value. A genuine independent Production drift remains possible and
cannot be resolved from repository-only evidence. Production must be treated
as potentially in the intended post-migration state but unverified.

## Narrow fail-closed repair

Attestation v6 now separates a Production post-migration expectation from the
disposable fresh-head rehearsal:

- `postMigrationFingerprint` is null;
- `postMigrationEvidence` is null;
- `freshHeadFingerprint` remains the reproducible disposable value `685ee5...`;
- a future populated post fingerprint must have an indexed, exact
  `production-read-only-capture` evidence tuple containing the same fingerprint,
  Production database fingerprint, artifact reference and SHA-256, repository
  revision, change ID and capture timestamp; and
- both `production-preflight` and `production-postflight` fail closed when that
  evidence is unavailable. An exact evidenced fingerprint mismatch remains
  `SCHEMA_MISMATCH`, exit `26`.

The checked-in attestation is `retired`. R19's two captures, one accountable
human approval, seven historical checksum tuples, pilot-auth historical state,
pre-migration fingerprint and immutable evidence remain preserved. Retirement
follows the existing `Material schema-lineage change` and `Supporting evidence
invalidated` conditions. Changing status back to active or populating a
Production post fingerprint requires new human governance approval.

The repair does not accept any fingerprint, does not normalize fingerprints,
does not treat catalog assertions as a substitute and does not change the
migration SQL or manifest.

## Required next action

The repository is ready for a separately authorised **read-only** Production
post-migration verification using the fixed guarded schema-fingerprint command.
That operation must retain the observed v2 fingerprint and safe assertions; it
must not execute a migration. A later attestation amendment may use the result
only with new human approval and complete evidence validation.

R4 must never be reused or retried.

## Safety record

- Production credential loaded: no.
- Production connection or query: no.
- Production migration or status command: no.
- Manual SQL, `migrate resolve` or `db push`: no.
- Deployment or alias movement: no.
- PR merge: no.
