# PR #45 ADR-0024 Operational Readiness Checklist

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-OPERATIONAL-READINESS-2026-07-28 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before every separately authorised ADR-0024 operation |
| Last reviewed | 2026-08-04 |
| Operational state | R1-R5 closed; final launcher boundary validated; not Production authority |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [2026-07-25 Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |
| Authoritative stop record | [PR #45 Production evidence operation](PR_45_ADR_0024_PRODUCTION_EVIDENCE_OPERATION.md) |
| Capture preparation | [PR #44 evidence-capture preparation](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md) |
| Governance | [PR #45 pilot-stage Production governance](PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md) |
| Final launcher reliability | [R5 handoff investigation and repair](PR_45_ADR_0024_WINDOWS_LAUNCHER_RELIABILITY_2026_08_04.md) |

## Purpose And Authority

Use this single checklist to resume PR #45 only after genuine operational
inputs become available. Blank cells are intentional and must be completed by
the authorised humans or from reviewed operational evidence. Do not infer,
guess or copy stale values into a blank.

The stopped change `CHG-2026-07-29-ADR0024-PROD-EVIDENCE` is closed historical
evidence. It stopped at the Stage 3 Capture 1 launcher on 2026-07-29 before the
fixed command launched, before a Production connection, and without an
artifact, status command, retry or mutation. It must not be entered below or
reused. A future attempt requires a new change ID, fresh recovery verification,
a reviewed Windows launcher fix, a clean worktree and explicit retry approval.

Completing this checklist does not authorise migration execution, deployment,
alias movement or password-reset request-flow work. The controlled stages are:

| Stage | Scope | Current state | Authority boundary |
| --- | --- | --- | --- |
| Repository preparation | Manifest, verifier, fixed capture command, tests and runbooks | Complete in PRs #43 and #44 | No Production access |
| Operational evidence and activation | Read-only Production capture, deterministic evidence review, approval and fixed attestation edit | PR #45 Draft; pending | Requires this completed checklist and approved read-only change |
| Production execution | Deliberate application of `20260724180000_password_reset_foundation` | Not started | Requires a different approved change after PR #45 |
| Application deployment | Build, postflight, deployment and alias promotion | Not started | Requires successful execution and separate release approval |

The only permitted successful lineage description after valid activation is:

> **Production lineage accepted under ADR-0024 attestation.**

The pending attestation now pins the canonical R4 database-only migration
timestamps `2026-04-23T07:04:10.39554Z` and
`2026-04-23T07:04:10.527739Z`. The closed R4 operation remains historical and
supplies no retry authority; any complete capture requires a new change ID and
fresh precondition verification.

## Change Control

Complete every field against the approved change record immediately before
Production access.

| Required field | Exact value |
| --- | --- |
| Change ID |  |
| Operation date |  |
| Repository SHA |  |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Current Production deployment | `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E` |
| Expected Production fingerprint | `db_4e1d3bd23cff6801` |

- [ ] Change ID explicitly authorises two read-only evidence-command
      invocations, evidence review and repository attestation activation.
- [ ] Change ID is new and is not
      `CHG-2026-07-29-ADR0024-PROD-EVIDENCE`.
- [ ] The repaired cross-platform launcher has been reviewed at the exact
      repository SHA.
- [ ] Worktree is clean immediately before the authorised attempt.
- [ ] Recovery and restore-point verification is fresh for the new attempt.
- [ ] Approval explicitly authorises retry after the recorded launcher stop.
- [ ] Change ID does not authorise Prisma deploy, SQL, migration execution,
      deployment or alias movement.
- [ ] Operation date and approved maintenance window are current.
- [ ] Repository SHA is the exact checked-out and reviewed PR #45 commit.
- [ ] Repository SHA is a descendant of the approved baseline
      `bd1fcc8eb8796c01bad2ab866e11abbb082f6389`.
- [ ] Branch and remote head resolve to the same SHA.
- [ ] Current Production deployment is rechecked immediately before capture.
- [ ] Expected fingerprint matches ADR-0024, the guarded connection metadata
      and the safe URL-derived fingerprint.
- [ ] Preview remains explicitly outside the change.

## Human Roles

Record genuine people and exact approval evidence. Sam, Codex, ChatGPT, OpenAI,
automation, AI systems and placeholder identities are prohibited as human
approvers. This operation selects `pilot-stage-compensating-control`; the
standard independent-human path remains unchanged.

| Required role | Human name | Status | Exact UTC timestamp | Evidence reference |
| --- | --- | --- | --- | --- |
| Chief Executive Officer | Patrick McKenna | Allocated; operation pending |  | Governance record |
| Production Operator | Patrick McKenna | Allocated; operation pending |  | Governance record |
| Recovery Owner | Patrick McKenna | Allocated; operation pending |  | Governance record |
| Final Accountable Approver / Production Owner | Patrick McKenna | Approval pending evidence |  |  |
| Independent Human Technical Reviewer | Unavailable during pilot stage | Exception documented |  | Governance record |
| Technical review method | AI-assisted CTO review | Method only; not a human approval |  | Deterministic evidence and repository controls |

Mode rules:

- [ ] Governance mode is exactly `pilot-stage-compensating-control`.
- [ ] Patrick McKenna is recorded exactly as CEO, Production Owner, Production
      Operator, Recovery Owner and final accountable approver.
- [ ] Independent human technical reviewer status is accurately recorded as
      unavailable; no invented reviewer is supplied.
- [ ] AI-assisted CTO review is recorded as a method and never as a human
      identity or approval.
- [ ] Patrick's sole human Production-owner approval is timestamped and linked
      to repository and operational evidence.
- [ ] The normal standard path still requires four approvals and retains both
      independence rules.
- [ ] Every approver accepts the exact scope
      `ADR-0024 single-incident Production lineage evidence and attestation activation`.
- [ ] Every approver records conditions explicitly, including an empty list
      where no additional condition exists.

Required acknowledgements for each attestation approver:

- [ ] Historical SQL remains unknown.
- [ ] Existing Production migration records remain untouched.
- [ ] Schema equivalence is operational evidence only.
- [ ] No Production migration has been applied.
- [ ] Production migration execution remains separately approved.
- [ ] Preview lineage was repaired independently and receives no Production
      exception.

The operational review must additionally acknowledge that the attestation is
restricted to this incident and exact Production identity, exit `20` is the
successful status-only result while the password-reset migration is pending,
and the Production alias must remain unchanged.

## Restore Safety

| Required field | Exact value |
| --- | --- |
| Restore point |  |
| Backup verification result |  |
| Restore-point UTC timestamp |  |
| Retention window |  |
| Evidence reference |  |
| Recovery owner |  |
| Escalation contact |  |

- [ ] Restore point belongs to the exact Production database.
- [ ] Restore point is inside the verified provider retention window.
- [ ] Backup or PITR capability is inspected in the provider control plane; no
      default retention assumption is used.
- [ ] Evidence reference is stable, access-controlled and contains no
      credential.
- [ ] Recovery owner confirms the restore point is current for the operation.
- [ ] Recovery owner acknowledges that no restore is part of PR #45.
- [ ] Provider recovery remains an incident-owner decision after a future
      execution failure, not an automatic response to this read-only operation.

## Production Identity

| Identity field | Required value |
| --- | --- |
| Environment | `production` |
| Vercel project | `seai-grant-software` |
| Vercel project ID | `prj_ZfAMVKj3uSTotQsPenzxXupJxQAX` |
| Expected database fingerprint | `db_4e1d3bd23cff6801` |
| Connected database name |  |
| Safe host identity |  |
| Effective port |  |
| Optional database branch ID |  |

Verification steps:

- [ ] `APP_ENV` is exactly `production`.
- [ ] `DATABASE_ENVIRONMENT` is exactly `production`.
- [ ] `DATABASE_URL` is loaded only into the controlled operator shell and is
      never echoed or stored in Git.
- [ ] `DATABASE_FINGERPRINT` is exactly `db_4e1d3bd23cff6801`.
- [ ] `PRODUCTION_DATABASE_FINGERPRINT` is exactly
      `db_4e1d3bd23cff6801`.
- [ ] The safe fingerprint recomputed from lower-cased host, effective port and
      decoded database name is exactly `db_4e1d3bd23cff6801`.
- [ ] The connected read-only identity query returns the database name parsed
      from the guarded URL.
- [ ] The target is proven not to be Preview, Development or test.
- [ ] The environment label is treated as classification evidence only, not
      database identity proof.
- [ ] Vercel project linkage, Git repository and Production environment match
      the approved change.
- [ ] Production alias resolves to
      `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`.
- [ ] Latest blocked deployment remains
      `dpl_4ToKLMEXKxVsPUvcX81p6BzQYb3v`.
- [ ] No migration, schema change, database maintenance or Production
      deployment is running.
- [ ] No alias promotion is running or queued.
- [ ] Fixed attestation status is still `pending`.
- [ ] Expected pending migration remains
      `20260724180000_password_reset_foundation`.

Stop before capture if any identity field is missing, stale, ambiguous or
different.

## Evidence Capture

The only permitted repository database command in this stage remains:

```text
pnpm db:lineage:capture-production-evidence
```

On Windows, invoke that exact fixed package script only through the reviewed
no-argument launcher:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

The launcher resolves the pinned package manager without a general shell and
does not accept a replacement command or caller arguments. Do not run this
entry point until a new change and every precondition above are approved.

Set the exact approved metadata without printing it:

```text
PRODUCTION_EVIDENCE_GOVERNANCE_MODE=pilot-stage-compensating-control
PRODUCTION_EVIDENCE_CHANGE_ID=<approved-change-id>
PRODUCTION_EVIDENCE_OPERATOR=Patrick McKenna
PRODUCTION_EVIDENCE_PILOT_ACCOUNTABILITY_ACKNOWLEDGEMENT=I acknowledge that no independent human technical reviewer is currently available and accept final accountability for this pilot-stage read-only evidence and attestation operation
PRODUCTION_RESTORE_POINT_REFERENCE=<exact-evidence-reference>
```

Do not set `PRODUCTION_EVIDENCE_REVIEWER` in pilot-stage mode. The command
rejects an invented or supplied independent reviewer. Standard mode continues
to require that variable and enforces a different person from the operator.

Do not run manual SQL, ad hoc `psql`, a database console, Prisma deploy,
`migrate resolve`, `db push`, reset, seed or arbitrary scripts.

### Capture 1

| Field | Value |
| --- | --- |
| External artifact reference |  |
| Artifact SHA-256 |  |
| First internal capture timestamp |  |
| Second internal capture timestamp |  |
| Deterministic evidence digest |  |
| Operator result |  |

- [ ] Command runs from the exact approved repository SHA.
- [ ] Guarded identity passes before a database connection is accepted.
- [ ] Each internal capture uses `RepeatableRead` and
      `SET TRANSACTION READ ONLY`.
- [ ] The command's two internal captures match.
- [ ] Complete secret-free JSON is stored outside Git under the change record.
- [ ] Raw migration logs are absent from command output and Git.

### Capture 2

Run the same fixed command again with the same repository SHA, change ID,
operator, governance mode, accountability acknowledgement, restore-point
reference, connection and verifier version.

| Field | Value |
| --- | --- |
| External artifact reference |  |
| Artifact SHA-256 |  |
| First internal capture timestamp |  |
| Second internal capture timestamp |  |
| Deterministic evidence digest |  |
| Operator result |  |

- [ ] The second command invocation completes without any intervening
      Production, repository, restore-point or deployment-state change.
- [ ] The command's two internal captures match.
- [ ] Complete secret-free JSON is stored outside Git under the change record.
- [ ] Raw migration logs are absent from command output and Git.

### Comparison

Capture timestamps may differ only because they are operational metadata
outside the deterministic digest. These fields must match exactly:

- [ ] Evidence version.
- [ ] Environment and database fingerprint.
- [ ] Connected database-name guard result.
- [ ] Repository revision.
- [ ] Verifier implementation version.
- [ ] Manifest version and manifest hash.
- [ ] Ordered 16-migration inventory: position, name and checksum.
- [ ] Governance mode, change ID, operator, null independent reviewer, exact
      accountability acknowledgement and restore-point reference.
- [ ] Total ledger record count.
- [ ] Every normalised record ID, migration name and checksum.
- [ ] Every started, finished and rolled-back timestamp.
- [ ] Every applied-step count.
- [ ] Every log-state classification and SHA-256 log digest.
- [ ] Pending migration set and applied repository count.
- [ ] ADR-0024 pinned evidence result.
- [ ] Schema fingerprint version and exact fingerprint.
- [ ] Named assertions version, profile and every assertion result.
- [ ] Catalog counts for namespaces, tables, columns, constraints, indexes,
      enums, extensions, triggers, sequences and unsupported objects.
- [ ] Unsupported-object inventory.
- [ ] Deterministic evidence digest.

Do not average, reconcile, edit or selectively retain differing artifacts. Any
material difference invalidates both artifacts and stops the operation.

## Evidence Review

Patrick McKenna completes this section as final accountable approver against
both external artifacts and the repository sources, supported by the
AI-assisted CTO review method. The retained artifacts, not an AI identity, are
the technical evidence.

### Ledger

- [ ] Complete normalised ledger reviewed row by row.
- [ ] Total ledger row count is identical in both captures.
- [ ] Every repository migration record is exact or the one approved
      password-reset migration is pending.
- [ ] Database-only record is exactly
      `20260423093000_application_pack_admin_fields`.
- [ ] Database-only record ID is exactly
      `2305f52e-af2f-4717-bc37-a6a88bc1ec33`.
- [ ] Database-only checksum, timestamps, applied-step count, rollback state
      and no-log state match ADR-0024.
- [ ] Failed related record has an exact UUID and the pinned
      `20260428120000_manual_submission_prep` metadata.
- [ ] Completed zero-step related record has a different exact UUID and the
      pinned metadata.
- [ ] Failed-log digest is lowercase SHA-256 of the exact UTF-8 log bytes.
- [ ] Raw failed log remains outside Git and is identified as the documented
      duplicate `Lead.internalNotes` failure.
- [ ] No additional database-only, repository-only, failed, unfinished,
      rolled-back, ambiguous or duplicate record exists.
- [ ] Pending set is exactly
      `20260724180000_password_reset_foundation`.

### Schema Fingerprint

- [ ] Profile is exactly `pre-password-reset`.
- [ ] Fingerprint version is
      `clada-postgres-schema-fingerprint/v2`.
- [ ] Exact Production pre-password-reset fingerprint matches both captures.
- [ ] `PasswordResetRequest` is absent.
- [ ] `Lead.internalNotes` is nullable `text`, has no default and has no
      dedicated index or constraint.
- [ ] `Lead.followUpDate` is nullable `timestamp without time zone`, has no
      default and has no dedicated index or constraint.
- [ ] `Lead.assignedAdmin` is nullable `text`, has no default and has no
      dedicated index or constraint.
- [ ] `Lead.assignedInstaller` is nullable `text`, has no default and has no
      dedicated index or constraint.
- [ ] All catalog counts match.
- [ ] Unsupported-object result contains no unreviewed object.
- [ ] Disposable fresh-head fingerprint remains
      `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649`.
- [ ] Disposable post-reset fingerprint remains
      `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649`.

### Manifest, Assertions And Digest

- [ ] Manifest version is `clada-migration-manifest/v1`.
- [ ] Manifest hash is
      `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872`.
- [ ] Immutable-history verification passes for all 16 migrations.
- [ ] Related repository checksum is
      `42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3`.
- [ ] Named assertions version is
      `adr-0024-catalog-assertions/v2`.
- [ ] Every named assertion passes in both captures.
- [ ] Evidence decision is exact and contains no additional discrepancy.
- [ ] External artifact hashes are recorded.
- [ ] Deterministic evidence digests match.
- [ ] Neither artifact contains a URL, credential, token, customer data or raw
      migration log.
- [ ] Only reviewed secret-free fields needed by the attestation and
      repository evidence record will enter Git.

### Pilot-Stage Accountable Review Record

| Required field | Value |
| --- | --- |
| Final accountable reviewer | Patrick McKenna |
| Review UTC timestamp |  |
| Capture 1 reference |  |
| Capture 2 reference |  |
| Comparison result |  |
| Review evidence reference |  |
| Comments or conditions |  |

## Attestation Activation

Edit only
`prisma/lineage-attestations/adr-0024-production.json`. Do not add another
attestation, accept a caller-supplied path or weaken validation.

Every item below must exist and be exact before changing `status` to `active`:

- [ ] Version `clada-adr-0024-lineage-attestation/v2`.
- [ ] Attestation ID `ADR-0024-PRODUCTION-2026-07-25`.
- [ ] Incident reference
      `ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT`.
- [ ] ADR reference `ADR-0024`.
- [ ] Owner `Clada Systems Engineering`.
- [ ] Exact UTC-millisecond `createdAt`, `reviewedAt` and `expiresAt`.
- [ ] Expiry is after creation, after review and no more than 90 days after
      creation.
- [ ] Reason is exact and non-placeholder.
- [ ] `historicalSqlKnown` remains `false`.
- [ ] All six exact retirement conditions remain present.
- [ ] Every repository and operational evidence reference exists and is
      indexed.
- [ ] Environment remains `production`.
- [ ] Approved database fingerprint remains `db_4e1d3bd23cff6801`.
- [ ] Historical evidence baseline remains the fixed approved
      `0ee3c67e8295ca8f988e5b60ec75b66c0f18741b`.
- [ ] Verifier implementation version remains
      `adr-0024-lineage-verifier/v1`.
- [ ] Manifest version and hash match the reviewed capture.
- [ ] Database-only migration contains its exact ID, name, checksum,
      timestamps, applied-step count, rollback state, log state and null digest.
- [ ] Related migration name and repository checksum remain exact.
- [ ] Failed related record contains its exact reviewed ID, pinned metadata,
      `sha256` state and failed-log digest.
- [ ] Completed zero-step record contains its exact reviewed ID, pinned
      metadata, `none` state and null log digest.
- [ ] Schema fingerprint version remains
      `clada-postgres-schema-fingerprint/v2`.
- [ ] Exact Production pre-migration fingerprint is present.
- [ ] Exact reviewed disposable post-migration fingerprint is present.
- [ ] Exact reviewed disposable fresh-head fingerprint is present.
- [ ] Named assertions version remains
      `adr-0024-catalog-assertions/v2`.
- [ ] Governance mode is exactly `pilot-stage-compensating-control`.
- [ ] Exactly one human approval object exists for `PRODUCTION_OWNER`, naming
      Patrick McKenna.
- [ ] The approval status is `approved` and has an exact approval timestamp,
      repository Markdown evidence reference, exact accepted scope, all six
      acknowledgements and explicit conditions.
- [ ] The approval timestamp is between creation and review.
- [ ] Both distinct external artifact references and artifact SHA-256 digests
      are recorded.
- [ ] Repository SHA, change ID, Production fingerprint, connected database
      name, operator, restore reference, deterministic evidence digest, schema
      fingerprint and named assertion version match between both captures.
- [ ] Activation timestamp equals the reviewed timestamp and expiry is no later
      than 90 days after creation.
- [ ] Later qualified human review is mandatory before the first 10 pilot
      installers or when another engineer or qualified external database
      reviewer joins, whichever occurs first.
- [ ] Every evidence reference is secret-free and exists.
- [ ] No wildcard, placeholder, alternate migration identity, optional
      acceptance value or unknown active field exists.
- [ ] Active attestation validator and all negative tests pass.
- [ ] Preview and every other database identity reject the attestation.

**Activation is prohibited if any field remains unknown.**

Activation accepts only this exact operational lineage. It does not reconstruct
history, apply a migration or authorise Production execution.

## Production Status Verification

Run this read-only verifier only after both external captures match, Patrick
McKenna signs the exact accountability acknowledgement, the sole human
Production-owner approval is genuine, the fixed attestation is active and all
local validation passes:

```text
pnpm db:status
```

The guarded status wrapper invokes the fixed `production-status` verifier and
emits the fail-closed command-boundary record.

Required result:

| Field | Exact expected value |
| --- | --- |
| Mode | `production-status` |
| Environment | `production` |
| Database fingerprint | `db_4e1d3bd23cff6801` |
| Attested discrepancy | `verified` |
| Related duplicate state | `verified` |
| Schema result | `verified` |
| Lifecycle | `active` |
| Pending migration | `20260724180000_password_reset_foundation` |
| Final decision | `verified-pending-blocked` |
| Exit code | `20` |
| Deployment allowed | `false` |
| Migration applied | `false` |

- [ ] Exit `20` is preserved and is not converted to exit `0`.
- [ ] No Prisma deploy runs.
- [ ] No migration lock is acquired.
- [ ] No schema, data or `_prisma_migrations` change occurs.
- [ ] Application build does not continue.
- [ ] No deployment is created or promoted.
- [ ] Production alias does not move.
- [ ] Status evidence is retained without secrets.

Any result other than exact exit `20` is a stop. Do not attempt migration
execution as a remedy.

## Final Safety Confirmation

- [ ] Attestation activation used only exact reviewed evidence.
- [ ] Production schema is unchanged by PR #45.
- [ ] Production data is unchanged by PR #45.
- [ ] `_prisma_migrations` is unchanged by PR #45.
- [ ] Password-reset migration remains pending.
- [ ] Current live deployment remains
      `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`.
- [ ] Production alias remains unchanged.
- [ ] Preview lineage remains repaired, strict, clean and outside the
      Production exception.
- [ ] Password-reset request-flow work remains paused.
- [ ] Incident remains open.
- [ ] No raw log, credential, token or connection URL entered Git, terminal
      evidence or PR text.
- [ ] The next migration-execution change remains separately approved and
      controlled.
