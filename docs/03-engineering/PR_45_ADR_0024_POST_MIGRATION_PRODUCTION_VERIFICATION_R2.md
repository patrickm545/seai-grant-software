# PR #45 ADR-0024 Post-Migration Production Verification R2

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-POST-MIGRATION-PRODUCTION-VERIFICATION-R2-2026-08-27 |
| Status | Complete; R2 permanently closed at the governance boundary |
| Owner | Patrick McKenna |
| Review cycle | Before attestation amendment or reactivation |
| Last reviewed | 2026-08-27 |

## Operation Boundary

| Field | Value |
| --- | --- |
| Change ID | `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2` |
| Approved repository revision | `6eb3ab4bf1763883443793dc46a7be30e8a2e6c0` |
| Operation purpose | `post-migration-production-verification` |
| Operation start | `2026-08-27T09:40:30.225Z` / `2026-08-27T10:40:30.225+01:00[Europe/Dublin]` |
| Child start | `2026-08-27T09:40:30.255Z` / `2026-08-27T10:40:30.255+01:00[Europe/Dublin]` |
| Child completion | `2026-08-27T09:40:39.713Z` / `2026-08-27T10:40:39.713+01:00[Europe/Dublin]` |
| Reporting completion | `2026-08-27T09:40:39.744Z` / `2026-08-27T10:40:39.744+01:00[Europe/Dublin]` |
| Repository exit | `0` |
| Wrapper exit | `0` |
| Reporting status | `complete` |

The credential-file selector was invoked exactly once. It resolved only the
fixed retained Node launcher, which in turn resolved only the purpose-built
post-migration capture script with fixed argv and `shell:false`. R2 is consumed
and permanently closed. It must not be retried or reused.

## Fresh Pre-Access Gates

Local, remote and PR heads all matched the approved revision. The worktree was
clean, PR #45 was open and Draft, GitHub Validate passed, and the exact-SHA
Vercel Preview was Ready. Its build log recorded strict Preview preflight and
postflight as `verified-clean`, with 16 applied migrations and zero pending.

The complete credential-free local gate passed before access:

- 132 focused post-migration, lineage, attestation, launcher, credential,
  retention and security tests;
- 578 full unit, platform and security tests;
- ESLint, TypeScript, Prisma validation and a non-deploying production build;
- manifest hash
  `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872`;
- immutable history for all 16 migrations;
- structurally valid retired attestation with expected exit `21`;
- Markdown baseline, internal links, metadata, JSON, secret scan and
  `git diff --check`;
- disposable PostgreSQL validation with all 16 canonical migrations, zero
  pending, and all 13 integration files passing.

Immediately before access, the Neon Console showed service status `All OK`,
project `seai-grant-db`, branch `main`, branch ID
`br-cool-wave-abysq3lu`, a six-hour recovery window, no restore in progress,
no maintenance indication, and the primary compute idle. The displayed
earliest restore time was `2026-08-27T04:36:00+01:00`.

Recovery reference:

`NEON-PITR-main-br-cool-wave-abysq3lu-6h-observed-2026-08-27T10:36:00+01:00`

Vercel's three live Production aliases remained on Ready deployment
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`. No queued, building or initializing
Production deployment, promotion or alias movement was observed.

The supplemental pre-access boundary was retained outside Git with SHA-256
`39815c11345cb5c8f6cb0942b660947c82284f06780a949d4eac7bf2d44c2b3c`.

## Production Identity And Read Boundary

| Field | Result |
| --- | --- |
| Environment | `production` |
| Connected database | `neondb` |
| Neon branch ID | `br-cool-wave-abysq3lu` |
| Database fingerprint | `db_4e1d3bd23cff6801` |
| Evidence version | `adr-0024-production-post-migration-evidence/v1` |
| Dual-capture version | `adr-0024-production-post-migration-dual-capture/v1` |

The fixed child opened two independent `RepeatableRead` transactions. Each
transaction executed `SET TRANSACTION READ ONLY` before the fixed identity,
migration-ledger and catalog reads. Both transactions completed. No DDL, DML,
migration command, seed, migration lock or caller-supplied SQL path was used.

## Migration Ledger

The normalized ledger contained 18 records. All 16 repository migrations were
applied and the pending set was empty. The one approved database-only historical
record, the related failed and completed zero-step records, all seven ordinary
checksum-divergence tuples, and the pilot-auth historical-resolved record
matched their exact independently pinned contracts. No unexpected database-only
record was present.

All seven ordinary tuples returned `verified`:

- `20260710120000_identity_organisation_foundation`;
- `20260710130000_users_roles_permissions_audit`;
- `20260710140000_workflow_foundation`;
- `20260718130000_tenant_provisioning_data_model`;
- `20260718150000_tenant_first_login_activation`;
- `20260720100000_tenant_operator_recovery`;
- `20260722190000_manual_lead_creation`.

The separate `20260716183000_pilot_installer_auth`
`attestedHistoricalResolvedMigration` returned `verified` for record
`69505647-7711-408c-853e-32579345d1b0`.

The final repository migration was exactly:

| Field | Value |
| --- | --- |
| Migration | `20260724180000_password_reset_foundation` |
| Record ID | `25b79ca5-b247-4738-9dfb-ada810e3a386` |
| Checksum | `cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7` |
| `startedAt` | `2026-08-26T10:25:56.022508Z` |
| `finishedAt` | `2026-08-26T10:25:56.536774Z` |
| `rolledBackAt` | `null` |
| `applied_steps_count` | `1` |
| Logs | `none`; digest `null` |
| Lifecycle | `exact-canonical-one-step-success` |

This is read-only evidence of the already completed R4 migration application.
R2 did not invoke the migration.

## Production Schema And Catalog

| Evidence | Result |
| --- | --- |
| Fingerprint contract | `clada-postgres-schema-fingerprint/v2` |
| Actual Production post-migration fingerprint | `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989` |
| Catalog descriptor digest | `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989` |
| Catalog counts | namespaces 1; tables 17; columns 258; constraints 51; indexes 98; enums 20; extensions 1; triggers 0; sequences 0 |
| Unsupported relations | `0` |
| Pilot-auth evolved-schema assertion digest | `25858c34fa4c2fcbb100d04d1484bb4792aadc2c2985be8a5a95342bb569f8fd` |

Both captures retained the complete normalized fingerprint-v2 descriptor set.
All post-password-reset assertions passed, including the exact public table,
16 column descriptors, the two enums and their values, primary and restrictive
User foreign-key constraints, the exact seven-index set, and the absence of
password-reset triggers or sequences. All four current Lead operational
assertions passed. All pilot-auth evolved-schema assertions passed.

The earlier disposable fingerprint `685ee5...` was not used as Production
truth. The value above was computed independently from each live read-only
Production descriptor payload.

## Dual Evidence And Retention

Both complete stable payloads matched exactly. The repository excluded only
the declared variable envelope fields: capture ordinal, logical reference,
capture timestamp and raw artifact hash.

| Field | Result |
| --- | --- |
| Capture 1 time | `2026-08-27T09:40:36.895Z` |
| Capture 2 time | `2026-08-27T09:40:39.660Z` |
| Deterministic comparison | `matched` |
| Deterministic evidence digest | `89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b` |

The write-first retention path preserved the exact child streams and child
completion before hashing, parsing or final reporting. Raw Production evidence
remains outside Git.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-1.json` | 213,526 | `f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866` |
| `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-2.json` | 213,526 | `a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44` |
| `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/child-stdout.bin` | 478,844 | `a8ecf71cceb19ceaf933ad58f8eb2e79f29296ebe46301aeb6c4e8d1f00055f8` |
| `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/child-stderr.bin` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/operation-boundary.json` | 1,758 | `d6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227` |

## Governance Boundary

Attestation v6 was `retired` before R2 and remains `retired` after R2.
`postMigrationFingerprint` and `postMigrationEvidence` remain `null`. The two
R19 captures and one R19 human approval remain retained and unchanged.

R2 did not create an approval, amend or activate the attestation, or reuse the
R19 approval. The guarded Production status command was not run because the
repository's Production status verifier requires an active attestation. No
control was bypassed. A new qualified-human approval is required before a
separate evidence-backed attestation amendment or reactivation.

## Safety Outcome

The Production credential was loaded only inside the fixed dotenv boundary.
The fixed child opened the Production connection and completed two read-only
transactions and their fixed reads. It performed no Production write, migration
invocation, manual SQL, `migrate resolve`, `db push`, seed, application
deployment, Production deployment, promotion or alias movement.

PR #45 remains Draft and was not merged. R19, password-reset R4 and
post-migration verification R1 remain unchanged historical evidence.

## Post-Capture Validation

The complete post-capture credential-free validation gate passed without
Production access. It passed 132 focused tests, 578 full unit/platform/security
tests, ESLint, TypeScript, Prisma schema validation, a production build without
deployment, manifest verification, immutable-history verification, Markdown
baseline and repository-hygiene checks, and the disposable PostgreSQL gate with
all 16 canonical migrations applied, zero pending, and all 13 integration files
passing. Retired-attestation validation returned its required exit `21`.
