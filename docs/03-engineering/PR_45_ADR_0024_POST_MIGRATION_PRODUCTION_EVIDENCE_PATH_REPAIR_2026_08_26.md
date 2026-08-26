# PR #45 ADR-0024 Post-Migration Production Evidence Path Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-PR45-ADR0024-POST-MIGRATION-EVIDENCE-PATH-REPAIR-2026-08-26 |
| Status | Repository repair complete; a new separately authorised read-only Production operation remains required |
| Owner | Clada Systems Engineering |
| Review cycle | Before the next ADR-0024 post-migration Production verification |
| Last reviewed | 2026-08-26 |
| Authorised baseline | `2913301a4e662b4b475c3355428b08e9f3ee2b94` |
| Pull request | PR #45, kept Draft |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |

## Scope And Outcome

This change adds the minimum fixed repository path needed for a future,
separately authorised read-only Production verification after
`20260724180000_password_reset_foundation` has already been applied. It does
not perform that verification and grants no database or release authority.

During this repair no Production credential was loaded, no Production
connection or transaction was opened, no Production query or capture ran, no
database write or migration ran, no application was deployed and no alias
moved. The retired attestation was not populated, approved or activated.

## Closed R1 Stop And Root Cause

`CHG-2026-08-26-ADR0024-POST-MIGRATION-PROD-VERIFY-R1` is permanently closed.
It stopped before child launch because the repository did not yet have a
post-migration operation contract. The stop exposed five independent and
correctly fail-closed incompatibilities:

1. Operation retention accepted only the historical `PROD-EVIDENCE` change-ID
   family and rejected the distinct `POST-MIGRATION-PROD-VERIFY` purpose.
2. Historical capture required a pending attestation, while the authoritative
   ADR-0024 v6 attestation is retired after the R4 postflight stop.
3. Historical ledger verification required 15 applied migrations and the
   password-reset migration pending, not the required post-application 16/0
   state.
4. Historical catalog assertions required `PasswordResetRequest` to be absent,
   not the canonical schema introduced by the final migration.
5. The fixed credential-file launcher exposed only `status`, `migrate-test`
   and `migrate-production`; it had no fixed read-only evidence selector.

The historical path could not safely be reused because changing any of those
meanings in place would allow old evidence, old lifecycle state or a
pre-password-reset schema to cross-satisfy the new operation.

## Fixed Operation Boundary

The new fixed command is `post-migration-production-evidence`. The outer
credential boundary remains
`scripts/run-database-command-from-env-file.ts`, which accepts only an exact
allowlisted command and one ignored dotenv-compatible credential file. It uses
Node `util.parseEnv`, fixed Node executable resolution, exact argument arrays
and `shell:false`.

The fixed command selects only
`scripts/launch-post-migration-production-evidence.ts`. That launcher uses the
hardened Node retention path and invokes only
`scripts/capture-post-migration-production-evidence.ts`. Callers cannot choose
an executable, script or argument vector, and the command is not routed
through the write-capable database command implementation.

The operation family accepts only change IDs matching:

```text
CHG-YYYY-MM-DD-ADR0024-POST-MIGRATION-PROD-VERIFY-R#
```

with a positive, non-zero revision number. Historical `PROD-EVIDENCE` IDs and
arbitrary IDs remain rejected. The post-migration operation uses its own exact
governance variables and does not broaden the old capture contract.

## Evidence Contract

The new version is:

```text
adr-0024-production-post-migration-evidence/v1
```

Its purpose is `post-migration-production-verification`. It requires:

- environment `production`;
- database `neondb`;
- branch `br-cool-wave-abysq3lu`;
- fingerprint `db_4e1d3bd23cff6801`;
- ADR-0024 attestation version v6 and status `retired`;
- null `postMigrationFingerprint` and `postMigrationEvidence` before the
  future capture;
- both retained R19 captures and the retained R19 human approval;
- a new, evidence-specific human approval before any later attestation
  amendment or activation.

Historical R19 evidence, Preview, Development, test, disposable PostgreSQL,
pending/active attestations and pre-password-reset evidence cannot satisfy
this version.

## Exact Ledger Contract

Post-migration ledger verification requires the immutable manifest to contain
exactly 16 repository migrations, with all 16 applied and none pending. The
final repository migration must be:

```text
20260724180000_password_reset_foundation
cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7
```

It must have exactly one ledger row with a present start time, present finish
time, no rollback, `applied_steps_count = 1` and no logs. Missing, duplicate,
pending, unfinished, rolled-back, zero-step, wrong-checksum or logged records
fail closed.

The verifier also revalidates, without redefining them:

- all seven independently pinned ordinary Production checksum-divergence
  tuples; and
- the separately attested pilot-auth historical-resolved migration.

The retired post-migration mode is explicit and narrow. The pre-migration
pending and active modes retain their original meanings.

## Post-Password-Reset Catalog Contract

The `post-password-reset` assertion set preserves the existing operational
`Lead` assertions and additionally requires exactly the canonical
`PasswordResetRequest` structure:

- all expected columns in exact ordinal order;
- exact PostgreSQL and logical types, nullability and defaults;
- exact identity and generated state;
- both password-reset enums and their ordered values;
- the exact primary key and restrictive foreign key to `User(id)` with the
  canonical update/delete actions;
- all expected unique and operational indexes, including expressions,
  predicates and included-column state;
- no unexpected reset index, constraint, trigger, sequence or public relation.

PostgreSQL 18 exposes column not-null constraints through `pg_constraint`.
The assertion accepts only the exact complete canonical set on runtimes that
expose those descriptors, or their complete absence on earlier supported
PostgreSQL versions where nullability remains proved by the exact column
descriptors. Partial or altered not-null descriptor sets fail closed.

## Complete Fingerprint Evidence

Each capture retains the existing
`clada-postgres-schema-fingerprint/v2` canonical payload. No second
fingerprint algorithm or runtime normalization was added. The evidence
includes the complete normalized descriptor categories used by v2:

- namespaces and relations;
- columns, logical/database types, nullability, defaults, identity and
  generated state;
- constraints and complete foreign-key definitions;
- indexes, predicates, expressions and included columns;
- enum values;
- extensions with versions and schemas;
- triggers and sequences; and
- unsupported relations.

The descriptor digest is SHA-256 over the existing canonical fingerprint
payload and must equal the reported v2 fingerprint. A mismatched descriptor
digest, fingerprint or canonical payload is rejected.

## Dual Read-Only Capture

One future authorised invocation performs exactly two internal captures. Each
uses a separate Prisma transaction at `RepeatableRead` and makes
`SET TRANSACTION READ ONLY` its first executable statement. Only the fixed
identity, migration-ledger and catalog reads follow. The purpose-built capture
entry point imports no migration, seed, repair or generic write selector.

Each capture contains the safe identity, repository SHA, manifest, immutable
inventory, complete normalized ledger, seven tuple results, pilot-auth result,
final migration lifecycle, pending set, canonical catalog descriptors,
fingerprint v2, descriptor digest, catalog counts, named catalog assertions
and unsupported-relation evidence.

The two deterministic payloads are compared with canonical ordering. Capture
ordinal, logical artifact reference, capture time and raw file hash are
envelope metadata and are intentionally excluded from deterministic equality.
Every stable field and the deterministic digest must match.

## Write-First Retention

The new operation uses a separate exact retention profile while preserving the
historical profile unchanged. Node writes and flushes the operation boundary,
raw stdout, raw stderr, child exit and child-completion boundary atomically
before optional parsing, hashing or enrichment. Hashing uses Node
`createHash('sha256')` over raw bytes.

On success, capture 1 and capture 2 are validated and then written as separate
artifacts with exact raw SHA-256 values. A later reporting failure cannot erase
the retained child result or replace its typed exit. PowerShell is not in the
critical launcher or retention path.

## Governance Separation

The checked-in attestation remains v6 and `retired` with:

- `postMigrationFingerprint = null`;
- `postMigrationEvidence = null`;
- two retained historical R19 captures; and
- one retained historical human approval.

The repair adds no Production value, capture reference or approval. A future
successful read-only operation supplies evidence only. Incorporating that
evidence remains a separate governance action requiring a new qualified-human
approval; the R19 approval is not approval for new evidence.

R19 remains historical pre-migration evidence: 15 applied, the final migration
pending, fingerprint
`1d1354ca5bf23142fee9cbe3302b7a88c670c1426594563d70a1c24d35151d81`,
two captures, deterministic digest
`19027bc451ba6fd25b17ccfd69f4106c5562df1cb396928b7b91aab74697fb98`
and one approval. R4 remains the closed single migration invocation whose
strict postflight stopped because its expected Production fingerprint had
disposable provenance. Neither historical record was rewritten.

## Disposable PostgreSQL Validation

The repaired contract was rehearsed without Production credentials on a
temporary loopback PostgreSQL 18 cluster. All 16 immutable migrations applied
canonically, the repository ledger reported 16 applied and zero pending, and
the final migration had its exact checksum and ordinary successful one-step
lifecycle.

The final full-gate disposable database fingerprint was
`db_8351fc688c5ff5ae`. Its local evidence reference was
`.tools/preproduction-validation/2026-08-26T19-54-14.756Z.json`. The
complete post-migration catalog fingerprint was
`685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343`.
That value is disposable test evidence only and is never accepted as a
Production fingerprint.

The complete reset and existing Lead assertions passed, the canonical
descriptor digest equalled fingerprint v2, the evidence generator and
deterministic comparison were exercised through unit fixtures, and read-only
integration verification proved `transaction_read_only = on`. All 69
disposable integration assertions passed. The temporary server stopped, its
loopback port closed and its temporary directory was removed.

## Negative And Security Coverage

Focused tests reject incorrect attestation lifecycle/version, 15/1 and other
non-16/0 ledger states, every malformed final-migration lifecycle, all
non-Production identities, schema and catalog drift, fingerprint/descriptor
digest drift, deterministic capture drift, unsupported relations, historical
cross-satisfaction, arbitrary change IDs/commands/scripts and credential-file
ambiguity.

Launcher tests cover Windows command environments and a Node executable path
containing spaces while proving exact argv and `shell:false`. Retention tests
prove typed exits and raw artifacts survive optional parsing failures. Static
security tests prove the capture entry point exposes only the read-only
transaction statement and contains no migration, write, shell or caller-path
selection.

## Next Authorised Operation

The repository is mechanically prepared for a new, separately authorised
read-only Production post-migration verification after all fresh operational
gates pass. This repair is not that authorisation. R1 and R4 remain closed, the
password-reset migration must not be invoked again, and no Production action
may proceed without a new explicit prompt and new exact change ID.
