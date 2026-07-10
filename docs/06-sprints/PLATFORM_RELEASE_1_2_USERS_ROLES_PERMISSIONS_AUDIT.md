# Platform Release 1.2 Users, Roles, Permissions and Audit Foundation

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-2 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-10 |

## Purpose

Platform Release 1.2 introduces the minimum reusable Clada OS authorisation and audit foundation required for secure multi-user operation.

The release must remain product-neutral at the platform layer while proving the capability through one real SolarGRANT Pro workflow.

## Approved Baseline

This release starts from the approved `main` branch at `architecture-checkpoint-1`.

Approved prior tags:

- `platform-release-1.1`
- `architecture-checkpoint-1`

The current branch for this release is `codex/platform-release-1-2-users-roles-permissions-audit`.

## Current-State Assessment

Repository review on 2026-07-10 found the following implementation state from Platform Release 1.1.

### What Already Exists

- `Organisation`, `User`, and `OrganisationMembership` are implemented in Prisma.
- `OrganisationMembership` validates active user, active organisation, active membership, and requested organisation context.
- `ActorContext` supports `human_user`, `system`, and `service` runtime actors.
- The current admin-password session is adapted to `user_clada_admin`.
- The default installer has an installer organisation and default admin membership.
- `Installer` and `Lead` are organisation-owned.
- PostgreSQL enforces lead and installer ownership consistency through a composite foreign key.
- `lead-access` helpers scope leads, lead documents, and lead activity through active organisation context.
- Tenant-scoped lead reads and mutations are covered by unit and PostgreSQL integration tests.
- Public homeowner portal routes operate through token-scoped lead lookup outside authenticated organisation membership.
- `AuditLog` exists, but attribution is string-based.
- `LeadActivity` exists, but actor attribution is string-based.

### What Is Temporary

- The admin authentication adapter does not identify a real login provider user.
- `user_clada_admin` and its installer memberships are bootstrap compatibility records.
- `OrganisationMembership.isOwner` is a Platform Release 1.1 ownership marker, not a full role model.
- `AuditLog.actor`, `LeadActivity.createdBy`, and `LeadActivity.createdByRole` remain compatibility attribution fields.
- Public token activity uses string labels and must remain narrowly token-scoped until a fuller customer identity model exists.

### What Must Be Retained

- Organisation remains the tenant and operational ownership boundary.
- Existing lead and installer ownership guarantees must not be weakened.
- Client-supplied organisation, role, permission, user, or membership values must not be authoritative.
- Public token workflows must remain separate from authenticated organisation membership.
- The current authentication adapter must remain compatible until a future auth provider release replaces it.
- Existing historical audit and activity rows must remain readable.

### What Should Be Extended

- `OrganisationMembership` should gain a small platform role assignment.
- Roles should map to permissions through server-side catalogue code.
- Server actions and route handlers should call reusable authorisation helpers before protected mutations.
- `AuditLog` should gain typed actor, organisation, membership, resource, outcome, and source fields.
- New audit writes should use typed actor context while preserving legacy fields for read compatibility.
- The SolarGRANT Pro stage-change workflow should be protected by permission checks and typed audit events.

### What Must Not Be Coupled To SolarGRANT Pro

- Role names must not contain solar, grant, installer workflow, SEAI, or lead-stage language.
- Permission naming must describe platform actions and resource families, not job titles.
- Audit actor types and outcomes must be reusable across modules.
- Internal administrative access must be explicit, permission-controlled, and auditable rather than implied by the Clada internal organisation.

### Conflicts With Approved Architecture

No conflict was found that requires replacing the Platform Release 1.1 foundation.

Open hardening work exists where expected by Architecture Checkpoint 1:

- string-based audit attribution must be wrapped or replaced;
- permission checks are not yet enforced for a protected workflow;
- internal admin access is still modelled through bootstrap membership;
- public token flows need explicit documentation as non-membership access.

## Feature Specifications

- [Platform Role Foundation](../04-features/FEAT-PLATFORM-1-2-ROLE-FOUNDATION.md)
- [Platform Permission Model](../04-features/FEAT-PLATFORM-1-2-PERMISSION-MODEL.md)
- [Authorisation Service and Enforcement](../04-features/FEAT-PLATFORM-1-2-AUTHORISATION-SERVICE.md)
- [Actor-Aware Audit Foundation](../04-features/FEAT-PLATFORM-1-2-ACTOR-AWARE-AUDIT-FOUNDATION.md)
- [SolarGRANT Pro Protected Workflow Proving Slice](../04-features/FEAT-PLATFORM-1-2-SOLARGRANT-PRO-PROTECTED-WORKFLOW.md)

## Architecture Decisions

- [ADR-0007: Platform Role and Permission Model](../05-decisions/ADR-0007-role-and-permission-model.md)
- [ADR-0008: Authorisation Enforcement Boundary](../05-decisions/ADR-0008-authorisation-enforcement-boundary.md)
- [ADR-0009: Actor-Aware Audit Model](../05-decisions/ADR-0009-actor-aware-audit-model.md)
- [ADR-0010: Internal Administrative Access](../05-decisions/ADR-0010-internal-administrative-access.md)

## Implementation Plan

1. Add a small platform role enum to organisation memberships.
2. Preserve `isOwner` while assigning initial roles through a documented migration rule.
3. Add a product-neutral permission catalogue and role-to-permission mapping.
4. Add default-deny permission evaluation helpers.
5. Add organisation-resource authorisation helpers for lead-owned resources.
6. Add typed audit-event fields while preserving legacy audit columns.
7. Add a typed audit writer and compatibility strategy for legacy writes.
8. Protect SolarGRANT Pro lead pipeline stage changes with `lead.change_status`.
9. Add unit tests for roles, permissions, default-deny behaviour, and audit construction.
10. Add PostgreSQL integration tests proving the protected workflow accepts permitted actors and rejects unauthorized, cross-organisation, inactive, and unauthenticated actors.
11. Update COM, sprint, release, debt, security, and product documentation.
12. Run validation and open a draft pull request to `main`.

## Schema and Migration Plan

Planned database changes:

- add a platform role enum;
- add `OrganisationMembership.role` with a safe default;
- backfill owner memberships to owner role;
- backfill the default internal user to explicit internal and installer organisation roles;
- add actor, organisation, membership, resource, outcome, and source fields to `AuditLog`;
- add optional actor attribution fields to `LeadActivity` where useful for compatibility;
- backfill audit organisation and resource values from existing lead ownership where possible;
- keep existing string fields until all legacy writes are migrated.

Rollback and recovery:

- the migration must not delete existing audit or activity rows;
- new nullable audit fields allow rollback by ignoring typed columns;
- role values are additive and can be reviewed without fabricating real users;
- if role backfill fails, deployment should stop before application code relies on permissions.

## Implementation Summary

Implemented Platform Release 1.2 foundation:

- `PlatformRole` enum and `OrganisationMembership.role`;
- explicit bootstrap role migration for `user_clada_admin`;
- product-neutral permission catalogue in `lib/permissions.ts`;
- default-deny permission checks;
- lead action authorisation helper in `lib/authorization.ts`;
- typed audit writer and metadata sanitisation in `lib/audit.ts`;
- typed `AuditLog` attribution fields and compatibility wrapper;
- optional typed `LeadActivity` actor attribution fields;
- SolarGRANT Pro `changeLeadPipelineStage` service boundary in `lib/lead-workflow.ts`;
- `updateLeadPipelineStage` server action refactored to use the protected service.

## Migration Details

Migration:

`prisma/migrations/20260710130000_users_roles_permissions_audit/migration.sql`

Role strategy:

- owner memberships become `ORGANISATION_OWNER`;
- `membership_clada_admin_internal` becomes `CLADA_INTERNAL_ADMIN`;
- default admin installer memberships become `ORGANISATION_ADMIN`;
- all other memberships default to `ORGANISATION_MEMBER`;
- `isOwner` is retained for compatibility.

Audit strategy:

- historical lead audit rows are backfilled to `resourceType = lead` and `resourceId = leadId`;
- historical audit `organisationId` is derived from `Lead.organisationId` where possible;
- historical `actorType` is inferred from legacy actor strings;
- `outcome` defaults to `SUCCEEDED`;
- rows without enough context keep nullable typed fields and legacy strings.

## SolarGRANT Pro Proving Slice

The selected proving slice is changing a lead's pipeline stage.

Why this slice:

- it is already in operational use;
- it mutates meaningful customer and installer workflow data;
- it already writes activity and audit records;
- it can prove membership, permission checks, tenant isolation, and actor-aware audit without broad UI redesign;
- it avoids embedding solar-specific concepts into generic platform roles or audit models.

Success criteria:

- a permitted organisation member can change a lead stage;
- a same-organisation member without `lead.change_status` is denied;
- a member of another organisation is denied;
- missing actor or organisation context is denied;
- inactive user or membership is denied;
- client-supplied role or permission values cannot bypass enforcement;
- denied actions do not mutate the lead;
- successful actions create typed, organisation-aware audit events.

## Automated Tests Added

- `tests/platform/permissions.test.ts`
- `tests/platform/audit.test.ts`
- `tests/integration/lead-stage-permissions.integration.test.ts`

Expanded tests:

- `tests/platform/identity.test.ts`
- `tests/platform/migration-sql.test.ts`

PostgreSQL proving-slice coverage:

- permitted user can change lead stage;
- restricted same-organisation user is denied;
- cross-organisation user is denied;
- missing actor context is denied;
- inactive user is denied;
- inactive membership is denied;
- client-supplied permission values cannot bypass enforcement;
- denied actions do not mutate the lead;
- successful action writes typed audit and activity attribution;
- lead and installer ownership consistency remains covered by existing PostgreSQL tests.

## Public Token Workflow Stance

Public homeowner portal routes remain token-scoped and outside authenticated organisation membership.

They must not gain organisation permissions. Token routes may write audit events as public-token actors when useful, but they do not become organisation members.

## Security Review Checklist

- privilege escalation through client-supplied roles or permissions;
- cross-organisation lead access;
- inactive user, membership, and organisation denial;
- default-deny missing permission behaviour;
- public token separation from organisation membership;
- explicit internal administrative access;
- safe unavailable errors for cross-tenant resources;
- audit metadata minimisation;
- preservation of historical audit records;
- direct Prisma paths reviewed for protected workflow bypasses.

## Capability Maturity Target

| Capability | Starting maturity | Target maturity |
| --- | --- | --- |
| Users, roles, and permissions | L1 Documented | L4 only if implementation, tests, migration, and review pass |
| Audit and activity foundation | L1 Documented | L4 only if typed audit writes, compatibility, and tests pass |

Neither capability may be marked L5 in this release.

## Capability Maturity Achieved

| Capability | Achieved maturity | Evidence |
| --- | --- | --- |
| Users, roles, and permissions | L3 implemented; L4 candidate after PR review and production migration validation | Schema, migration, permission catalogue, service boundary, unit tests, and PostgreSQL proving-slice tests. |
| Audit and activity foundation | L3 implemented; L4 candidate after PR review and production migration validation | Typed audit schema, migration backfill, typed audit writer, metadata sanitisation, compatibility wrapper, and proving-slice typed audit event. |

L5 is not achieved because reuse across two genuinely separate product modules has not been proven.

## Validation Results

Validation run on 2026-07-10 under portable Node `v22.23.1` and pnpm `10.11.0`:

| Check | Result | Notes |
| --- | --- | --- |
| Frozen dependency installation | Passed | `corepack pnpm install --frozen-lockfile` |
| Prisma format | Passed | `corepack pnpm exec prisma format` |
| Prisma validate | Passed | Reran with explicit disposable PostgreSQL `DATABASE_URL`. |
| Prisma generate | Passed | `corepack pnpm exec prisma generate` |
| Migration status | Passed | Disposable PostgreSQL database `clada_platform_12_test` reported schema up to date after deploy. |
| Migration deployment | Passed | `pnpm test:integration:postgres` applied all 9 migrations to a freshly recreated disposable PostgreSQL database. |
| Unit tests | Passed | 24 platform tests passed. |
| PostgreSQL integration tests | Passed | 3 integration tests passed against disposable database `clada_platform_12_test`. |
| Type checking | Passed | `corepack pnpm typecheck` |
| Lint | Passed | `corepack pnpm lint` |
| Production build | Passed | `corepack pnpm build` |
| Document metadata validation | Passed | 92 Markdown files checked. |
| Markdown internal-link validation | Passed | 92 Markdown files checked. |
| COM navigation validation | Passed | Numbered COM Markdown files are listed from `docs/SUMMARY.md`. |
| Placeholder scan | Passed | Templates and the documented date-format example in `DOCUMENTATION_STANDARD.md` were allowlisted. |
| `git diff --check` | Passed | Git reported CRLF conversion warnings only, with no whitespace errors. |

## Definition Of Done

This release is done when:

- feature specifications and ADRs are present and linked;
- migrations preserve existing data;
- role and permission checks are enforced server side for the proving slice;
- actor-aware audit events are written for successful proving-slice actions;
- unit and PostgreSQL integration tests pass or are explicitly caveated;
- COM indexes and relevant platform, product, engineering, security, debt, and sprint docs are updated;
- validation results are recorded;
- a draft PR is opened to `main` and not merged.

## Related Documents

- [Platform Execution Model and Roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md)
- [Platform Capability Map](../01-platform/PLATFORM_CAPABILITY_MAP.md)
- [Architecture Checkpoint 1](ARCHITECTURE_CHECKPOINT_1.md)
- [Technical Debt Register](../03-engineering/TECHNICAL_DEBT_REGISTER.md)
- [Security and GDPR](../engineering/security-and-gdpr.md)
