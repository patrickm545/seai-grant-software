# ADR-0024: Migration History Repair for Permanently Missing Applied Migrations

| Field | Value |
| --- | --- |
| Document ID | ADR-0024 |
| Status | Accepted; implementation and Production execution require separate approval |
| Owner | Clada Systems Engineering |
| Review cycle | Before each migration-history repair and after any Prisma migration-tooling change |
| Last reviewed | 2026-07-26 |

## Context

Production contains the completed migration
`20260423093000_application_pack_admin_fields`, but its migration directory and
checksum-identical SQL are unavailable. An exhaustive read-only investigation
could not recover the artifact or prove the applying process. Production's
current schema contains four associated `Lead` columns and the repository can
reproduce the intended schema through
`20260428120000_manual_submission_prep`, but schema equivalence is not evidence
of historical SQL identity.

The post-merge PR #41 Production deployment was correctly blocked. Production
remains on the previous Ready deployment and
`20260724180000_password_reset_foundation` remains pending.

Prisma 5.22.0 is the repository version. Prisma documents the migrations folder
as the source of truth and advises against editing or deleting applied
migrations. It also documents that `migrate status` reports divergent histories
while `migrate deploy` applies pending migrations without detecting drift and
does not warn when an already-applied migration is missing locally. Therefore,
ordinary Prisma deploy cannot replace Clada's independent release gate.

See:

- [Production migration incident](../03-engineering/INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md)
- [Prisma migration histories](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories)
- [Prisma development and production behavior](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)

## Decision

Clada Systems will use **controlled migration-history reconciliation through a
pinned lineage attestation and an attestation-aware migration gate**.

The repair is prospective repository governance. It does not recreate the lost
SQL and does not mutate the existing Production migration record.

### Authoritative histories

For fresh and disposable databases, the complete committed
`prisma/migrations` directory remains the executable source of truth. Every
repository migration must apply in order and produce the intended Prisma
schema.

For an existing database with a permanently missing applied migration, the
repository may additionally contain a reviewed lineage attestation. The
attestation records an acknowledged historical exception; it is not executable
SQL and is not a migration.

### Required lineage attestation

A future implementation PR must define a machine-readable, review-owned
attestation containing at least:

- exact approved database fingerprint and environment;
- migration name, Production record ID and checksum;
- `started_at`, `finished_at`, `applied_steps_count` and rollback state;
- related failed or zero-step migration records required to interpret lineage;
- repository baseline SHA and repository migration inventory hash;
- versioned schema fingerprint and catalog assertions;
- incident, ADR, approval and change-record references;
- date, named operator, independent reviewer and expiry/review policy; and
- an explicit statement that the historical SQL is unknown.

The attestation must contain no credential, connection URL, customer data or
fabricated SQL.

### Attestation-aware gate

A separately approved code PR must replace reliance on raw Prisma status output
with an independent inventory verifier for this path. The verifier must:

1. establish the exact database identity before connecting;
2. read migration metadata and catalog state without mutation;
3. validate every repository migration name and checksum;
4. permit only the exact attested database-only record on the exact approved
   Production fingerprint;
5. validate the attested record's full immutable metadata, not only its name;
6. validate the related `20260428120000_manual_submission_prep` ledger state;
7. prove the versioned Production schema fingerprint and named catalog
   assertions;
8. reject every additional, changed, failed, unfinished or ambiguous record;
9. reject the attestation in Preview, Development, test and every other
   database identity;
10. distinguish status-only builds from deliberate migration execution;
11. keep status-only Production builds blocked while repository migrations are
    pending; and
12. produce secret-free evidence suitable for the change record.

The ordinary Production migration command may call `prisma migrate deploy`
only after that verifier passes and the existing Production acknowledgement
and change-ID controls pass. It must run the verifier again afterward. The
post-check accepts the exact attested lineage plus all expected repository
migrations; raw Prisma's divergent status is not treated as proof of failure or
success by itself.

### Evidence threshold

Before reconciliation can be executed, two reviewers must approve evidence
that:

- the target is the intended Production database;
- the migration metadata exactly matches the incident record;
- the complete supported schema, relevant unsupported database objects and
  required runtime columns match the approved target;
- the committed migration history produces an equivalent schema from an empty
  disposable database;
- an upgrade test from the repository baseline reaches the same target;
- no unexpected data-shape, default, nullability, index, constraint, trigger,
  extension or enum difference remains;
- the pending set contains only migrations explicitly approved for the release;
- the previous Ready application is compatible until the forward migration
  succeeds; and
- a current restore point and rollback decision owner exist.

Schema equivalence proves operational compatibility. It never proves what the
lost SQL contained.

### `prisma migrate resolve`

`prisma migrate resolve` is not part of this repair. It may be considered only
in a different, separately approved incident when Prisma's supported semantics
apply to a failed migration or an approved baseline, the exact target and
effect are demonstrated on a disposable clone, and the change preserves rather
than conceals audit evidence. It must never be used merely to silence this
database-only completed record.

### Reconciliation migration and baseline policy

No reconciliation SQL migration is needed when the current repository history
already creates the intended schema on a fresh database and Production already
has the equivalent objects. An empty or no-op migration must not be added to
simulate repair.

A new database baseline is reserved for a separately approved history
consolidation project. It must retain archived immutable history, define how
existing environments are marked without deleting records, and prove fresh and
upgrade paths. This incident does not justify that larger discontinuity.

### Audit and lifecycle

The incident record, ADR, lineage attestation, implementation PR, approval,
pre/post inventories, schema fingerprints, command output and deployment
references form one retained audit package.

Any temporary transition flag used while the attestation-aware gate is
introduced must be exact, disabled by default and removed after the governed
path is operational. The durable attestation remains visible because
Production's historical record remains visible. It is an acknowledged lineage
fact, not a permanent unscoped ignore rule.

Artifact recovery continues in parallel. If checksum-identical SQL is later
recovered, a new ADR review decides whether restoring it improves the history
without changing Production.

## Explicit Prohibitions

This decision prohibits:

- fabricating checksum-identical or inferred historical SQL;
- describing reconstructed SQL as the lost original;
- treating schema equivalence as proof of historical SQL identity;
- deleting or rewriting the Production migration record;
- casually editing any applied migration record;
- `prisma db push`, Production reset or Production recreation;
- undocumented manual SQL;
- a migration-name-only or permanent broad ignore list;
- bypassing the migration safety gate;
- applying the pending password-reset migration before repair approval; and
- using the incident to authorise unrelated runtime or password-reset work.

## Rationale

The selected strategy preserves Production data and immutable evidence while
restoring a reproducible, fail-closed release path. It accepts the irreducible
historical unknown honestly. The repository remains executable for new
databases, and the exceptional Production lineage is explicit, pinned,
reviewable and impossible to reuse against another database.

Prisma can support the execution component because `migrate deploy` applies
pending repository migrations without requiring the missing applied file.
That behavior is safe here only when Clada's independent verifier supplies the
drift detection and exact exception handling that Prisma deploy omits.

## Consequences

- Production's `_prisma_migrations` record and current schema remain unchanged
  by reconciliation itself.
- Future gate code is more complex and security-sensitive.
- Raw `prisma migrate status` will continue reporting divergence and cannot be
  the sole operational success criterion for this Production database.
- Every future migration must be validated against both a fresh database and
  the attested Production lineage.
- Preview, Development and test receive no exception; they must match the
  repository history exactly.
- The first post-repair Production migration will add an ordinary new Prisma
  migration record and may change schema as approved, but those are release
  effects, not historical repair.
- Password-reset request-flow work and pilot rollout remain blocked until the
  repair and PR #41 Production verification complete.

## Alternatives Considered

| Option | Repository change | Production database action | Data/history effect | Principal risk | Decision |
| --- | --- | --- | --- | --- | --- |
| A - Continue recovery | None unless an exact artifact is recovered and separately reviewed | None | None | Open-ended delay with low probability of recovery | Continue in parallel |
| B - Fabricated historical migration | Add inferred SQL under the missing name | None initially | Misrepresents repository history; checksum still differs | False provenance and unsafe gate pressure | Reject |
| C - Modify/delete Production record | None or misleading documentation | Direct `_prisma_migrations` mutation | Destroys audit evidence | Prisma inconsistency and concealed incident | Reject |
| D - Controlled reconciliation | Add exact attestation, verifier and tests in a future PR | Read-only reconciliation; later normal approved migration deploy | Preserves legacy rows; later deploy adds only its ordinary record | Verifier defect or under-scoped schema proof | Accept |
| E - New baseline | Replace/consolidate executable history and archive old inventory | Mark/reconcile existing environments under a new baseline | Creates an intentional history discontinuity | High tooling, audit and environment complexity | Reject for this incident |
| F - Gate exception alone | Add special-case gate logic | None | Leaves history divergent | Exception expands or hides new drift | Reject except as an expiring transition inside D |

### A - Continue artifact recovery

Retain as a parallel activity. OneDrive history, workstation backups, older
clones, archived builds, CI caches and operator records could recover decisive
evidence. Recovery is low-risk but unbounded, older Vercel artifacts are no
longer available, and the completed search indicates a low probability of
success. It cannot remain the only release-unblocking plan.

### B - Restore a fabricated historical migration

Rejected. Inferred SQL does not match the Production checksum, may omit unknown
operations, would misrepresent evidence and would still leave history
inconsistent.

### C - Modify or delete the Production record

Rejected. It would destroy the best surviving audit evidence, mutate an applied
history, risk Prisma state corruption and conceal rather than reconcile the
incident.

### D - Controlled migration-history reconciliation

Accepted through the attestation-aware design above. It preserves the record,
keeps fresh databases reproducible, proves schema equivalence and scopes the
exception to one exact database and ledger state.

### E - New database baseline

Rejected for this incident. Baselining is technically possible but introduces
a broader history discontinuity, environment-marking work and fresh/upgrade
tooling complexity when the existing repository history already builds the
target schema.

### F - One-time application-specific gate exception

Rejected as a standalone bypass. A transitional exact exception is acceptable
only inside the approved reconciliation implementation, with full metadata and
schema verification, code review, expiry and audit. A permanent ignore list is
unacceptable because it could hide a changed record or future drift.

## Prevention And Governance Controls

The remediation implementation and follow-up governance work must establish:

| Control | Requirement |
| --- | --- |
| Commit before application | No migration may run in any persistent environment until its directory is committed and reviewable at the recorded commit. |
| Immutable applied history | CI rejects deletion, rename or content change of any migration known to have been applied. |
| Checksum inventory | CI produces a deterministic name/checksum manifest; Production compares it with the database inventory. |
| Provenance | Operator evidence binds repository SHA, build/deployment ID, manifest hash, database fingerprint and change ID. |
| Production execution | Local ad hoc Production migration commands and manual SQL are prohibited; only an approved runbook and named guarded command are supported. |
| Review ownership | Migration-directory changes require database-governance ownership and security review when the gate or lineage changes. |
| Environment isolation | Preview, Development and test cannot accept a Production attestation or Production fingerprint. |
| Artifact retention | Migration-bearing source/build artifacts, manifests and command evidence are retained under the release audit policy. |
| Operator audit | Production preflight, execution, postflight, reviewer and stop/go decisions are retained without secrets. |
| Schema evidence | Releases record supported schema fingerprints and separately review unsupported objects such as triggers, extensions or provider-specific features. |
| Fresh and upgrade proof | Every migration release validates an empty disposable database and the supported upgrade baseline. |
| Drift response | Any unknown, missing, renamed, modified, failed or additional migration stops release and opens the migration-drift incident procedure. |

The planned control set includes an immutable or signed migration inventory,
historical deployment artifact retention, automated schema fingerprinting and
protected migration-directory review ownership. TD-019 remains open until the
implemented controls and first reconciled Production release are evidenced.

## Required Approvals

Before implementation:

1. CTO accepts this ADR.
2. Database reliability reviewer approves the verifier design and tests.
3. Security reviewer approves identity binding, fail-closed behavior and
   secret-free evidence.
4. Production owner approves the future change record and recovery point.

Before execution:

1. the remediation implementation PR is merged and its exact commit approved;
2. the runbook preconditions and two-person evidence review pass; and
3. the pending PR #41 migration receives separate Production execution
   approval.

## Follow-Up

1. Review and accept this ADR.
2. Continue artifact recovery without blocking the controlled implementation.
3. Implement the attestation, verifier and tests in a separate remediation PR.
4. Execute the [runbook](../03-engineering/MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md)
   under a separately approved Production change.
5. Add the migration-governance controls tracked in TD-019.
6. Resume password-reset planning only after Production migration and
   deployment verification are complete.
