# PR #45 ADR-0024 Post-Migration Governance Review

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-POST-MIGRATION-GOVERNANCE-REVIEW-2026-08-31 |
| Status | Governance defect found; attestation remains retired |
| Owner | Clada Systems Engineering |
| Review cycle | Before post-migration attestation amendment or reactivation |
| Last reviewed | 2026-08-31 |
| Authorised repository revision | `481ff87f2b1fdcae28cf65ca0d8b92a21cc83df8` |
| Authoritative evidence | `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2` |

## Scope And Outcome

This was a repository-only governance review. It did not load a Production
credential, connect to or query Production, run status, run a migration, issue
SQL, deploy, promote or move an alias.

The retained R2 evidence verifies exactly. No new qualified-human approval is
present. The current v6 attestation implementation cannot safely express or
enforce the required post-migration approval transition. It permits an active
snapshot containing the old R19 approval and R19 captures after only one R2
artifact is added. It also lacks a technical-qualification declaration and
uses an approval acknowledgement that is false after password reset was
applied.

The operation therefore stops fail closed with:

`Governance defect found — repository repair required first.`

The attestation was not amended or activated.

## Repository And Remote Baseline

The local branch, remote branch and PR #45 head all matched
`481ff87f2b1fdcae28cf65ca0d8b92a21cc83df8`. The worktree was clean and PR #45
was open and Draft. GitHub Validate passed. The exact-SHA Vercel Preview was
Ready, and its strict preflight and postflight both returned `verified-clean`
with 16 migrations applied and zero pending.

## Mechanical R2 Evidence Verification

The repository's own post-migration evidence validators parsed both retained
captures, recomputed their canonical deterministic digests and schema
descriptor digests, and compared both stable payloads. Every required retained
artifact was rehashed from raw bytes. No secret-like credential pattern was
found.

| Evidence | Verified value |
| --- | --- |
| Evidence version | `adr-0024-production-post-migration-evidence/v1` |
| Environment | `production` |
| Database | `neondb` |
| Branch | `br-cool-wave-abysq3lu` |
| Database fingerprint | `db_4e1d3bd23cff6801` |
| Repository revision captured | `6eb3ab4bf1763883443793dc46a7be30e8a2e6c0` |
| Manifest hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` |
| Repository migrations | 16 |
| Applied | 16 |
| Pending | 0 |
| Normalised ledger rows | 18 |
| Deterministic comparison | `matched` |
| Deterministic evidence digest | `89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b` |

The seven ordinary checksum-divergence tuples returned `verified`. The separate
pilot-auth `attestedHistoricalResolvedMigration` returned `verified`. No
unexpected database-only record was present.

The password-reset record remained exact:

| Field | Value |
| --- | --- |
| Migration | `20260724180000_password_reset_foundation` |
| Record ID | `25b79ca5-b247-4738-9dfb-ada810e3a386` |
| Checksum | `cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7` |
| Started | `2026-08-26T10:25:56.022508Z` |
| Finished | `2026-08-26T10:25:56.536774Z` |
| Rolled back | `null` |
| Applied steps | 1 |
| Logs | `none`; digest `null` |

## Artifact Verification

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `capture-1.json` | 213,526 | `f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866` |
| `capture-2.json` | 213,526 | `a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44` |
| `operation-boundary-start.json` | 452 | `4bd1b15296eb8cb8609ef4aa0ac4b995a9a9804e430c80bbed47064773334c29` |
| `operation-boundary-child-start.json` | 638 | `179b4272a8d4cde10e7296b9b62a0646559f35915935762016e80140916fd868` |
| `operation-boundary-child-complete.json` | 964 | `e6b9f2af66ccb57187b1e5b1f7ef8b0b1f0632f104ce1b297e31182b53e0c213` |
| `operation-boundary.json` | 1,758 | `d6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227` |
| `child-stdout.bin` | 478,844 | `a8ecf71cceb19ceaf933ad58f8eb2e79f29296ebe46301aeb6c4e8d1f00055f8` |
| `child-stderr.bin` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The artifacts remain outside Git under the stable R2 logical namespace.

## Actual Post-Migration Schema

| Evidence | Result |
| --- | --- |
| Fingerprint contract | `clada-postgres-schema-fingerprint/v2` |
| Production fingerprint | `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989` |
| Descriptor digest | `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989` |
| Catalog counts | 1 namespace; 17 tables; 258 columns; 51 constraints; 98 indexes; 20 enums; 1 extension; 0 triggers; 0 sequences |
| Unsupported relations | 0 |
| Post-password-reset assertions | All passed |
| Lead assertions | All passed |
| Pilot-auth assertions | All passed |

## Current Governance State

Before and after this review, attestation v6 is `retired`.
`postMigrationFingerprint` and `postMigrationEvidence` remain `null`. Its two
R19 captures and one R19 Production-owner approval remain retained and
unchanged. No new reviewer, approval timestamp, qualification declaration,
evidence reference or activation value was supplied.

## Implemented Lifecycle Analysis

The current implementation recognises only snapshot statuses `pending`,
`active`, `withdrawn` and `retired` for the single fixed v6 attestation. It
does not implement a separate amendment or replacement revision transition.
An active snapshot requires review and expiry timestamps, an expiry no more
than 90 days after `createdAt`, and complete schema fingerprint fields.

Standard governance requires four exact approval roles: CTO, Database
Reliability Reviewer, Security Reviewer and Production Owner. The Database
Reliability Reviewer must differ from the Production Owner. Each approval must
name a non-placeholder human, use an indexed repository Markdown evidence
reference, accept the fixed scope and acknowledgements, and fall between the
attestation creation and review timestamps.

Pilot-stage governance instead requires Patrick McKenna as the sole human
Production-owner approval, exact compensating controls, two matching captures,
and `activatedAt` equal to `reviewedAt`. It explicitly records the independent
human technical reviewer as unavailable. It does not define a technical
qualification declaration or qualification-evidence field for a new
post-migration reviewer.

Consequently, the repository contains no exact implemented rule by which a
person can now be classified as the required post-migration qualified human.
Patrick McKenna's CEO or Production-owner title cannot be treated as technical
qualification evidence.

## Reproduced Governance Defect

A repository-only synthetic snapshot cloned the checked-in retired v6
attestation, set `status=active`, populated the R2 fingerprint and only the
capture-1 post-migration provenance tuple, and indexed that one reference. It
left both pilot captures on R19 and retained the R19 approval dated
`2026-08-17T17:26:47.280Z`, before R2 was captured.

`validateLineageAttestation(..., { requireActive: true })` accepted that
snapshot. No Production credential or connection was involved.

This proves the following missing invariants:

1. the active snapshot does not require both R2 capture references and hashes;
2. it does not bind the deterministic R2 digest;
3. it does not require the approval to post-date or specifically approve R2;
4. it does not require technical qualification evidence; and
5. it does not distinguish the retired v6 lifecycle from a new revision.

The existing mandatory approval acknowledgements also include:

> No Production migration has been applied

That statement was true for R19 but is false after the canonical password-reset
migration completed. Reusing it for a new post-migration approval would be an
untruthful governance record.

## Non-Signable Evidence Package

The exact evidence requiring future approval is fully prepared in
[`ADR_0024_POST_MIGRATION_GOVERNANCE_REVIEW.json`](evidence/ADR_0024_POST_MIGRATION_GOVERNANCE_REVIEW.json).
It binds the R2 identity, both capture hashes, deterministic digest, exact
password-reset lifecycle, 16-applied/zero-pending result and Production schema
fingerprint. Its raw SHA-256 is
`52400e4606af52707d902974ccca85cf68fc6718d2b0fa50aa737c663fa266c0`.

It is deliberately marked `not-signable-until-governance-repair`. There is no
authoritative exact post-migration acknowledgement text or qualification
declaration to present to a reviewer today. Inventing either would weaken the
control.

Before a reviewer can sign, a separately reviewed repository repair must:

1. define the supported versioned transition from retired v6;
2. bind both R2 artifacts and the deterministic digest;
3. define the human qualification category, declaration, evidence and
   independence rules;
4. require a genuinely new approval timestamp after R2;
5. replace the obsolete migration acknowledgement with exact truthful text;
6. define review, activation and no-more-than-90-day expiry semantics; and
7. add fail-closed tests for every R2 evidence and approval mismatch.

## Approval Gate

No new approval was supplied by the repository or the user. No reviewer
identity or qualification is recorded. The R19 approval is historical evidence
only and must not satisfy R2. AI, Codex, ChatGPT and OpenAI are not human
approvers.

The exact existing pilot accountability acknowledgement remains historical:

> I acknowledge that no independent human technical reviewer is currently
> available and accept final accountability for this pilot-stage read-only
> evidence and attestation operation.

It is not a technical qualification declaration and does not repair the
post-migration approval defect.

## Safety Boundary

This review made no Production access and no attestation change. Production
status remains prohibited while the attestation is retired. Any later guarded
status check requires separate authority after a valid active governance state
exists.
