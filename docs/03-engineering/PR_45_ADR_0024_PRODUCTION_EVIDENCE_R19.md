# PR #45 ADR-0024 Production Evidence Operation R19

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R19-2026-08-17 |
| Status | Complete; R19 permanently closed |
| Owner | Patrick McKenna |
| Review cycle | At attestation expiry, retirement, or qualified-human review trigger |
| Last reviewed | 2026-08-17 |

## Operation boundary

| Field | Value |
| --- | --- |
| Change ID | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19` |
| Approved repository revision | `2b76a33a5f01c746436132c195bdd7582d54817b` |
| Operation start | `2026-08-17T17:19:35.926Z` / `2026-08-17T18:19:35.926+01:00[Europe/Dublin]` |
| Child start | `2026-08-17T17:19:35.956Z` / `2026-08-17T18:19:35.956+01:00[Europe/Dublin]` |
| Child completion | `2026-08-17T17:19:41.755Z` / `2026-08-17T18:19:41.755+01:00[Europe/Dublin]` |
| Reporting completion | `2026-08-17T17:19:41.769Z` / `2026-08-17T18:19:41.769+01:00[Europe/Dublin]` |
| Repository exit | `0` |
| Wrapper exit | `0` |
| Reporting status | `complete` |

R19 used the fixed no-argument Node launcher once. The launcher used its pinned
package-manager entry point, a fixed argument vector and `shell:false`. R19 is
permanently closed and must not be retried.

## Pre-access controls

The branch, local/remote/PR revision, clean worktree, Draft PR, exact-SHA GitHub
Validate run and exact-SHA Vercel Preview were verified before access. The
pending attestation contained zero captures and zero approvals, seven ordinary
checksum-divergence tuples, and one separate pilot-auth historical-resolved
entry. The manifest and all 16 immutable migrations verified. Launcher and
diagnostic-retention tests passed.

Immediately before access, the Neon console showed project `seai-grant-db`,
branch `main`, branch ID `br-cool-wave-abysq3lu`, healthy provider status, idle
compute, no active restore, and a six-hour restore window. Vercel Production
remained Ready at `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`; its live aliases were
unchanged and no Production deployment or promotion was active.

Recovery evidence reference:

`NEON-CONSOLE-RECOVERY-VERIFIED-2026-08-17T17:19:35.532Z-BRANCH-br-cool-wave-abysq3lu-HISTORY-6H`

## Production evidence result

The guarded identity matched `production`, database `neondb`, branch
`br-cool-wave-abysq3lu`, and fingerprint `db_4e1d3bd23cff6801`. Both independent
repeatable-read transactions set read-only mode and completed the fixed
identity, migration-ledger and catalog reads.

All seven independently pinned ordinary checksum-divergence tuples returned
`verified`. The separate `20260716183000_pilot_installer_auth` historical state
returned `captured-for-pending-attestation` with exact live timestamps
`2026-07-17T15:34:36.767818Z`, zero applied steps, no rollback, and no logs.

The normalized ledger contained 17 records and 15 applied repository
migrations. The database-only migration, related failed record, related
completed zero-step record, ordinary migrations, and historical pilot-auth row
all matched their exact repository rules. The exact pending set was:

- `20260724180000_password_reset_foundation`

Password reset had no accepted applied record and remained unapplied.

## Schema and deterministic comparison

The current Production catalog matched the `pre-password-reset` profile.

| Evidence | Result |
| --- | --- |
| Production schema/catalog fingerprint | `1d1354ca5bf23142fee9cbe3302b7a88c670c1426594563d70a1c24d35151d81` |
| Pilot-auth historical catalog assertion digest | `25858c34fa4c2fcbb100d04d1484bb4792aadc2c2985be8a5a95342bb569f8fd` |
| Catalog counts | namespaces 1; tables 17; columns 250; constraints 50; indexes 92; enums 18; extensions 1; triggers 0; sequences 0 |
| Unsupported objects | `0` |
| Disposable post-migration/fresh-head fingerprint | `685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343` |
| Deterministic comparison | `matched` |
| Deterministic evidence digest | `19027bc451ba6fd25b17ccfd69f4106c5562df1cb396928b7b91aab74697fb98` |
| First capture time | `2026-08-17T17:19:40.906Z` |
| Second capture time | `2026-08-17T17:19:41.710Z` |

The five current named assertions passed: the four nullable Lead operational
fields remained free of incompatible defaults, indexes and constraints, and
`PasswordResetRequest` remained absent. All 21 historical pilot-auth evolved
schema assertions passed. The post-migration/fresh-head fingerprint was derived
only on disposable local PostgreSQL after applying the 16 canonical migrations;
it was not derived from a Production write.

## Retained artifacts

The repository launcher retained the exact combined child stream before
reporting. The two complete capture files were then materialised outside Git by
removing only the combined `repeatCapture` envelope and applying the two exact
repository-reported capture timestamps. Every deterministic field is identical.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19/capture-1.json` | 19,324 | `2b5e87d52f0a6f765ea5928121bc96a9490012fc29b29b367bdd600617211491` |
| `ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19/capture-2.json` | 19,324 | `af608bde5900881d7747869ecec1ffd8c50140ded319f6eadccd4735361066b7` |
| `ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19/child-stdout.bin` | 19,580 | `69e395107f3f01d64ea9fba426d0720c3b3d309abcf7444b44845933a4347903` |
| `ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19/child-stderr.bin` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `ADR0024/CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19/operation-boundary.json` | 1,342 | `14d20541d8adfcfbfe3f9267bd771e425bf1779d5edd17067abf2414260cf967` |

Raw Production evidence remains outside Git.

## Pilot-stage Production-owner approval

The R19 authorisation names Patrick McKenna as operator and final accountable
Production owner and conditionally authorises activation only after both
captures, deterministic comparison, ledger verification, and schema verification
succeed. Those conditions were satisfied. The repository records the resulting
Production-owner approval at `2026-08-17T17:26:47.280Z` for the exact scope:

`ADR-0024 single-incident Production lineage evidence and attestation activation`

Patrick McKenna accepts these required acknowledgements:

- Historical SQL remains unknown.
- Existing Production migration records remain untouched.
- Schema equivalence is operational evidence only.
- No Production migration has been applied.
- Production migration execution remains separately approved.
- Preview lineage was repaired independently and receives no Production exception.

No AI system is recorded as a human reviewer or approver. Later qualified-human
review remains required before the first 10 pilot installers are onboarded or
when another engineer or qualified external database reviewer joins, whichever
occurs first.

## Activation and guarded Production status

Attestation v5 was activated and validated with review/activation timestamp
`2026-08-17T17:26:47.280Z` and expiry
`2026-10-25T17:26:47.280Z`. The guarded read-only Production status then
returned:

| Field | Result |
| --- | --- |
| `finalDecision` | `verified-pending-blocked` |
| Repository exit | `20` |
| `deploymentAllowed` | `false` |
| `migrationApplied` | `false` |
| Pending migration | `20260724180000_password_reset_foundation` |
| Schema fingerprint result | `verified` |
| Attested discrepancy | `verified` |
| Seven ordinary tuples | all `verified` |
| Pilot-auth historical state | `verified` |

The status timestamp was `2026-08-17T17:29:46.954Z`. Exit `20` is the required
fail-closed deployment boundary and is not authorisation to execute the pending
migration.

## Safety outcome

The evidence operation performed reads only. It executed no DDL, DML, migration,
seed, deployment, alias movement, or Production application release. The
password-reset migration remains pending and requires separate authorisation.

## Post-R4 historical addendum

This document preserves the exact R19 result. A later separately authorised R4
password-reset reconciliation reported migration success but failed strict
postflight. Repository-only investigation then proved that R19's disposable
`685ee5...` rehearsal value was not valid Production post-migration evidence.
Attestation v6 is now retired with the Production post fingerprint unset. R19's
captures, pre-migration facts and approval remain immutable historical evidence;
they do not prove the post-R4 Production schema. See the
[R4 fingerprint investigation](PR_45_ADR_0024_R4_POST_MIGRATION_SCHEMA_FINGERPRINT_INVESTIGATION.md).
