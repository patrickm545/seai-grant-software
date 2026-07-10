# SolarGRANT Pro Identity Proving Slice

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1-1-SGP-PROVING-SLICE |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Per platform release |
| Last reviewed | 2026-07-10 |

## Summary

Prove the Identity and Organisation Foundation through SolarGRANT Pro leads. Leads are the first organisation-owned product records to consume the platform tenant boundary.

## Problem

Platform identity work must be validated through a real product workflow, not only abstract models. Leads are the smallest existing workflow that exercises ownership, reads, writes, exports, and operational screens.

## Evidence

- Leads are created by public intake and reviewed by admin/installer workflows.
- Leads contain homeowner personal data and grant-readiness data.
- Lead documents and activities inherit sensitivity from the parent lead.
- Multiple dashboards, route handlers, and server actions already operate on lead records.

## Product Scope

In scope:

- assign existing and new leads to installer organisations;
- enforce that each lead references an installer owned by the same organisation;
- scope lead list and detail views;
- scope lead workflow updates;
- scope document status updates;
- scope application pack and JSON export endpoints;
- keep public homeowner portal token access working.

Out of scope:

- changing SolarGRANT Pro domain rules;
- creating an organisation admin UI;
- replacing the homeowner portal token model;
- redesigning installer dashboards.

## Platform Classification

Module feature consuming a Clada OS platform capability.

The proving slice belongs to SolarGRANT Pro because it uses lead workflows and SEAI-specific screens. The identity and tenant mechanisms it consumes belong to Clada OS.

## User Workflow

1. Homeowner submits an intake form for an installer.
2. The lead is created with the installer's organisation owner.
3. Admin/installer review pages resolve the active organisation.
4. Lead data shown in dashboards and exports is limited to the active organisation.
5. Mutations reject records outside that organisation.

## Design Requirements

No broad UI redesign. Existing pages may show the same content, but data must be scoped server side.

## Architecture Notes

- `installerId` remains a SolarGRANT Pro relationship.
- `organisationId` becomes the platform tenant relationship.
- `Lead.installerId` and `Lead.organisationId` are enforced together with a PostgreSQL composite foreign key to `Installer(id, organisationId)`.
- Lead documents and activities are scoped through the parent lead for this release.
- Portal token access remains a customer-facing secret-link flow and is not treated as an authenticated organisation context.

## Risks

- Existing admin session maps to one default internal user until a real user provider is introduced.
- Single-installer defaults may hide tenant issues unless tests create two organisations.
- Public token flows need future permissions and audit hardening.

## Verification Plan

- Create two organisations in tests.
- Prove organisation A can access its own lead.
- Prove organisation A cannot access, modify, or delete organisation B's lead against PostgreSQL.
- Prove PostgreSQL rejects a lead whose installer belongs to another organisation.
- Prove server context rejects invalid client-supplied organisation IDs.
- Manually verify the lead dashboard, lead detail, exports, and quote pricing still work for the default installer.

## Rollout Plan

Ship as a backward-compatible migration. Existing installer IDs and lead IDs remain stable. The first release uses default organisation seed records for existing environments.

## Documentation Updates

- Platform Release 1.1 sprint record.
- SolarGRANT Pro module documentation.
- Security and GDPR documentation.
