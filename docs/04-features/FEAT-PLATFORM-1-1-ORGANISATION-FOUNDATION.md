# Organisation Foundation

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-1-ORG |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Create the minimum Clada OS organisation model needed to represent internal Clada operations and installer organisations. The organisation is the first tenant boundary for platform-owned records.

## Problem

SolarGRANT Pro currently owns data through installer records. That is useful for the first module, but it is not a reusable platform identity boundary. Future users, permissions, audit, documents, notifications, AI, and reporting all need a stable organisation owner.

## Evidence

- `Installer` exists but no platform-neutral organisation model exists.
- `Lead.installerId` currently owns SolarGRANT Pro lead records.
- Platform Release 1.0 identifies Identity and Organisation Foundation as the first implementation dependency.
- API and server action reads currently query lead IDs directly.

## Product Scope

In scope:

- `Organisation` persistence model;
- organisation type for Clada internal and installer organisations;
- organisation status;
- organisation ownership on installer and lead records;
- default internal Clada organisation and default installer organisation seed data.

Out of scope:

- multi-level organisation hierarchies;
- billing accounts;
- customer self-service organisation creation;
- partner accounts;
- marketplace tenancy.

## Platform Classification

Clada OS platform capability.

The organisation model is reusable platform infrastructure because tenant boundaries, account ownership, membership, permissions, audit, documents, notifications, AI governance, and reporting all depend on it.

## User Workflow

Current user-facing workflows should remain mostly unchanged:

1. Homeowner submits a SolarGRANT Pro lead for an installer.
2. The server derives the owning organisation from the installer.
3. Admin and installer review screens resolve an active organisation context.
4. Lead records are read and written only within that organisation context.

## Design Requirements

Only minimal UI changes are allowed. The first release may show organisation context only where it helps operations or verification.

## Architecture Notes

- Organisation is the tenant boundary for organisation-owned records.
- Installer remains the SolarGRANT Pro domain entity.
- Installer links to organisation through a required `organisationId`.
- Lead links to organisation through a required `organisationId`.
- Existing leads receive organisation ownership by joining through their current installer.

## Risks

- Ambiguous account, installer, company, and organisation terminology.
- Existing records may not have a matching installer if data is already inconsistent.
- Overbuilding commercial account concepts before billing and packages are validated.

## Verification Plan

- Prisma schema validation.
- Migration SQL review.
- Tests for required ownership constraints and migration assumptions.
- Tenant isolation tests through scoped lead access helpers.
- Manual check that existing lead dashboards still load in default organisation context.

## Rollout Plan

Apply the migration before deploying application code that expects `organisationId`. Preserve existing installer and lead IDs. Roll back by restoring from database backup if ownership migration fails.

## Documentation Updates

- Platform Release 1.1 sprint record.
- ADRs for tenant model and migration.
- Platform capability map maturity.
- Security and GDPR notes.
