# Architecture Overview

| Field | Value |
| --- | --- |
| Document ID | ENG-ARCH-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-21 |

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
2. The SolarGRANT Pro client classifies the property county and optional Eircode before previews or later intake steps.
3. Intake posts to `/api/intake`, where the same deterministic jurisdiction guard runs immediately after request-shape parsing and before lookups or side effects.
4. Supported Republic of Ireland input proceeds to rules-based eligibility and quote calculation; AI may enhance the summary when configured.
5. A supported lead is stored and marked for application readiness or review. Northern Ireland receives the unsupported route and contradictory explicit signals require correction without creating a lead.

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

## Platform Release 1.3 Workflow Foundation

The workflow slice introduces:

- workflow definitions, stages, transitions, instances, and history;
- data-backed server-side transition validation;
- workflow execution integrated with organisation context and permission checks;
- workflow-aware audit metadata and audit-linked transition history;
- a SolarGRANT Pro proving slice that routes lead pipeline-stage changes through the workflow service.

SolarGRANT Pro keeps lead-specific labels and `Lead.pipelineStage` as a compatibility projection during this release. The generic workflow service must not import SolarGRANT Pro business rules.

## SolarGRANT Pro Jurisdiction Boundary

Republic of Ireland SEAI routing is implemented as a SolarGRANT Pro domain boundary, not a Clada OS regional capability. A canonical classifier owns county sets, normalisation, reviewed location-code formats, typed outcomes, and reason codes. API routes and calculation/AI services require a supported classifier result before grant-bearing work.

Stored scalar county and Eircode facts remain the jurisdiction source. A single read-time adapter treats stored eligibility, quote, and export JSON as historical snapshots, suppresses unsafe conclusions, and exposes an unsupported or location-review state without changing tenant ownership or source values. Current tenant-scoped APIs, dashboards, lead views, portal, application pack, submission and portal-fill outputs, scoring, reporting, and notification boundaries consume this rule. No persistence field or migration is required.

Operational evidence for rejected public requests contains only safe request, installer, outcome, and reason identifiers. Historical evidence is available through a fixed read-only aggregate command protected by the existing database identity and Production acknowledgement controls.

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
