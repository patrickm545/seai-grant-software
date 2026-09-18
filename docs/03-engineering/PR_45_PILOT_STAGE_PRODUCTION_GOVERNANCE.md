# PR #45 Pilot-Stage Production Governance

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PILOT-STAGE-GOVERNANCE-2026-07-29 |
| Status | Approved governance design; operational evidence and activation pending |
| Owner | Patrick McKenna |
| Review cycle | Before activation and at the first-10-pilot-installers/new-reviewer trigger |
| Last reviewed | 2026-07-29 |
| Scope | PR #45 read-only Production evidence, status verification and attestation activation only |
| Governing decision | [ADR-0024](../05-decisions/ADR-0024-migration-history-repair-for-permanently-missing-applied-migrations.md) |
| Review trigger | Before onboarding the first 10 pilot installers or when another engineer or qualified external database reviewer joins, whichever occurs first |

## Operating Model

Clada Systems is presently operating at pilot stage without an independent
human technical reviewer. Patrick McKenna is the real human:

- Chief Executive Officer;
- Production Owner;
- Production Operator;
- Recovery Owner; and
- final accountable approver.

Technical review for this one operation is an AI-assisted CTO review using
retained deterministic evidence, repository-enforced controls and Patrick's
CEO accountability. AI is a review method, not a person or human approver.
Sam, ChatGPT, OpenAI, Codex, automation and invented identities must not be
recorded as approvers or reviewers.

The normal `standard-independent-human` governance mode remains available and
continues to require the CTO, Database Reliability Reviewer, Security Reviewer
and Production Owner approvals, including the existing independence rules.
This document authorises no relaxation of that standard path.

## Temporary Exception

The explicit `pilot-stage-compensating-control` mode applies only to:

1. two invocations of the fixed read-only Production evidence command;
2. comparison and retention of the resulting secret-free evidence;
3. population and activation of the single ADR-0024 attestation from exact
   reviewed evidence; and
4. one read-only Production status verification whose only successful result
   is `verified-pending-blocked`, exit `20`.

It does not authorise a Production migration, `migrate deploy`, application
deployment, promotion, alias movement, manual SQL, ledger edit, schema or data
change. It creates no precedent and does not apply automatically to any later
change.

The exception must be reviewed and either retired or replaced by qualified
human review before the first 10 pilot installers are onboarded or when another
engineer or qualified external database reviewer joins, whichever occurs
first. The active attestation must also have an activation timestamp and an
expiry no later than 90 days after creation. The earlier trigger governs if it
arrives before that expiry.

## Mandatory Compensating Controls

Every item below is required; blank, unknown, stale, inferred or mismatched
evidence stops the operation:

- use the fixed `pnpm db:lineage:capture-production-evidence` command exactly
  twice as two separate command invocations;
- require both command artifacts to record the same repository SHA, change ID,
  Production fingerprint, connected database name, operator, restore-point
  reference, schema fingerprint, named-assertion version and deterministic
  evidence digest;
- compare every deterministic field, not only a summary or selected rows;
- retain both complete secret-free artifacts outside Git in the controlled
  change record;
- record two distinct stable artifact references, each artifact SHA-256 digest
  and the matching deterministic evidence digest in the attestation;
- identify Patrick McKenna exactly as Production Owner and Production Operator;
- record the complete normalised migration ledger, related record IDs,
  failed-log digest, manifest inventory, pending set and catalog counts;
- require the exact Production identity `db_4e1d3bd23cff6801`, connected
  database-name guard and approved repository revision;
- require the versioned schema fingerprint and all named catalog assertions;
- leave the normal Preview, Development and test verifier strictness unchanged;
- after activation, require Production status to return exactly
  `verified-pending-blocked`, exit `20`, with
  `deploymentAllowed=false` and `migrationApplied=false`;
- stop on any mismatch, unknown output, identity difference, evidence drift,
  schema assertion failure, unexpected migration, secret exposure or attempted
  write; and
- require Patrick to record this exact acknowledgement:

> I acknowledge that no independent human technical reviewer is currently
> available and accept final accountability for this pilot-stage read-only
> evidence and attestation operation.

## Pending Boundary

The checked-in attestation intentionally selects
`pilot-stage-compensating-control` and records the operating model, scope,
prohibitions, accountability acknowledgement and later-review trigger. It
contains no captured Production evidence, approval evidence, activation
timestamp, review timestamp or expiry. Its status remains `pending`.

Activation is a later evidence-backed repository edit. Until every mandatory
field is populated and validated, `attestation-verify` remains inactive and
all Production migration and deployment paths remain blocked.

## Repository Validation

Completed without a Production connection:

- ESLint: pass;
- TypeScript: pass;
- unit, platform and security tests: 283 passed;
- disposable local PostgreSQL 16 integration tests: 68 passed after all 16
  migrations; the container was removed;
- Prisma schema validation: pass;
- production application build: pass using a non-connecting local validation
  identity;
- migration manifest: pass;
- immutable migration history: pass for all 16 migrations;
- pending attestation structural validation: pass with expected exit `21`;
- changed governance/engineering Markdown lint: pass across 70 documents;
- internal Markdown links: pass across 157 repository documents;
- changed-document metadata: pass;
- changed-content secret scan: pass; and
- `git diff --check`: pass.

The repo-wide Markdown scan also reports one unchanged pre-existing MD036
warning in
`docs/product/audits/SOLARGRANT_PRO_PILOT_READINESS_AUDIT_V1.md`. This
governance change does not alter that legacy product audit.

## Preview And Production State

The isolated PR #45 Preview lineage was safely repaired and independently
verified. The final Git-backed Preview deployment is Ready with strict
preflight and postflight clean. Preview receives no ADR-0024 exception.

Production was not connected to, queried, migrated, deployed or changed during
the governance update or Preview repair. No Production evidence capture,
Production status command, migration, deployment or alias movement occurred.
