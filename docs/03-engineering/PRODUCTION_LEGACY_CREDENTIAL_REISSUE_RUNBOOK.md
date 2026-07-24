# Production Legacy Credential Reissue Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-PROD-LEGACY-CREDENTIAL-REISSUE-001 |
| Status | Active — Production execution separately gated |
| Owner | Clada Systems Engineering |
| Review cycle | Before every use |
| Last reviewed | 2026-07-24 |

## Purpose And Current Stop Condition

This runbook covers the exceptional recovery of one approved, active legacy
pilot owner whose Production password is unknown or differs from Preview. It
does not provision a tenant, copy environment data, or provide a general
password-reset facility.

The guarded workflow was merged and deployed on 2026-07-24. It has not been
executed. Production execution requires all of the following:

1. The owner authorises the named account recovery.
2. A Production change ID and active Clada internal operator are approved.
3. A fresh dry-run plan is reviewed immediately before execution.

## Threat Model

The controls address wrong-environment targeting, account enumeration,
normalisation collisions, stale tenant assumptions, cross-tenant privilege
change, operator impersonation, credential disclosure, replay, partial writes,
and reuse of an old session. The command fails closed when any identity,
membership, organisation, Installer, operator, credential, environment,
approval, or idempotency invariant is not exact.

Direct SQL, `prisma db push`, reset, reseed, Preview record copying, legacy
provisioning, password validation changes, and tenant/role edits are prohibited.

## Eligibility

The safe preflight must establish:

- exactly one user for the normalised approved email;
- active user with a present structurally valid Argon2id hash;
- `mustChangePassword=false` before the reissue;
- exactly one active `ORGANISATION_OWNER` membership;
- an active, verified `INSTALLER` organisation;
- exactly one Installer for that organisation;
- an active Clada internal operator;
- no pending operation, changed replay, or equivalent completed reissue.

No raw hash, database URL, credential, customer data, session token, or secret
may appear in evidence.

## Input

Create an ignored local JSON file containing only:

```json
{
  "environment": "production",
  "email": "approved.owner@example.ie",
  "operatorUserId": "approved-internal-operator-id",
  "idempotencyKey": "approved-unique-operation-key",
  "reason": "approved incident or change reason"
}
```

Do not add a password or secret field. The command rejects secret-shaped input.
Confirm the file is ignored and never stage it.

## Read-Only Dry Run

From the deployed, approved revision with Production classification and
fingerprint variables supplied through the approved secret channel:

```text
pnpm tenant:recover:production-credential --input <ignored-input.json>
```

The dry run performs no writes. Record only its safe category, safe target
reference, eligibility result, idempotency status, and plan reference. Stop if
the target is ambiguous, ineligible, drifted, or already completed.

Have a second reviewer compare the safe plan with the approved account,
organisation, incident/change record, and deployed commit. Approval applies
only to that exact plan reference.

## Authorised Execution

Only after the stop condition and review are satisfied:

```text
pnpm tenant:recover:production-credential --input <ignored-input.json> --execute --confirm-production --plan-reference <reviewed-plan-reference>
```

The environment must also contain the exact acknowledgement
`REISSUE_APPROVED_PRODUCTION_CREDENTIAL` and the approved Production change ID
under the variable names required by the database safety guard.

The command prompts twice for the temporary credential in a private interactive
terminal with echo disabled. The human operator enters it. Do not paste it into
Codex, a shell argument, an environment variable, a file, a ticket, a log, or
the pull request.

## Transaction And Idempotency

Execution revalidates the target and approval inside one serializable
transaction. It creates a typed pending recovery operation, replaces the
existing user's hash through the approved Argon2id service, sets
`mustChangePassword=true`, sets a 24-hour expiry, deletes all existing sessions,
writes a secret-free recovery audit event, and completes the operation.

It does not modify the user email/status, organisation, Installer, membership,
role, tenant assignment, lead, or quote data. Any transaction error rolls back
all writes. Reusing the same completed idempotency key returns the recorded safe
result without changing the credential. A different key for an equivalent
completed recovery is refused for manual review.

## Secure Delivery And First Login

Deliver the temporary credential only through the owner-approved confidential
handoff channel. The recipient signs in before expiry and is restricted to the
password-change flow. Successful replacement verifies the current temporary
credential, applies normal password policy, clears the recovery flag/expiry,
revokes prior sessions, writes recovery-completion and password-change audit,
and creates a normal tenant session.

The approved Production smoke must verify:

- temporary login and required password change;
- old and temporary credentials no longer authenticate after replacement;
- Dashboard, Leads, an existing lead, and Quote Pricing load;
- the expected installer organisation is selected;
- no cross-tenant data is visible;
- logout invalidates the session;
- invalid credentials still return the generic 401;
- unauthenticated protected routes redirect;
- runtime and browser console scans are clean.

## Failure, Rollback, And Repair

Stop immediately on any preflight mismatch, transaction error, login failure,
tenant mismatch, runtime exception, or unexpected data visibility. Do not
continue rollout and do not attempt SQL repair.

Before commit, rollback is automatic. After a successful commit, the safe
containment action is to revoke access or perform a separately approved reissue
through this same audited service. Never restore an old hash manually. Attach
safe logs and operation references to the incident, then obtain CTO direction.

## Evidence Template

- approved change ID:
- approved operator reference:
- deployed commit and deployment ID:
- dry-run plan reference:
- safe target and organisation references:
- eligibility and idempotency result:
- CTO/owner approvals and timestamps:
- execution operation reference and completion time:
- forced-change result:
- authenticated tenant-isolation smoke result:
- invalid/unauthenticated denial result:
- runtime/console scan result:
- confirmation no manual database action occurred:

Omit credentials, hashes, secrets, tokens, database URLs, raw customer data, and
full request or provider payloads.

## Implementation Validation And Deployment Status

On 2026-07-24 the implementation passed:

- frozen pnpm 10.11.0 install with an unchanged lockfile;
- Prisma format, generate, and validate;
- TypeScript typecheck and ESLint;
- 198 unit/platform tests;
- all 15 committed migrations from a fresh disposable PostgreSQL 16 database;
- 61 PostgreSQL integration tests, including dry-run zero writes, eligible
  reissue, forced first login, ordinary-operation marker refusal, lifecycle and
  tenant refusal, idempotency, session revocation, secret-free audit, and
  transaction rollback; and
- the Next.js production build.

The available validation host used Node 24.14.1 and emitted the repository's
Node 22.x engine warning. CI supplied the authoritative Node 22 result. The
disposable database was removed after testing.

Deployment evidence:

- PR #38 merge commit:
  `1ef8c551527d4f1a72c8eb4605741ff5f152cf47`;
- Production deployment: `dpl_HakxtUttHMAabbU1CQGtGMabMRTv`;
- status: `READY` at 2026-07-24 12:00:44 UTC;
- canonical URL: `https://seai-grant-software.vercel.app`;
- the guarded Vercel preflight selected Production migration `status`, found all
  15 committed migrations already applied, and executed no migration;
- home and login returned 200, unauthenticated dashboard access redirected to
  login, controlled invalid credentials returned the generic 401, and the
  deployment error/fatal runtime scan was clean.

No Production credential, user, organisation, Installer, ProvisioningOperation,
feature flag, migration, or application data was changed. The guarded command
is available but has not been executed. The authentication incident remains
open pending separately authorised recovery, forced first-login replacement,
and authenticated tenant-isolation smoke testing.

## Related Documents

- [ADR-0022](../05-decisions/ADR-0022-production-legacy-credential-reissue.md)
- [Pilot authentication](PILOT_AUTHENTICATION.md)
- [Pilot onboarding runbook](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md)
- [Database operations runbook](DATABASE_OPERATIONS_RUNBOOK.md)
- [Incident record](INCIDENT_2026_07_23_PRODUCTION_AUTH_503.md)
