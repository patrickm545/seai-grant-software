# PR #44 ADR-0024 Production Evidence And Activation Record

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-2026-07-28 |
| Status | Draft; Production evidence capture and genuine approvals pending |
| Owner | Clada Systems Engineering |
| Review cycle | Before every PR #44 evidence capture or attestation edit |
| Repository baseline | `e4bde0c21f1e8135a82761ad4ea08d1c89a658eb` |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Incident | [2026-07-25 Production migration-history drift](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md) |
| Last reviewed | 2026-07-28 |

## Scope And Current Decision

PR #44 is an evidence-capture and attestation-activation change. It is not a
Production migration-execution change.

The fixed attestation remains `pending`. Production has not been queried
because the named operator, distinct independent reviewer, approved read-only
change ID, current restore-point reference and controlled Production
connection are not available in the PR workspace. No person, approval,
timestamp, evidence reference, migration record ID or log digest has been
invented.

The status **Production lineage accepted under ADR-0024 attestation** has not
been established.

## Approved Read-Only Capture Plan

The fixed command is:

```text
pnpm db:lineage:capture-production-evidence
```

It requires the exact Production environment and database fingerprint, a named
operator, a different named independent reviewer, an approved change ID and a
restore-point evidence reference. It reads only the connected database
identity, `_prisma_migrations` metadata and the fixed catalog profile inside a
`REPEATABLE READ`, read-only transaction.

The command emits:

- the safe database fingerprint and connected-name match result;
- repository revision, exact 16-migration inventory and manifest hash;
- normalized migration rows containing exact IDs and log digests but no raw
  logs;
- the exact pending set and ADR-0024 pinned-evidence comparison;
- the pre-password-reset schema fingerprint, five named assertions, catalog
  counts and unsupported-object inventory; and
- a deterministic digest over all evidence except capture time.

It performs no DDL, DML, migration lock, Prisma deploy, temporary-object
creation, schema change, application-data change or migration-ledger change.
The command accepts no caller-supplied manifest or attestation path.

Run it twice against one safely identified Production connection. Stop if the
two deterministic evidence digests, ledger normalizations, manifest hashes or
schema fingerprints differ.

## Production Access Preconditions

| Precondition | Observed state | Result |
| --- | --- | --- |
| Repository baseline | `e4bde0c21f1e8135a82761ad4ea08d1c89a658eb` | Pass |
| Vercel project | `seai-grant-software`; linked project `prj_ZfAMVKj3uSTotQsPenzxXupJxQAX` | Pass |
| Live Production deployment | `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`; Ready; Production alias unchanged | Pass |
| Latest blocked Production deployment | `dpl_2qGpjKQrGCCHRJazwRR1X8nNiDRD`; Error | Pass |
| Blocked verifier evidence | `production-status`; `ATTESTATION_INACTIVE`; exit `21` | Pass |
| Concurrent Production deployment | Recent Production deployments are terminal | Pass at review time; recheck before capture |
| Expected database fingerprint | `db_4e1d3bd23cff6801` | Configured; connected proof pending |
| Attestation lifecycle | `pending` | Pass |
| Expected pending migration | `20260724180000_password_reset_foundation` | Governing expectation; live proof pending |
| Production operator | Not supplied | Blocked |
| Independent reviewer | Not supplied | Blocked |
| Read-only change ID | Not supplied | Blocked |
| Current restore-point reference and retention | Not supplied | Blocked |
| Controlled Production connection | Not present in the workspace | Blocked |

The failed deployment log shows dependency-time `prisma generate`, followed by
the Production status verifier and exit `21`. It contains no `prisma migrate
deploy` invocation and did not continue to the application build.

## Repository And Disposable Evidence

| Evidence | Expected | Observed | Result |
| --- | --- | --- | --- |
| Manifest version | `clada-migration-manifest/v1` | `clada-migration-manifest/v1` | Pass |
| Migration count | 16 | 16 | Pass |
| Manifest hash | Approved exact hash | `1bf1d8049b946f1db7193b7493376822a460458bcbe30ea29b02ca9e0e3b7872` | Pass |
| Verifier version | `adr-0024-lineage-verifier/v1` | `adr-0024-lineage-verifier/v1` | Pass |
| Fresh-head fingerprint | Two deterministic runs | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` twice | Pass |
| Disposable pre-reset fingerprint | Two deterministic runs | `fbe0fae4569e466df55764a5d23926c22f03727d822c48e0f6566b08dbfde5ee` twice | Pass |
| Disposable post-reset fingerprint | Two deterministic runs | `d9478bcc85c224ccdcab8920f1899ff0a6783711b75fd277e583af7064cbf649` twice | Pass |
| Fresh/post equivalence | Exact match | Exact match | Pass |
| Pre-reset assertions | Four approved `Lead` columns; `PasswordResetRequest` absent | Five of five passed | Pass |
| Post/fresh assertions | Four approved `Lead` columns; `PasswordResetRequest` present | Five of five passed in both profiles | Pass |
| PostgreSQL integration tests | All pass on disposable PostgreSQL | 68 passed | Pass |

The pre-reset path used the 15-migration repository state at
`cdd69285131cccc9c4edbc2b8722f093b5d11f18`. The committed
`20260724180000_password_reset_foundation` migration was then applied once to
that disposable database. A separate empty disposable database applied all 16
migrations. No Production database was used for either path.

## Production Evidence Still Required

The following values must be captured twice through the fixed read-only command
and independently reviewed before attestation editing:

- connected Production identity and exact pre-migration schema fingerprint;
- exact failed `20260428120000_manual_submission_prep` record ID;
- exact completed zero-step record ID;
- SHA-256 digest of the failed record's exact log bytes;
- complete ledger normalization, pending set, catalog counts and unsupported
  object result; and
- deterministic evidence digest and retained secret-free evidence references.

Any mismatch with ADR-0024, additional migration, unstable read, catalog
assertion failure, unavailable record ID, unsafe log handling or secret in the
artifact is a stop.

## Genuine Approvals Still Required

The four roles remain pending:

- CTO;
- Database Reliability Reviewer;
- Security Reviewer; and
- Production Owner.

The operator and independent reviewer must be different people. Every approval
must identify the reviewer, exact approval timestamp, evidence reference,
accepted scope, exact acknowledgements and conditions. The machine-readable
approval must state that historical SQL remains unknown, existing Production
records remain untouched, schema equivalence is operational evidence only, no
Production migration was applied, migration execution remains separately
controlled and Preview remains out of scope. Approval evidence must be an
indexed repository Markdown path that exists.

Codex is not an approver.

## Activation And Status Verification

Do not edit the exact evidence fields or set `status` to `active` until the two
Production captures match exactly and all four genuine approvals are retained.
Activation expiry must be no later than 90 days after activation.

Only after reviewed activation may the read-only Production status verifier
run. Its required success condition is:

- final decision `verified-pending-blocked`;
- exit `20`;
- pending migration
  `20260724180000_password_reset_foundation`;
- `deploymentAllowed: false`; and
- `migrationApplied: false`.

Exit `20` must continue blocking the Vercel build. It is not changed to exit
`0`, and it does not authorize Prisma deploy or alias promotion.

## Unchanged Safety State

- Production schema, application data and `_prisma_migrations` are unchanged.
- The Production alias remains on
  `dpl_3MW7Q6FtkxJroPXHc5RF8FqAD59E`.
- The password-reset migration remains pending in Production.
- Password-reset request-flow work remains paused.
- Preview's checksum mismatch remains unresolved and receives no exception.
- The historical ledger remains divergent and the original SQL remains
  unavailable.
- The unrelated July 23 incident edit is untouched and excluded.

The next step is a separately approved read-only Production evidence operation.
Actual Production migration execution remains a later, separately approved
task.
