# ADR-0022: Guarded Production Legacy Credential Reissue

| Field | Value |
| --- | --- |
| Document ID | ADR-0022 |
| Status | Accepted |
| Owner | Clada Systems Engineering |
| Review cycle | Before each authorised use and when the recovery model changes |
| Last reviewed | 2026-07-24 |

## Context

Production and Preview identities are intentionally isolated. Incident
`INCIDENT_2026_07_23_PRODUCTION_AUTH_503` established that an approved
Production pilot owner has a structurally valid Argon2id credential and valid
installer-organisation membership, but the supplied Preview credential does
not match the Production hash. The ordinary tenant-recovery command correctly
refuses to reissue a credential for an already-active Production user.

There is currently no transactional-email delivery provider or self-service
reset flow. Direct SQL, copying Preview records, replacing a hash manually, or
weakening authentication would bypass the existing audit, tenant, and database
safety boundaries.

## Decision

Add a narrowly scoped operator command for an approved, active legacy pilot
owner. Deploying the command does not authorise its use. Each Production
execution still requires owner approval, a reviewed dry-run plan, and an
approved change record.

The command:

- is dry-run and read-only by default;
- identifies exactly one normalised user, one active owner membership, one
  active verified installer organisation, and one Installer record;
- requires an active Clada internal operator, a reason, an idempotency key, the
  exact positively identified Production database fingerprint, the exact
  acknowledgement `REISSUE_APPROVED_PRODUCTION_CREDENTIAL`, and a change ID;
- accepts the temporary credential only from a human at a private interactive
  terminal with echo disabled, never from an argument, environment variable,
  file, standard input pipe, log, audit record, or command result;
- uses the existing Argon2id service and a serializable transaction to replace
  only the existing user's credential state, set a 24-hour expiry, require
  first-login replacement, revoke existing sessions, and write safe operation
  and audit evidence;
- does not create, activate, suspend, or alter an organisation, Installer,
  membership, role, or tenant assignment;
- makes the restricted first-login path recognise only a matching completed
  legacy-recovery operation for the same user; and
- rejects ambiguous identity, tenant drift, lifecycle drift, replay with
  changed input, and an equivalent completed reissue under a new idempotency
  key.

The active legacy recovery slice is owner-only. Expanding it to other roles,
multiple memberships, self-service reset, or general operator administration
requires a separate reviewed decision.

## Rationale

This is the smallest path that can recover the known legacy pilot account
without bypassing authentication or tenant isolation. A plan reference binds
human approval to the exact safe preflight result. Database environment guards
prevent Preview or Development use, while the transaction, session revocation,
forced first-login change, expiry, and idempotency controls bound the effect of
an authorised operation.

The human-entered temporary credential is a limited exception to the target
delivery architecture. Codex and the command output never receive it. The
exception expires when an approved delivery or self-service reset provider is
available.

## Consequences

- A reviewed recovery can restore one eligible legacy owner without direct
  database mutation.
- The temporary credential must be delivered outside Codex using the approved
  owner-controlled channel and changed on first login.
- The operator must retain the dry-run plan, change approval, safe operation
  reference, audit evidence, and smoke results.
- Failed transactions leave credential and sessions unchanged. A committed
  reissue is repaired by a separately approved idempotent reissue; it is not
  rolled back by restoring a previous hash.
- The command remains non-operational until a separate Production execution is
  explicitly authorised against a fresh reviewed plan.

## Alternatives Considered

- **Direct SQL/hash replacement:** rejected because it bypasses service
  validation, idempotency, audit, and session revocation.
- **Copy the Preview identity:** rejected because environment isolation is an
  explicit security boundary and tenant state may differ.
- **Use legacy provisioning:** rejected because the user and tenant already
  exist and provisioning would risk duplicate or changed ownership.
- **Email reset now:** preferred long term, but no approved provider is
  available in the current release.
- **Deactivate and recreate the user:** rejected because it destroys identity
  continuity and can invalidate ownership and audit history.

## Follow-Up

1. Retain the merge and deployment evidence produced through release governance.
2. Obtain a separate owner-approved Production change record and execute the
   runbook with a human operator.
3. Verify forced first login, tenant isolation, logout, denial behavior, audit,
   and clean Production runtime logs.
4. Replace this exceptional path with approved self-service or transactional
   credential delivery when available.
