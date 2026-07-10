# Architecture Overview

| Field | Value |
| --- | --- |
| Document ID | ENG-ARCH-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-10 |

This document summarises the current architecture and the direction for evolving SolarGRANT Pro into a module on Clada OS.

## Current Stack

- Next.js application
- React UI components
- Prisma data access
- Postgres database
- Server routes under `app/api`
- Admin and installer review workflows
- Optional integrations for email, SMS, and OpenAI-assisted analysis
- Platform identity foundation with organisation, user, membership, and tenant-scoped lead access

## Current Public Flow

1. Homeowner visits an installer or module-facing page.
2. Intake form posts to `/api/intake`.
3. Rules-based eligibility checks run immediately.
4. AI may enhance the eligibility summary when configured.
5. A lead is stored and marked for application readiness or review.

## Current Admin Flow

1. Admin or installer reviews the lead.
2. Supporting documents may be parsed through AI-assisted extraction.
3. A submission package can be prepared.
4. Homeowner review and approval remain part of the workflow.
5. A human completes final portal submission steps where required.

## Platform Direction

As Clada OS matures, shared concerns should become explicit platform capabilities:

- identity and role-aware access
- lead and customer records
- workflow state machines
- document collection and audit trails
- communications
- module configuration
- human-reviewed automation boundaries
- reporting and operational metrics

## Platform Release 1.1 Identity Foundation

The first implemented platform identity slice introduces:

- `Organisation` as the tenant and operational ownership boundary;
- `User` as the durable human identity record;
- `OrganisationMembership` as the server-side validation link between users and organisations;
- runtime actor context for human, system, and future service actors;
- organisation ownership on installers and leads;
- lead data access helpers that require active organisation context.

Existing admin authentication remains in place. It is adapted to a default internal user for this release and should not be mistaken for the full users, roles, permissions, and audit foundation planned for Platform Release 1.2.

## Platform Release 1.2 Authorisation And Audit Foundation

The next implemented platform security slice introduces:

- platform roles on organisation memberships;
- a product-neutral permission catalogue;
- role-to-permission mapping in server-side platform code;
- default-deny permission evaluation;
- protected service boundaries that check both action permission and organisation-owned resource access;
- typed audit fields for actor type, organisation, membership, user, resource, source, and outcome;
- a compatibility audit writer so historical string-based audit records remain readable;
- a SolarGRANT Pro proving slice that protects lead pipeline-stage changes.

Internal administrative access remains explicit through organisation memberships. Membership in the Clada internal organisation alone does not grant access to installer-owned data.

Do not prematurely split the application into services. Extract reusable boundaries when there is a clear maintenance, reliability, or product reason.

The canonical platform architecture, capability taxonomy, dependency map, and evolution policy are maintained in [../01-platform/README.md](../01-platform/README.md).

## Safe Automation Stance

Browser automation or portal automation may be considered only after:

1. user consent is captured,
2. submitted fields are frozen in an audit log,
3. applicable SEAI terms and data protection obligations are reviewed,
4. the workflow keeps a human accountable for submission accuracy.

## What Next

Architecture changes should be recorded in ADRs under `docs/05-decisions/` and linked from relevant feature specifications and sprint documents.
