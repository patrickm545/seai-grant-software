# ADR-0024: Migration History Repair for Permanently Missing Applied Migrations

| Field | Value |
| --- | --- |
| Document ID | ADR-0024 |
| Status | Accepted; verifier and capture tooling implemented; Production evidence, activation and execution remain separately approved |
| Owner | Clada Systems Engineering |
| Review cycle | Before each attestation use and after any Prisma migration-tooling change |
| Last reviewed | 2026-08-13 |

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

Clada Systems will use a **single-incident, fail-closed Production lineage
attestation and an attestation-aware migration gate**.

This is prospective repository governance for the one incident documented
below. It does not recreate the lost SQL, mutate the existing Production
migration record or establish a general migration-history repair mechanism.

### Retained historical divergence

The historical migration ledger remains divergent. The missing historical SQL
is still unknown. The existing Production migration record remains untouched,
and the repository does not acquire a replacement migration pretending to be
the original.

ADR-0024 does not claim that historical equivalence has been restored.
Implementation may establish only this operational status:

> **Production lineage accepted under ADR-0024 attestation.**

It must not be described as history repaired, migration history restored, drift
eliminated, ledger normalised or historical migration recovered. The underlying
historical artifact remains unavailable unless a checksum-identical artifact is
separately recovered and reviewed.

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

The merged verifier implementation defines a fixed-path, machine-readable,
review-owned attestation containing at least:

- exact approved database fingerprint and environment;
- migration name, Production record ID and checksum;
- `started_at`, `finished_at`, `applied_steps_count` and rollback state;
- related failed or zero-step migration records required to interpret lineage;
- repository baseline SHA and repository migration inventory hash;
- versioned schema fingerprint and catalog assertions;
- incident, ADR, approval and change-record references;
- date, named operator, governance mode, accountable approver and expiry/review
  policy;
- an explicit statement that the historical SQL is unknown.

The attestation must contain no credential, connection URL, customer data or
fabricated SQL.

### Exact attestation scope

The attestation is valid only when every field below matches. An unset,
partially matched or wildcard field is invalid.

| Identity field | Exact required value or approval rule |
| --- | --- |
| Environment | Production only |
| Database fingerprint | `db_4e1d3bd23cff6801` |
| Missing migration | `20260423093000_application_pack_admin_fields` |
| Migration ID | `2305f52e-af2f-4717-bc37-a6a88bc1ec33` |
| Checksum | `affbde51faf1b8ccc731f575326d8dfdf2c21ec625565f516d5350ec5779f589` |
| Started | `2026-04-23T07:04:10.39554Z` |
| Finished | `2026-04-23T07:04:10.527739Z` |
| Applied steps | `1` |
| Rollback/error state | `rolled_back_at IS NULL`; no error log |
| Related repository migration | `20260428120000_manual_submission_prep` |
| Related migration checksum | `42d778c6f26d6bfaed4569b1b9da5208fa9a25a0f0558439c7d9669818bf6ed3` |
| Related failed attempt | Started `2026-04-29T06:01:05.497406Z`; zero applied steps; finished unset; rolled back `2026-04-29T06:01:38.423504Z`; duplicate `Lead.internalNotes` error |
| Related completed record | Started and finished `2026-04-29T06:01:38.54346Z`; zero applied steps; not rolled back; no error log |
| Repository baseline | `a4bd4e2c184c745520a1484fcfbe94595ef58b3f`, or an explicitly reviewed successor commit containing the approved inventory |
| Repository inventory | Exact names and checksums of all 16 migrations at the baseline, represented by an approved deterministic manifest hash |
| Production schema | Exact approved versioned schema fingerprint plus named catalog assertions |

The deterministic repository manifest hash and Production schema fingerprint
must be generated, reviewed under the selected explicit governance mode and
inserted as exact values before the fixed attestation is activated. ADR-0024
supplies no placeholder acceptance: missing or unapproved values fail closed.

The database-only migration timestamps above were established by the closed
R4 read-only evidence record. The related failed-record timestamps were
established by the closed R7 read-only evidence record under
`adr-0024-migration-record-normalization/v1`. Earlier records used
millisecond-truncated timestamps. These evidence-accuracy amendments do not
change Production or authorise another capture.

The related completed zero-step timestamps were established by the closed R8
read-only evidence record under the same normalization version. Earlier
governing metadata recorded `2026-04-29T06:01:38.543Z`; R8 established
`2026-04-29T06:01:38.54346Z` for both `startedAt` and `finishedAt`. This
repository-only correction does not accept lineage or activate the
attestation, which remains pending with zero captures and zero approvals.

#### Exact Production repository-checksum divergences

The closed R10, R11, R12, R14, R15 and R17 operations established checksum-only
exact-success mismatches for six specific ordinary Production records. Later
repository-only investigations proved classification A for each: its observed checksum is the
exact committed UTF-8/no-BOM SQL mechanically materialised with CRLF rather
than LF while retaining the final newline. Reverse normalization is
byte-for-byte exact and changes no SQL token.

The manifest and all six migrations remain canonical and unchanged. Attestation
v5 may record only the exact six historical Production tuples, and each entry
must also require the exact Production fingerprint, record ID, successful
lifecycle, approved manifest, approved repository-lineage baseline and
retained evidence digest. The active verifier must prove canonical repository
integrity and all six exact observed Production rows independently.

This is not a global alternate checksum or line-ending rule. No tuple can
satisfy another; a missing, duplicated, cross-matched or changed entry fails
closed. Preview, test, development, fresh databases, other migrations, other
records and other fingerprints remain strict. The treatment expires and
retires with ADR-0024. The attestation remains pending with zero captures and
approvals.

### Pilot-stage governance exception

The standard `standard-independent-human` mode remains the preferred path and
retains all four human approval roles and independence rules below. While Clada
Systems is operating at pilot stage without another qualified human technical
reviewer, this single attestation may instead use the explicit
`pilot-stage-compensating-control` mode defined in
[PR #45 Pilot-Stage Production Governance](../03-engineering/PR_45_PILOT_STAGE_PRODUCTION_GOVERNANCE.md).

In that mode Patrick McKenna is the CEO, Production Owner, Production
Operator, Recovery Owner and final accountable human approver. Technical review
is AI-assisted CTO review based on retained deterministic evidence and
repository controls; AI is not a human approver. The exception is restricted to
two fixed read-only evidence captures, attestation activation and exact
`verified-pending-blocked` status verification. It authorises no migration,
deployment or alias movement and cannot apply automatically to another change.

Activation requires two complete secret-free external artifacts whose
repository SHA, change ID, Production identity, connected database name,
operator, restore evidence, deterministic evidence digest, schema fingerprint
and assertions match exactly. Both artifact digests and references must be
recorded. Any mismatch or unknown value stops. Qualified human review becomes
mandatory before onboarding the first 10 pilot installers or when another
engineer or qualified external database reviewer joins, whichever occurs
first, and the attestation remains subject to its maximum 90-day expiry.

### Attestation-aware gate

The separately approved verifier implementation replaces reliance on raw
Prisma status output with an independent inventory verifier for this path. The
verifier must:

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

It must specifically reject:

- another unexpected migration;
- a changed checksum;
- changed pinned timestamps, applied-step count, completion or rollback state;
- another failed or unfinished migration;
- any change to the duplicate-migration ledger state;
- a database-identity or environment mismatch;
- a schema-fingerprint or catalog-assertion mismatch;
- a missing repository migration;
- a renamed, deleted or modified committed migration;
- an additional unapproved schema object;
- an expired, withdrawn or retired attestation; and
- use in Preview, Development, test or another Production database.

The ordinary Production migration command may call `prisma migrate deploy`
only after that verifier passes and the existing Production acknowledgement
and change-ID controls pass. It must run the verifier again afterward. The
post-check accepts the exact attested lineage plus all expected repository
migrations; raw Prisma's divergent status is not treated as proof of failure or
success by itself.

The attestation supplements Prisma; it does not waive Prisma checks. Normal
migration inventory, pending-migration, failed/unfinished-state and schema
checks still run. Only the single exact discrepancy described in the scope
table may be accepted.

### Evidence threshold

Before the attestation can be used, either the standard independent-human
reviewers or the explicit pilot-stage compensating-control path must approve
evidence that:

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

The attestation must record:

| Lifecycle field | Requirement |
| --- | --- |
| Owner | Clada Systems Engineering |
| Approvers | Standard mode: CTO, database reliability reviewer, security reviewer and Production owner. Pilot-stage mode: Patrick McKenna as sole human Production owner and final accountable approver under the mandatory compensating controls. |
| Creation date | Exact date of the separately approved implementation |
| Review date | Before every Production database release and at least quarterly |
| Expiry | No later than 90 days after creation or renewal |
| Incident | `ENG-INCIDENT-2026-07-25-PRODUCTION-MIGRATION-DRIFT` |
| Database identity | Exact Production fingerprint and environment |
| Repository baseline | Exact approved commit and migration manifest hash |
| Schema identity | Exact approved schema fingerprint and catalog-assertion version |
| Migration evidence | Full missing-migration and duplicate-migration metadata |
| Reason | Historical artifact unavailable; operational lineage acceptance only |
| Evidence references | Investigation, approval, implementation PR and pre/post verification records |

An expired attestation blocks Production migration and deployment until the
applicable governance mode is reviewed and renewed. Pilot-stage renewal does
not defer its first-10-installers/new-reviewer trigger. It must be retired
immediately on:

- replacement of the Production database;
- a formal future re-baselining;
- recovery of the original checksum-identical artifact;
- a material schema-lineage change;
- a superseding ADR; or
- invalidation or contradiction of any supporting evidence.

Any temporary transition flag used while the attestation-aware gate is
introduced must be exact, disabled by default and removed after the governed
path is operational. The durable attestation remains visible because
Production's historical record remains visible. It is an acknowledged lineage
fact, not a permanent unscoped ignore rule.

Artifact recovery continues in parallel. If checksum-identical SQL is later
recovered, a new ADR review decides whether restoring it improves the history
without changing Production.

### No precedent

ADR-0024 does not authorise:

- a permanent ignore list;
- wildcard, name-only or checksum-free migration exclusions;
- automatic acceptance of an unknown migration;
- future incident handling without a new investigation, ADR and approval; or
- current schema equivalence as proof of historical migration identity.

No attestation may be copied, generalised or reused for another database,
migration or incident.

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
  by the attestation itself.
- The attestation-aware gate is more complex and security-sensitive than raw
  Prisma status.
- Raw `prisma migrate status` will continue reporting divergence and cannot be
  the sole operational success criterion for this Production database.
- Every future migration must be validated against both a fresh database and
  the attested Production lineage.
- Preview, Development and test receive no exception; they must match the
  repository history exactly.
- The first Production migration after lineage acceptance will add an ordinary
  new Prisma migration record and may change schema as approved, but those are
  release effects, not restoration of historical equivalence.
- Password-reset request-flow work and pilot rollout remain blocked until the
  attestation is activated from reviewed evidence and PR #41 Production
  execution and verification complete.

## Alternatives Considered

| Option | Repository change | Production database action | Data/history effect | Principal risk | Decision |
| --- | --- | --- | --- | --- | --- |
| A - Continue recovery | None unless an exact artifact is recovered and separately reviewed | None | None | Open-ended delay with low probability of recovery | Continue in parallel |
| B - Fabricated historical migration | Add inferred SQL under the missing name | None initially | Misrepresents repository history; checksum still differs | False provenance and unsafe gate pressure | Reject |
| C - Modify/delete Production record | None or misleading documentation | Direct `_prisma_migrations` mutation | Destroys audit evidence | Prisma inconsistency and concealed incident | Reject |
| D - Controlled reconciliation | Add exact attestation, verifier and tests | Read-only reconciliation; later normal approved migration deploy | Preserves legacy rows; later deploy adds only its ordinary record | Verifier defect or under-scoped schema proof | Accept |
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
implemented controls and first Production release under the ADR-0024
attestation are evidenced.

## Required Approvals

Before implementation:

Under standard governance:

1. CTO accepts this ADR.
2. Database reliability reviewer approves the verifier design and tests.
3. Security reviewer approves identity binding, fail-closed behavior and
   secret-free evidence.
4. Production owner approves the future change record and recovery point.

Under the temporary pilot-stage mode, Patrick McKenna records the exact
accountability acknowledgement and sole human Production-owner approval only
after all deterministic compensating-control evidence exists. No AI system,
vendor or invented identity is recorded as a human approver.

Before execution:

1. the remediation implementation PR is merged and its exact commit approved;
2. the runbook preconditions and the selected explicit governance mode pass;
   and
3. the pending PR #41 migration receives separate Production execution
   approval.

## Follow-Up

1. Review and accept this ADR.
2. Continue artifact recovery without blocking the controlled implementation.
3. Review PR #43's implemented attestation, manifest, verifier and tests. The
   checked-in attestation remains pending and cannot accept Production until
   exact remaining evidence and genuine approvals are separately recorded.
4. Execute the [runbook](../03-engineering/MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md)
   under a separately approved Production change.
5. Add the migration-governance controls tracked in TD-019.
6. Resume password-reset planning only after Production migration and
   deployment verification are complete.

## Accepted Historical-Resolved-Migration Amendment

ADR-0024 defines `attestedHistoricalResolvedMigration` as a distinct,
fail-closed historical state. It is not ordinary migration success and is not
a general acceptance of `migrate resolve`. Exactly one pending entry exists
for `20260716183000_pilot_installer_auth`.

The ordinary invariant is unchanged:

> ordinary repository migration = canonical checksum, one unambiguous
> finished and not-rolled-back record, `applied_steps_count = 1`, and no logs.

The separate historical invariant requires every field below to be exact:

- Production environment and fingerprint `db_4e1d3bd23cff6801`;
- migration `20260716183000_pilot_installer_auth` and record
  `69505647-7711-408c-853e-32579345d1b0`;
- canonical checksum `d35cb01bfaeea27b02a4a1361a4f05688e730592e3cd1731ed23911871ca81fb`
  and observed CRLF checksum
  `fee0749e78b3ecc7aea1f6823b338a16c0ed5fb8e4613e079042bb52192913a9`;
- classification A checksum evidence and classification L1 lifecycle and
  resolve-operation evidence, each bound to its exact SHA-256;
- one finished, not-rolled-back record with `applied_steps_count = 0`, no logs,
  and exact current ledger timestamps;
- manifest hash, repository baseline, deterministic evolved-schema inventory,
  full current schema fingerprint and exact named catalog assertions;
- two matching captures from one newly authorised operation, current recovery
  evidence, active attestation lifecycle, and the required governance and
  accountability approvals.

Missing, additional or different evidence fails closed. The state cannot be
used by Preview, Development, test or fresh-database verification; cannot be
reused by another migration, database fingerprint or record; and cannot be
satisfied through the ordinary checksum-divergence structure. The three R10-R12
ordinary one-step tuples are unchanged; R14, R15 and the repository-only R17
investigations add independently pinned fourth, fifth and sixth ordinary tuples
for tenant provisioning, tenant first-login activation and tenant operator
recovery without changing the pilot-auth structure.

The deterministic expected schema inventory is
[`ADR_0024_PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.json`](../03-engineering/evidence/ADR_0024_PILOT_AUTH_EXPECTED_SCHEMA_INVENTORY.json).
It distinguishes objects introduced by the pilot-auth repair from the later,
committed `AuthSession.sessionType` evolution. Current Production must match
that evolved end-state and the complete catalog fingerprint; the July 16 state
is not treated as permanently frozen.

## Post-R17 Activation Gate

The separately authorised R17 operation stopped before producing a complete
capture and is permanently closed. It did not activate the attestation. A
future, separately authorised read-only operation must prove all of the
following before activation can be considered:

1. all exact R10-R12, R14, R15 and R17 ordinary records still pass independently;
2. the pilot-auth name, record ID, observed checksum, zero-step count, exact
   canonical `started_at` and `finished_at`, null rollback, and no-log state;
3. the full current Production schema fingerprint and every named pilot-auth
   catalog assertion, including the declared `sessionType` evolution and no
   conflicting protected object;
4. the pending migration set is exactly
   `20260724180000_password_reset_foundation`;
5. two read-only repeatable-read captures match in every deterministic field;
6. current recovery evidence and the exact authorised repository revision are bound
   to both retained artifact references and SHA-256 digests; and
7. active attestation validation, governance approval and accountability
   requirements all pass.

Until those values are captured and reviewed, the entry retains null ledger
timestamps, null current-schema evidence, empty schema-named R14 capture
references, and a pending attestation. This amendment authorises no Production
access, status command, migration, resolution, deployment, alias movement or
new operation.

## Post-R15 Exact Tuple And Candidate Boundary

The permanently closed R15 operation stopped with typed exit `25` on the exact
tenant first-login checksum and no lifecycle failure. Repository-only evidence
proved classification A: converting the canonical 575-byte LF Git blob to a
591-byte CRLF representation produces the exact observed checksum, and the
reverse transformation is byte-for-byte exact. The fifth ordinary tuple is
therefore restricted to the exact Production fingerprint, migration, record,
checksums, one-step lifecycle, manifest, repository baseline and retained R15
evidence digest.

The three later committed migrations have a deterministic repository-only
CRLF candidate matrix. Those candidate checksums are not Production evidence,
are not verifier inputs and are not attestation entries. In particular,
`20260724180000_password_reset_foundation` remains expected pending. A later
Production mismatch requires its own observation, authority and exact tuple
decision; pattern or family acceptance is prohibited.

## Post-R17 Exact Tenant-Operator Tuple

The permanently closed R17 operation used the hardened write-first launcher
and retained repository and wrapper exit `25`, classification
`LEDGER_MISMATCH`, stage `first-evidence-generation`, the exact record identity
and the sole `checksum-mismatch` failure. It emitted no complete capture,
second transaction, deterministic digest, schema result or live pending set.

The observed tenant-operator checksum exactly matches the precomputed CRLF
candidate. Independent repository-only proof converts the canonical 804-byte
UTF-8/no-BOM LF blob's 24 line feeds to an 828-byte CRLF representation and
reproduces the exact observed checksum. Removing only those carriage returns
restores the canonical blob byte-for-byte; tokens, statement order, comments
apart from line endings and semantic content remain unchanged.

The sixth ordinary tuple is restricted to the exact Production fingerprint,
migration, record ID, canonical and observed checksums, completed one-step
lifecycle, manifest, R17 repository baseline, classification, dedicated
evidence reference and evidence digest. The five prior tuples and separate
pilot-auth historical state are unchanged and cannot cross-satisfy it.

The manual-lead and password-reset matrix entries remain unaccepted repository
candidates. Password reset remains expected pending. The matrix is not a
runtime allowlist, and no generic CRLF, prefix, date or Windows-checkout rule
exists. This amendment authorises no Production access or R18 operation.
