# SolarGRANT Pro Pilot Authentication

| Field | Value |
| --- | --- |
| Document ID | ENG-PILOT-AUTH-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Last reviewed | 2026-07-16 |

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
PILOT_OWNER_PASSWORD="a-unique-password-of-at-least-12-characters"
PILOT_INSTALLER_SEAI_COMPANY_ID="SEAI-COMPANY-ID"
PILOT_INSTALLER_WEBSITE_DOMAIN="example.ie"
PILOT_INSTALLER_COUNTY="Dublin"
```

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

After positively verifying the target database environment and fingerprint, disable a user by setting `User.status` to `INACTIVE` and deleting that user's `AuthSession` rows. Disable an entire installer by setting `Organisation.status` to `INACTIVE`, or suspend verification by setting `Organisation.verified` to `false`; delete sessions for its members when immediate revocation is required. Context resolution fails closed even if an old cookie remains.

## Deployment

Apply `20260716183000_pilot_installer_auth` with the existing guarded Preview and Production migration commands. The migration preserves organisations, users, installers, and leads; generates deterministic unique slugs; normalises email; removes only the known synthetic shared-admin installer memberships; and aborts if any other user has multiple memberships or case-insensitive duplicate emails. Development, Preview, and Production database isolation remains unchanged.

Set `AUTH_SESSION_PEPPER` separately in every Vercel environment before deployment. Provision pilot users only after the migration is applied and status is clean.

## Known limitations and deferred work

The pilot has no self-registration, invitations, password reset, MFA, SSO, organisation switching, user-management UI, fine-grained custom roles, or session-management UI. Password changes invalidate neither other sessions nor all devices automatically; an operator can delete the user's sessions when rotating a password. These capabilities are deferred until pilot evidence justifies them.
