# ADR-0024 Post-Migration Qualified-Human Reviewer Pack

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-POST-MIGRATION-QUALIFIED-HUMAN-REVIEWER-PACK-2026-09-03 |
| Status | Ready for independent review; no approval recorded |
| Owner | Clada Systems Engineering |
| Intended reviewer | Independent software engineer acting as `DATABASE_RELIABILITY_REVIEWER` |
| Review cycle | Once for the v7 approval of the exact R2 evidence package |
| Last reviewed | 2026-09-03 |
| Repository revision to review | `9507ab126a4329a16c145db4e393d796dee50bbb` |
| Evidence operation | `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2` |

## 1. Review Request

Clada Systems is asking you to perform an independent technical review of
evidence collected after a controlled Production database migration. You are
not being asked to trust a summary alone: please inspect the small evidence set
listed below and decide whether it is internally consistent and sufficient for
you to approve.

ADR-0024 is Clada's fail-closed control for a historical Prisma migration-lineage
incident. It requires exact database identity, migration-ledger and schema
evidence before a release can proceed. The historical evidence remains
preserved. This review concerns the later post-migration state only.

The Production Owner is Patrick McKenna. The required reviewer role is
`DATABASE_RELIABILITY_REVIEWER`. You must be a different human from Patrick,
must make your own assessment, and must have relevant experience in database
migrations, PostgreSQL reliability, or equivalent backend/database operations.
Do not approve if the evidence is unclear or insufficient.

## 2. What Happened

The repository migration
`20260724180000_password_reset_foundation` was applied through the controlled
Production reconciliation. A later authorised operation, R2, opened two
independent read-only transactions and captured the Production identity,
migration ledger and catalog. Both captures completed and matched
deterministically.

R2 found all 16 repository migrations applied, none pending, and the expected
post-migration schema. The repository subsequently added v7 governance so this
R2 evidence cannot be combined with older R19 captures or approval. V7 is still
`pending-approval`; no reviewer has been inserted and nothing has been
activated.

## 3. Evidence Summary

### Evidence identity

| Item | Governed value |
| --- | --- |
| R2 change ID | `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2` |
| Evidence version | `adr-0024-production-post-migration-evidence/v1` |
| Production fingerprint | `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989` |
| Capture 1 SHA-256 | `f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866` |
| Capture 2 SHA-256 | `a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44` |
| Deterministic evidence digest | `89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b` |
| Operation-boundary SHA-256 | `d6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227` |
| Repository migration state | 16 repository migrations; 16 applied; 0 pending |
| Historical lineage | Seven checksum tuples verified; pilot-auth historical resolved state verified |
| Unsupported relations | 0 |

### Password-reset migration

| Item | Governed value |
| --- | --- |
| Migration | `20260724180000_password_reset_foundation` |
| Canonical checksum | `cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7` |
| Production record ID | `25b79ca5-b247-4738-9dfb-ada810e3a386` |
| Started | `2026-08-26T10:25:56.022508Z` |
| Finished | `2026-08-26T10:25:56.536774Z` |
| Rolled back | `null` |
| Applied steps | 1 |
| Error logs | None |

### Schema summary

Both read-only captures produced the same Production post-migration fingerprint:

`22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989`

The captured catalog contained 1 namespace, 17 tables, 258 columns, 51
constraints, 98 indexes, 20 enums, 1 extension, 0 triggers, 0 sequences and 0
unsupported relations.

The repository verifier confirmed that `PasswordResetRequest` exists with all
16 expected columns, both password-reset enums, the exact seven-index set, its
primary key and the restrictive `User` foreign key. Existing `Lead` assertions
and the evolved pilot-auth schema assertions also passed. You may recalculate
the fingerprint if you wish, but this review does not require a manual
reimplementation of the repository's deterministic fingerprint algorithm.

## 4. What You Should Review

Please inspect enough of the referenced evidence to decide whether you are
comfortable confirming that:

- the password-reset migration was applied exactly once;
- its Production checksum matches the canonical repository migration;
- its lifecycle is a normal success: started, finished, one applied step, no
  rollback and no error logs;
- all 16 repository migrations are applied and zero are pending;
- both independent read-only captures match deterministically;
- the Production schema fingerprint is the value stated above;
- the password-reset schema objects appear complete and correct;
- the seven historical tuples and pilot-auth historical state remain verified;
- no manual SQL, `prisma migrate resolve` or `prisma db push` was used; and
- the complete package is internally consistent enough for you to approve.

If a raw capture does not match its stated SHA-256, or any fact is uncertain,
do not approve and describe the discrepancy.

### What you are not responsible for

You are not being asked to access Production, run SQL, deploy software, modify
the database, operate Neon or Vercel, certify business or legal compliance,
guarantee the software has no bugs, or assume responsibility for Clada Systems
operations. Your role is limited to an independent technical evidence review.

## 5. Qualification And Independence Declaration

Complete these fields in your own words. Do not use a pre-filled identity or
qualification claim.

Reviewer full name: [blank]

Reviewer role/title: [blank]

Company/organisation, if applicable: [blank/optional]

Relevant technical experience: [blank]

Database/PostgreSQL/migration/reliability experience: [blank]

Qualification evidence/reference: [blank]

Independence declaration:

> I confirm that I am not the Production Owner for Clada Systems and that I am
> performing this review independently.

Independence confirmation: [blank]

Qualification acknowledged timestamp in UTC: [blank]

The qualification evidence/reference ultimately retained by the repository
must point to a Markdown record containing your genuine declaration. Patrick's
title or statement cannot establish your qualification on your behalf.

## 6. Exact Approval Acknowledgement

Acknowledgement version:
`clada-adr-0024-post-migration-acknowledgement/v1`

If you approve, you must accept every statement below exactly as written:

```text
The controlled Production reconciliation applied 20260724180000_password_reset_foundation.
Post-migration R2 evidence verified 16 of 16 repository migrations applied and zero pending.
The approved Production post-migration schema fingerprint is 22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989.
Both R2 read-only Production captures matched deterministically.
All seven ordinary historical checksum-divergence tuples and the pilot-auth historical resolved migration remain verified.
No manual SQL or prisma migrate resolve was used for the Production reconciliation.
No Production application deployment was performed as part of the database reconciliation or R2 evidence operation.
Later qualified-human review remains required before the first 10 pilot installers or when another engineer or qualified external database reviewer joins, whichever occurs first.
```

Approval decision:

- [ ] APPROVE
- [ ] DO NOT APPROVE / MORE INFORMATION REQUIRED

Reviewer name: [blank]

Approved repository revision:
`9507ab126a4329a16c145db4e393d796dee50bbb`

Approval timestamp in UTC: [blank]

Exact acknowledgement accepted: [blank]

Signature or typed confirmation: [blank]

The repository defines no additional signature format. A genuine typed
confirmation is acceptable evidence when its author and timestamp are retained
authentically. Returning this document does not itself activate v7; the exact
response must still be recorded and pass repository validation.

## 7. How To Respond

If you approve, return:

- your full name and role/title;
- a short relevant qualification summary;
- a qualification evidence/reference;
- the exact independence confirmation above;
- confirmation that you accept every exact v1 acknowledgement statement;
- the decision `APPROVE`;
- an approval timestamp in UTC;
- a signature or typed confirmation; and
- confirmation that you reviewed repository revision
  `9507ab126a4329a16c145db4e393d796dee50bbb`.

If you are not satisfied, choose `DO NOT APPROVE / MORE INFORMATION REQUIRED`
and state what concerns you, what evidence is missing, and what you want
clarified. Declining approval is an acceptable and safe outcome.

## 8. Evidence References

The minimal repository set is:

- [V7 signable approval package](evidence/ADR_0024_POST_MIGRATION_APPROVAL_PACKAGE_V7.json)
- [R2 Production verification record](PR_45_ADR_0024_POST_MIGRATION_PRODUCTION_VERIFICATION_R2.md)
- [Post-migration governance model repair](PR_45_ADR_0024_POST_MIGRATION_GOVERNANCE_MODEL_REPAIR.md)
- [ADR-0024 decision summary](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md)
- [V7 pending attestation template](../../prisma/lineage-attestations/adr-0024-production-post-migration-v7.json)

The two raw Production captures and operation-boundary artifact remain outside
Git. Patrick must provide them separately using these logical references:

- `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-1.json`
- `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/capture-2.json`
- `ADR0024/CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2/operation-boundary.json`

Before relying on those files, compare their raw SHA-256 values with the three
governed hashes in the evidence summary. They must be shared through an
appropriate private channel and must not be copied into Git or a public PR.
