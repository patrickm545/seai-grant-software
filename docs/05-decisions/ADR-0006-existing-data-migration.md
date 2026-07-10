# ADR-0006: Assign Existing SolarGRANT Pro Data To Installer Organisations

| Field | Value |
| --- | --- |
| Document ID | ADR-0006 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Before production migration |
| Last reviewed | 2026-07-10 |

## Context

Existing installers and leads do not have a platform organisation owner. Leads are currently owned through `Lead.installerId`. Platform Release 1.1 adds a required `organisationId` to installers and leads.

## Decision

Existing data will be migrated by deriving organisation ownership from the current installer relationship.

The migration will:

- create a default Clada internal organisation;
- create a default internal user and membership;
- create one installer organisation for each existing installer;
- assign each installer to its organisation;
- assign each existing lead to its installer's organisation;
- validate that each lead's installer belongs to the same organisation;
- make installer and lead organisation ownership required after backfill;
- add a composite unique key on `Installer(id, organisationId)` and a composite foreign key from `Lead(installerId, organisationId)` to that key;
- remove stale database defaults from `updatedAt` columns that Prisma models as `@updatedAt` so migration/schema validation remains clean.

## Rationale

This preserves existing data without inventing arbitrary lead ownership. The current installer relationship is the best available source of truth for SolarGRANT Pro records.

## Consequences

Improves:

- every existing lead receives an organisation owner;
- future mismatched lead/installer organisation ownership is rejected at the database layer;
- installer and lead IDs remain stable;
- migration rule is explicit and reviewable.

Becomes harder:

- existing inconsistent data with missing installers or mismatched lead/installer organisation ownership would block the migration;
- production migration needs a backup and validation query.

## Alternatives Considered

- Assign all records to a single arbitrary tenant: rejected because it hides installer ownership.
- Leave `organisationId` nullable indefinitely: rejected because leads are genuinely organisation-owned.
- Require manual production data editing before migration: rejected unless validation finds inconsistent records.

## Follow-Up

- Add migration SQL with staged backfill and non-null enforcement.
- Add migration SQL with ownership-consistency validation and composite foreign-key enforcement.
- Add tests that inspect migration assumptions and PostgreSQL integration tests that prove constraint enforcement.
- Record production backup and migration validation in the PR before deployment.
