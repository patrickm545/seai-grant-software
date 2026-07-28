# PR #44 ADR-0024 Evidence-Capture Tooling Preparation

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-EVIDENCE-CAPTURE-PREPARATION-2026-07-28 |
| Status | Draft; tooling prepared, live evidence and activation separately pending |
| Owner | Clada Systems Engineering |
| Review cycle | Before the separate Production evidence operation |
| Repository baseline | `e4bde0c21f1e8135a82761ad4ea08d1c89a658eb` |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [2026-07-25 Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |
| Last reviewed | 2026-07-28 |

## Scope And Current Decision

PR #44 prepares repository tooling for a later, separately approved read-only
Production evidence operation. It does not capture live evidence, activate the
attestation, execute a migration, resolve Preview or start password-reset
request-flow work.

The checked-in attestation remains `pending`. Unknown active-only fields remain
null or pending, including related record IDs, failed-log digest, Production
schema fingerprints, review date, active expiry and every approval value.
Pending validation continues to exit `21`.

Completion status for this PR:

**ADR-0024 Production evidence-capture tooling prepared; live evidence and
attestation activation remain separately pending.**

## Fixed Read-Only Command

The prepared interface is:

```text
pnpm db:lineage:capture-production-evidence
```

It accepts no arbitrary SQL and no caller-supplied manifest, attestation or
output path. It requires the exact Production environment, configured
fingerprint, computed connection fingerprint, connected database identity,
approved change ID, named operator, different named independent reviewer and
restore-point evidence reference.

Each invocation performs two independent reads. Every read uses fixed identity,
`_prisma_migrations` and catalog queries inside a `REPEATABLE READ`, read-only
transaction. The command terminates without emitting evidence if the
deterministic content differs between reads.

The command cannot call Prisma deploy or resolve and performs no DDL, DML,
migration lock, temporary-object creation, application-data write,
`_prisma_migrations` write, deployment or alias operation.

## Prepared Evidence Shape

Successful output is deterministic except for explicit capture timestamps and
contains:

- safe database fingerprint and connected-name comparison;
- repository revision, exact migration inventory and approved manifest hash;
- normalized migration rows with exact IDs and SHA-256 log digests;
- no raw migration log, connection string, credential or token;
- exact pending set and ADR-0024 pinned-record comparison;
- pre-password-reset schema fingerprint, named assertions, catalog counts and
  unsupported-object inventory;
- deterministic evidence digest; and
- matched repeated-capture result and both capture timestamps.

The command fails closed on malformed environment metadata, environment-only
fingerprint spoofing, wrong connected identity, ambiguous ledger records,
changed checksums, schema assertion failure, secrets or repeated-read drift.

## Evidence Retention Boundary

Command output is not automatically written to the repository, staged or
committed. The later operational PR owns evidence retention.

That later PR must:

1. run the fixed command twice under one approved change and controlled
   connection, even though each invocation already compares two internal reads;
2. compare the two command artifacts in full, including deterministic digest,
   normalized ledger, manifest hash, schema fingerprint and pending set;
3. stop and discard both artifacts if any deterministic field differs;
4. retain only reviewed, secret-free fields needed by the attestation and
   repository evidence record;
5. store any approved external raw evidence under the controlled change record,
   never in Git, and reference it by a stable change/evidence identifier plus a
   SHA-256 digest; and
6. document who reviewed the comparison, when it occurred and which exact
   artifacts were compared.

Raw logs must not be copied into the repository. If exact log bytes are needed
for review, they remain in the controlled external evidence store; only their
SHA-256 digest may enter repository evidence.

Evidence is stale and cannot support activation if the database identity,
ledger, catalog fingerprint, manifest, repository revision, restore point,
change record, operator/reviewer controls or deployment state changes between
capture, review and activation. A Production database replacement, history
re-baseline, recovered historical artifact, material schema/lineage change,
ADR supersession or disproven supporting evidence invalidates retained
evidence and requires a new capture.

## Repository And Disposable Validation

The tooling was exercised only with repository fixtures and disposable
PostgreSQL:

| Profile | Deterministic fingerprint |
| --- | --- |
| Fresh head, all 16 migrations | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` |
| Pre-reset, 15 migrations | `fbe0fae4569e466df55764a5d23926c22f03727d822c48e0f6566b08dbfde5ee` |
| Post-reset upgrade | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` |

Fresh and post-reset fingerprints match. The five named schema assertions pass
for their respective disposable profiles. These values are tooling evidence,
not Production evidence and not attestation activation evidence.

## Unchanged Operational State

- No Production query or evidence capture occurred in PR #44.
- Production schema, application data and `_prisma_migrations` are unchanged.
- No migration was applied and no Production alias was moved.
- The password-reset migration remains pending in Production.
- The historical ledger remains divergent and the original SQL remains unknown.
- Preview's checksum mismatch remains unresolved and receives no exception.
- Password-reset request-flow work remains paused.
- No dependency or lockfile change is part of PR #44.

The last verified live deployment remains
`dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`; PR #44 does not re-query or alter it.

## Required Follow-On Sequence

The sequence is fixed:

1. merge PR #44 only as evidence-capture tooling preparation;
2. open a separately approved operational PR titled **Capture ADR-0024
   Production Evidence and Activate Attestation** to perform live read-only
   capture, retain reviewed evidence, obtain all four genuine approvals and
   activate only if every lifecycle control passes;
3. open a different migration-execution PR with its own explicit approval to
   apply and verify the pending Production migration; and
4. resume password-reset request-flow work only after the execution PR proves
   the required live state.

PR #44 remains Draft and does not authorize any follow-on operation.
