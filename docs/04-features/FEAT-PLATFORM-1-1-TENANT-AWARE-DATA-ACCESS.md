# Tenant-Aware Data Access

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-1-TENANT-ACCESS |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Introduce a small, explicit tenant-aware access pattern for organisation-owned data. The first implementation covers SolarGRANT Pro leads.

## Problem

Current lead reads and writes can query by record ID without organisation context. That creates cross-tenant exposure risk as soon as more than one installer organisation exists.

## Evidence

- Lead dashboards use direct `prisma.lead.findMany`.
- Lead detail, submission package, and portal fill preview endpoints use direct lead ID reads.
- Server actions update leads and documents by ID after existence checks, but without organisation context.
- Middleware does not protect all API routes and should not be the only authorization layer.

## Product Scope

In scope:

- active organisation context resolution;
- default-deny behaviour for missing or invalid context;
- lead read scoping by organisation;
- lead write scoping by organisation;
- tests for cross-organisation rejection;
- safe generic error behaviour.

Out of scope:

- database row-level security;
- broad repository rewrite;
- all future product modules;
- full permissions;
- public homeowner portal redesign.

## Platform Classification

Clada OS platform capability with shared-service implementation support.

The tenant rule is platform security behavior. The initial TypeScript helper implementation is a shared service pattern that future platform capabilities can extend.

## User Workflow

1. Server resolves active actor and organisation.
2. Data access helpers add organisation scoping to reads and writes.
3. Missing records and cross-organisation records are handled as unavailable.
4. Mutations reject if the record is not owned by the active organisation.

## Design Requirements

Unauthorized and missing states should be safe and plain. Do not reveal whether a record exists in another organisation.

## Architecture Notes

- Client-supplied organisation IDs are never trusted by themselves.
- Organisation membership is validated server side before data access.
- Lead ownership is stored directly on `Lead.organisationId`.
- Document and activity access is scoped through the parent lead.
- Direct Prisma access remains allowed for unowned platform setup and seed paths, but organisation-owned workflow paths should use scoped helpers.

## Risks

- Some direct Prisma calls may remain in legacy or public-token contexts.
- Server action authorization must be explicit because middleware is not enough.
- Audit logs still need a deeper organisation-aware model in Platform Release 1.2.

## Verification Plan

- Unit tests for organisation context resolution.
- Unit tests for scoped lead where clauses.
- Tests proving organisation A cannot read or modify organisation B's lead.
- Migration checks for non-null lead ownership.
- Manual checks for lead dashboard, lead detail, export JSON, quote pricing, and portal token workflows.

## Rollout Plan

Deploy schema and code together after migration validation. Keep the scope to leads so security review remains tractable.

## Documentation Updates

- Tenant-aware data access ADR.
- Security and GDPR documentation.
- Engineering architecture overview.
