# Platform Release 1.1 Identity and Organisation Foundation

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-1 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At release close |
| Last reviewed | 2026-07-10 |

## Purpose

Platform Release 1.1 creates the first implemented Clada OS foundation for organisations, organisation ownership, users, actors, membership, account context, and tenant-aware data boundaries.

This release proves the foundation through the smallest useful SolarGRANT Pro slice: installer-owned lead records.

## Current-State Review

Repository review on 2026-07-10 found:

- Authentication is a lightweight admin password and signed cookie flow in `lib/admin-auth.ts`.
- Middleware protects `/admin/dashboard`, `/admin/leads`, `/admin/sales-playbook`, and `/installer-review-emerald`, but API routes also need server-side checks.
- The current user model is implicit. There is no reusable `User`, `Organisation`, membership, role, or actor persistence model.
- The database uses Prisma with Postgres configured in `prisma/schema.prisma`.
- SolarGRANT Pro data ownership currently flows through `Installer` and `Lead.installerId`.
- `Lead`, `LeadDocument`, `LeadActivity`, `InstallerQuotePricing`, and `AuditLog` are the main operational records in the current slice.
- Existing lead list, detail, export, workflow, quote-pricing, and portal routes directly call Prisma.
- Tenant or organisation filtering does not exist as a reusable platform boundary.
- Public homeowner portal access is token based and remains outside authenticated organisation context for this release.
- Development and deployment assume Node 22, pnpm, Prisma, Postgres, and Vercel-compatible runtime configuration.

## Risks Found

- Admin cookie authentication does not identify a durable user record.
- Middleware is not sufficient as an authorization boundary for route handlers or server actions.
- Lead APIs can currently fetch by ID without tenant context.
- `Lead.organisationId` and `Lead.installerId` can become inconsistent unless the installer relationship also checks organisation ownership.
- Existing data lacks an organisation owner and must be migrated safely.
- Internal Clada access and installer organisation access are not yet separate concepts in implementation.
- Audit logs still use string actors and are not a complete Platform Release 1.2 audit model.

## Scope

In scope:

- organisation model;
- internal Clada organisation;
- installer organisation;
- user and organisation membership records;
- minimal actor context representation;
- server-side organisation context resolution;
- tenant-aware lead data access;
- migration of existing installers and leads to organisation ownership;
- SolarGRANT Pro lead proving slice;
- automated tests for context resolution, tenant scoping, database-backed tenant isolation, and ownership consistency;
- documentation, feature specs, ADRs, and COM updates.

Out of scope:

- full authentication replacement;
- SSO;
- invitations;
- complex roles and permissions;
- billing, subscriptions, marketplace tenancy, or partner accounts;
- full audit foundation;
- broad UI redesign;
- workflow, document, notification, AI, or reporting platform changes.

## Feature Specifications

- [Organisation Foundation](../04-features/FEAT-PLATFORM-1-1-ORGANISATION-FOUNDATION.md)
- [Actor and Membership Model](../04-features/FEAT-PLATFORM-1-1-ACTOR-MEMBERSHIP-MODEL.md)
- [Tenant-Aware Data Access](../04-features/FEAT-PLATFORM-1-1-TENANT-AWARE-DATA-ACCESS.md)
- [SolarGRANT Pro Identity Proving Slice](../04-features/FEAT-PLATFORM-1-1-SOLARGRANT-PRO-IDENTITY-PROVING-SLICE.md)

## Architecture Decisions

- [ADR-0002: Organisation Is The Initial Tenant Boundary](../05-decisions/ADR-0002-organisation-tenant-model.md)
- [ADR-0003: Minimal Actor And Membership Model](../05-decisions/ADR-0003-actor-and-membership-model.md)
- [ADR-0004: Adapt Existing Admin Authentication Into Identity Context](../05-decisions/ADR-0004-existing-authentication-integration.md)
- [ADR-0005: Tenant-Aware Data Access Defaults To Denial](../05-decisions/ADR-0005-tenant-aware-data-access.md)
- [ADR-0006: Assign Existing SolarGRANT Pro Data To Installer Organisations](../05-decisions/ADR-0006-existing-data-migration.md)

## Implementation Plan

1. Add organisation, user, and membership persistence models.
2. Link `Installer` and `Lead` to an organisation owner.
3. Create a migration that preserves existing installer and lead records.
4. Add a small identity service for actor and organisation context resolution.
5. Add scoped lead access helpers.
6. Update lead list, detail, export, quote-pricing, and mutation paths to use organisation context.
7. Keep homeowner portal token access unchanged except where records already inherit organisation ownership through their lead.
8. Add tests for membership validation, invalid organisation requests, tenant-scoped queries, migration assumptions, database-backed tenant isolation, and lead/installer ownership consistency.
9. Run lint, type checking, Prisma validation/generation, tests, build, documentation checks, and `git diff --check`.

## SolarGRANT Pro Proving Slice

The proving slice is SolarGRANT Pro leads.

Why this slice:

- leads are real existing product records;
- leads already represent customer and installer operational data;
- leads are read, exported, mutated, and shown in dashboards;
- existing `installerId` ownership can be migrated into organisation ownership without unrelated product refactoring;
- cross-organisation access can be tested cleanly.

Success criteria:

- every lead has an `organisationId`;
- lead creation derives organisation ownership from the server-side installer record;
- PostgreSQL enforces that a lead's installer belongs to the same organisation as the lead;
- lead reads and writes require active organisation context;
- a user without membership in another organisation cannot access that organisation's lead;
- client-supplied organisation identifiers cannot bypass membership validation.

## Integration Test Database

Database-backed tenant isolation tests run with `pnpm test:integration:postgres` and require a disposable PostgreSQL database through `TEST_DATABASE_URL`.

Local validation used PostgreSQL 18 with database `clada_platform_11_test`. The runner maps `TEST_DATABASE_URL` to Prisma `DATABASE_URL`, applies all migrations with `prisma migrate deploy`, then executes `tests/integration/**/*.test.ts`.

Setup details are documented in [PostgreSQL Integration Tests](../03-engineering/POSTGRES_INTEGRATION_TESTS.md).

## Security And GDPR Notes

- Organisation boundaries are a security requirement.
- Client-supplied organisation IDs must be validated against server-side membership records.
- Missing or invalid context must fail closed.
- Cross-organisation failures should not disclose whether a target record exists.
- Existing audit logs remain a known limitation until Platform Release 1.2.
- Personal homeowner data remains limited to the existing SolarGRANT Pro workflow.

## Capability Maturity Target

| Capability | Starting maturity | Target maturity |
| --- | --- | --- |
| Identity and Organisation Foundation | L1 Documented | L4 Production Ready |

L5 is not in scope because reuse has not yet been proven across two product modules.

## Definition Of Done

This release is done when:

- feature specifications and ADRs are present and linked;
- database migration preserves existing SolarGRANT Pro data;
- organisation context is enforced for the lead proving slice;
- automated unit and database-backed tenant-isolation tests pass;
- COM indexes and relevant architecture/security/product docs are updated;
- validation results are recorded in the PR;
- a PR is opened to `main` and not merged.

## Related Documents

- [Platform Execution Model and Roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md)
- [Platform Capability Map](../01-platform/PLATFORM_CAPABILITY_MAP.md)
- [Security and GDPR](../engineering/security-and-gdpr.md)
- [Architecture Overview](../03-engineering/ARCHITECTURE_OVERVIEW.md)
- [SolarGRANT Pro Module](../01-product/SOLARGRANT_PRO_MODULE.md)
