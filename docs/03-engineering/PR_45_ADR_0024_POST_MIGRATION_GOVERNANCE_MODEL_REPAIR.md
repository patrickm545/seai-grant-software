# PR #45 ADR-0024 Post-Migration Governance Model Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-POST-MIGRATION-GOVERNANCE-MODEL-REPAIR-2026-08-31 |
| Status | Governance repair complete; qualified-human approval pending |
| Owner | Clada Systems Engineering |
| Review cycle | Before v7 qualified-human approval or activation |
| Last reviewed | 2026-08-31 |
| Authorised repository revision | `728a7ae7bcf5f0d660590acab13fe679d01cb739` |
| Authoritative evidence | `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2` |

## Scope And Result

This repository-only repair starts from authorised revision
`728a7ae7bcf5f0d660590acab13fe679d01cb739`. It adds an explicit v7
post-migration attestation lifecycle and a structurally signable approval
package for the retained R2 evidence. It does not add a reviewer, qualification,
approval, activation, Production access, migration, deployment or alias move.

The historical v6 artifact remains byte-for-byte unchanged, `retired`, and
authoritative for R19. Its raw SHA-256 is
`725cddb6ee9f263970ea5dff17da44a966904a97f071ee914872dab366189725`
(the committed repository blob, independent of checkout line-ending materialisation).

## Reproduced V6 Defect

The pre-repair validator path accepted a synthetic active v6 snapshot with one
R2 `postMigrationEvidence` object while both pilot captures and the sole human
approval remained bound to R19:

1. `validatePostMigrationSchemaEvidence` validated one independent provenance
   object and did not require the second R2 capture or deterministic digest.
2. `validatePilotStageGovernance` validated the two R19 captures and historical
   Production-owner approval without binding them to the post-migration object.
3. `validateApproval` required the historical scope and acknowledgement list,
   but no R2 change ID, fingerprint, capture hashes, deterministic digest,
   qualification or governance revision.
4. `validateLineageAttestation` invoked those checks independently, allowing
   the two evidence generations to cross-satisfy activation.

The historical acknowledgement also requires:

> No Production migration has been applied

That sentence remains meaningful for R19 but is false after the controlled R4
password-reset migration. It is not valid v7 approval text.

## Explicit V7 Lifecycle

The new fixed artifact is
`prisma/lineage-attestations/adr-0024-production-post-migration-v7.json`.
Its version is `clada-adr-0024-post-migration-attestation/v7` and its initial
state is `pending-approval`.

The supported transition is:

`retired v6 -> v7 pending-approval -> v7 active`

The first transition requires the exact retired v6 raw and canonical hashes.
The second requires the complete R2 evidence bundle and one new independent
qualified-human approval. Merely changing `status`, retaining R19 approval, or
adding post-migration evidence cannot activate v7.

`reviewedAt`, `activatedAt` and the new approval's `approvedAt` must be one exact
timestamp after evidence completion. `expiresAt` must be later and no more than
90 days after activation. This explicit human approval starts the new review
window; the repository never derives or extends it automatically.

## Atomic R2 Evidence Bundle

V7 requires all of the following as one exact object:

- change ID
  `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2`;
- evidence version `adr-0024-production-post-migration-evidence/v1`;
- Production fingerprint
  `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989`;
- capture 1 SHA-256
  `f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866`;
- capture 2 SHA-256
  `a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44`;
- deterministic digest
  `89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b`;
- operation-boundary SHA-256
  `d6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227`;
- evidence repository revision
  `6eb3ab4bf1763883443793dc46a7be30e8a2e6c0`;
- manifest hash
  `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872`;
- 16 repository migrations, 16 applied and zero pending;
- the exact successful password-reset ledger record;
- all seven ordinary historical tuples verified;
- pilot-auth historical resolution verified; and
- post-migration catalog assertions verified with zero unsupported relations.

R19 capture values remain in v6 only. Candidate construction fails closed for
one R2 capture, mixed R2/R19 captures, two R19 captures, or any substituted
identity, hash, digest, version or repository revision.

## Qualified-Human Approval Model

V7 requires one `DATABASE_RELIABILITY_REVIEWER`. The reviewer must differ from
Production Owner Patrick McKenna. The approval must contain:

- a real non-placeholder, non-AI human name;
- the exact reviewer role and an affirmative independence declaration;
- a specific PostgreSQL migration and database-reliability experience
  declaration;
- affirmative database-migration, PostgreSQL-reliability and ADR-0024 evidence
  review declarations;
- a repository Markdown qualification-evidence reference;
- a separate indexed repository Markdown approval-evidence reference;
- a qualification acknowledgement timestamp after R2 evidence completion;
- an approval timestamp after R2 evidence completion;
- the exact R2 change ID, fingerprint, two capture hashes, deterministic digest,
  evidence repository revision, v7 version, acknowledgement version and exact
  Git governance revision being approved; and
- explicit acceptance of every versioned acknowledgement statement.

Patrick McKenna's title alone is not technical qualification evidence. The
validator rejects self-review, placeholders, AI systems, missing qualification,
approval replay, another governance revision, unindexed evidence, or an expired
lifecycle.

## Versioned Truthful Acknowledgement

`clada-adr-0024-post-migration-acknowledgement/v1` states exactly that:

1. R4 applied `20260724180000_password_reset_foundation` through the controlled
   reconciliation.
2. R2 verified 16 of 16 migrations applied and zero pending.
3. The approved post-migration fingerprint is the exact R2 fingerprint.
4. Both R2 read-only captures matched deterministically.
5. Seven ordinary tuples and pilot-auth historical resolution remain verified.
6. No manual SQL or `prisma migrate resolve` was used for reconciliation.
7. No Production application deployment formed part of R4 or R2.
8. The later qualified-human review trigger remains in force.

The historical acknowledgement is preserved only in retired v6. Missing,
historical, downgraded or modified v7 text is rejected.

## Signable Package And Human Boundary

The signable template is
`docs/03-engineering/evidence/ADR_0024_POST_MIGRATION_APPROVAL_PACKAGE_V7.json`.
It embeds the exact R2 values and the pending v7 approval structure. Its human
name, qualification, qualification evidence, independence acceptance,
approval evidence, governance revision, acknowledgement acceptance and
`approvedAt` fields remain empty.

The next human action is for an independent qualified Database Reliability
Reviewer to complete those fields in a repository change, review the exact R2
bundle and v7 acknowledgement, and run all validation. Only that later genuine
approval may move v7 to `active`.

## Validation And Security Coverage

The focused suite contains 42 tests covering the required negative cases,
source-artifact substitution, governance-revision replay, evidence indexing,
AI reviewer identities and one fully bound synthetic positive fixture. The
ordinary lineage tuples, pilot-auth historical state, migration SQL, immutable
manifest, R2 artifacts and fingerprint algorithm are unchanged.

`db:attestation:verify` now validates retired v6, the raw v6 hash, pending v7
and the signable package together. Pending v7 intentionally returns the
existing inactive exit `21`.

No Production credential was loaded. No Production connection, query, status,
write, migration, deployment or alias movement occurred during this repair.
