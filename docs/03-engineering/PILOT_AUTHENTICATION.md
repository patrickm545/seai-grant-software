# SolarGRANT Pro Pilot Authentication

| Field | Value |
| --- | --- |
| Document ID | ENG-PILOT-AUTH-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Last reviewed | 2026-07-24 |

## Current-versus-target notice

This document describes current implemented pilot authentication and the legacy `pnpm pilot:provision` command. PR #29 adds temporary-credential expiry enforcement, a typed 30-minute restricted session, forced first-login password replacement, atomic owner/organisation activation, all-session rotation, and safe lifecycle audit. PR #28 provides the separate dry-run-first `pnpm tenant:provision` boundary and provisioning audit.

PR #30 adds the dry-run-first `pnpm tenant:recover` operator command for safe inspection, credential reissue, user/organisation suspension, and approved reactivation. Mutations require an active Clada internal approver, reason, idempotency key, and explicit `--execute`; exact replay is safe and mismatched or drifted replay is refused. PR #31 adds `pnpm pilot:rehearsal`, which exercises restricted login, activation, tenant isolation, suspension, recovery, expiry, reissue, rollback, audit and cleanup only on synthetic data in a positively identified local disposable PostgreSQL database.

ADR-0022 separately proposes `pnpm tenant:recover:production-credential` for the incident-bound recovery of one eligible active legacy Production owner. It is read-only by default, requires a reviewed plan and exact Production acknowledgement, accepts a temporary credential only through a hidden interactive prompt, revokes sessions, and forces the existing restricted first-login replacement flow. It does not provision or alter a tenant. The command is not authorised for Production execution while its pull request or ADR remains unapproved; follow the [Production legacy credential reissue runbook](PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md).

Real transactional-email delivery, Production provisioning execution, owner replacement, and general end-to-end Production onboarding remain deferred. The implemented flow is governed by [Clada OS Tenant Provisioning Architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md) and the [SolarGRANT Pro Pilot Organisation Onboarding Runbook](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md). No external pilot may be onboarded until that runbook's readiness gate passes.

## Approach

Pilot installers authenticate at `/login` with a normalised email address and password. Passwords are hashed with Argon2id. Successful login creates a random opaque token; only its HMAC-SHA-256 digest is stored in `AuthSession`, and the browser receives the token in an `HttpOnly`, `SameSite=Lax` cookie that is `Secure` in Production. Sessions expire after 12 hours. Logout deletes the database session and clears the cookie.

The shared `ADMIN_PASSWORD` adapter and its development defaults are retired. There is no public registration or automatic Production user creation.

## Identity and tenant rule

`Organisation` stores a unique slug, active status, and verified state. `User` stores the unique normalised email, optional password hash, active status, and last successful login. `OrganisationMembership` has a database-unique `userId`, so one user can have exactly one organisation membership; an organisation may have many users. `AuthSession` belongs to one user by foreign key.

Pilot role labels map to the existing platform roles:

- `OWNER` → `ORGANISATION_OWNER`
- `ADMIN` → `ORGANISATION_ADMIN`
- `SALES` → `ORGANISATION_MEMBER`

`requirePilotContext()` is the canonical trusted boundary. It loads the session, user, single membership, and organisation on the server and returns only the authenticated user and organisation context. It rejects inactive users, inactive memberships, non-installer organisations, inactive organisations, unverified organisations, expired sessions, and invalid relationships. Browser form fields, request bodies, query strings, and route parameters never select the effective organisation.

## Protected surfaces

Middleware performs an early cookie-presence redirect for `/admin/**` and `/installer-review-emerald/**`. The layouts then validate the database session. Protected pages, server actions, and tenant APIs call `requirePilotContext()` again at their trusted boundary. The currently protected installer APIs are `/api/leads/[id]`, `/api/submission-package`, and `/api/portal-fill-preview`.

Public homeowner intake, eligibility, and tokenised homeowner portal routes remain outside installer authentication by design.

## Environment

Copy `.env.example` and configure the existing database classification and fingerprint variables. Add:

```env
AUTH_SESSION_PEPPER="a-high-entropy-value-of-at-least-32-characters"
```

Use a different pepper in Development, Preview, and Production. Do not commit it. Missing or short values fail closed. To rotate it, deploy the new value and delete existing `AuthSession` rows; all users must sign in again.

## Provision a pilot organisation and owner

Set these temporary environment variables for the intended isolated database:

```env
PILOT_ORGANISATION_NAME="Example Solar Ltd"
PILOT_ORGANISATION_SLUG="example-solar"
PILOT_OWNER_NAME="Example Owner"
PILOT_OWNER_EMAIL="owner@example.ie"
PILOT_INSTALLER_SEAI_COMPANY_ID="SEAI-COMPANY-ID"
PILOT_INSTALLER_WEBSITE_DOMAIN="example.ie"
PILOT_INSTALLER_COUNTY="Dublin"
```

`PILOT_OWNER_PASSWORD` is also required by the current command, but no credential value is shown here. Supply it only through the currently approved secure operator process, do not persist it in a file, and do not allow it to enter terminal history or logs.

Then run:

```bash
pnpm pilot:provision
```

The command uses the database fingerprint guard, creates or updates the verified active installer organisation and installer record, creates or updates the active owner, hashes the password, and upserts the single owner membership. It is safe to rerun and never prints the password. It never runs during deployment.

Production additionally requires an explicit change record:

```env
ACKNOWLEDGE_PRODUCTION_PROVISIONING="PROVISION_VERIFIED_PILOT"
PRODUCTION_PROVISION_CHANGE_ID="approved-change-id"
```

## Disable access

After positively verifying the target database environment and fingerprint, use `pnpm tenant:recover suspend-user` or `suspend-organisation` with an ignored non-secret JSON input, dry-run review, active Clada internal approver, reason, idempotency key, and explicit execution. The command invalidates affected sessions, preserves tenant records, writes safe audit evidence, and fails closed on ambiguous or cross-tenant targets. Do not perform ad hoc SQL status edits. Context resolution fails closed even if an old cookie remains.

## Deployment

Apply `20260716183000_pilot_installer_auth` with the existing guarded Preview and Production migration commands. The migration preserves organisations, users, installers, and leads; generates deterministic unique slugs; normalises email; removes only the known synthetic shared-admin installer memberships; and aborts if any other user has multiple memberships or case-insensitive duplicate emails. Development, Preview, and Production database isolation remains unchanged.

Set `AUTH_SESSION_PEPPER` separately in every Vercel environment before deployment. Provision pilot users only after the migration is applied and status is clean.

## Known limitations and deferred work

The pilot has no self-registration, one-time invitations, general password reset, MFA, SSO, organisation switching, user-management UI, fine-grained custom roles, or session-management UI. Successful first-login replacement invalidates every existing user session and creates one rotated normal session. Recovery inspection, credential reissue, suspension, and approved reactivation are available only to Clada internal operators through the CLI; owner replacement, real email delivery, GDPR workflows, Production execution, and external pilot onboarding remain deferred.

The legacy `pnpm pilot:provision` command still has no dry-run, idempotency operation record, temporary-credential lifecycle, or approved non-logged credential-delivery integration. It can update an existing user's password and identity fields during an upsert and is not an accepted onboarding control. The standard `pnpm tenant:provision`, `pnpm tenant:recover`, and `pnpm pilot:rehearsal` commands and first-login path implement and rehearse the reviewed database lifecycle in Development/test with fake delivery only; real delivery, Production execution, owner replacement, and external onboarding remain explicit readiness gaps.
