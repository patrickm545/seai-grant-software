# SolarGRANT Pro Module

| Field | Value |
| --- | --- |
| Document ID | PROD-SGP-001 |
| Status | Active |
| Owner | Clada Systems Product |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-21 |

SolarGRANT Pro is the first product module built on Clada OS. It focuses on Irish solar grant workflows and the operational needs of solar installers.

## Current Module Scope

The current repository supports:

- homeowner lead intake
- grant eligibility checks
- installer-facing review workflows
- document collection and preparation
- submission package support
- admin and installer dashboards
- optional AI assistance for summaries and document extraction
- organisation-owned lead records through the Clada OS identity foundation
- Republic of Ireland-only routing for the SEAI grant-assistance journey, with a dedicated unsupported Northern Ireland outcome

## Module Boundary

SolarGRANT Pro may use solar-specific terminology, SEAI grant rules, installer workflow details, and customer-facing copy. Those details should not be presented as the identity of Clada Systems or the full Clada OS platform.

Canonical module boundary rules are defined in [../01-platform/MODULE_ARCHITECTURE.md](../01-platform/MODULE_ARCHITECTURE.md) and [../01-platform/PRODUCT_COMPOSITION.md](../01-platform/PRODUCT_COMPOSITION.md).

## Platform Learning

SolarGRANT Pro should teach Clada OS which capabilities need to become reusable. Examples include intake workflows, customer portals, audit logs, document review, and dashboard patterns.

## Platform Release 1.1 Consumption

SolarGRANT Pro consumes the Clada OS Identity and Organisation Foundation through the lead workflow:

- installers remain the SolarGRANT Pro business entity;
- installer organisations become the platform tenant owner;
- lead records keep `installerId` and gain organisation ownership;
- lead reads, exports, and workflow mutations resolve organisation context server side;
- homeowner portal token access remains a customer-facing secret-link flow for this release.

## Platform Release 1.2 Consumption

SolarGRANT Pro consumes the Clada OS users, permissions, and audit foundation through the lead pipeline-stage workflow:

- organisation memberships now carry platform roles;
- the stage-change server action requires the `lead.change_status` permission through a reusable service boundary;
- same-organisation restricted users, cross-organisation users, inactive users, inactive memberships, and missing actor context are denied server side;
- successful stage changes write typed audit attribution with organisation, membership, user, resource, source, and outcome fields;
- public homeowner portal token routes remain token-scoped and do not become organisation memberships.

## Platform Release 1.3 Consumption

SolarGRANT Pro consumes the Clada OS Workflow Foundation through the lead pipeline-stage workflow:

- the lead pipeline has a platform workflow definition, stages, transitions, instances, and history;
- lead stage changes are validated and executed through the reusable workflow service;
- successful stage changes write workflow transition history linked to the audit event;
- `Lead.pipelineStage` remains as a compatibility projection for current UI, portal progress, and reporting surfaces;
- SolarGRANT Pro retains lead labels, domain language, and product activity entries.

## Republic Of Ireland Grant Routing

SolarGRANT Pro owns the active jurisdiction policy for its SEAI workflow:

- county is the authoritative pilot routing fact; Eircode is optional supporting format evidence and `BT` is an explicit Northern Ireland conflict signal;
- all 32 counties remain selectable, but Northern Ireland stops on the property step before later contact, consent, calculation, AI, or persistence work;
- the intake and direct eligibility APIs return stable safe contracts before lookups and side effects;
- eligibility, quote, AI, submission-package, portal-fill, CRM, notification, portal, dashboard, pack, and export boundaries fail closed or use the shared jurisdiction-safe presentation adapter;
- historical source facts remain unchanged and tenant scoped while unsafe stored SEAI conclusions are suppressed at read time;
- the aggregate jurisdiction audit is read-only, environment guarded, and never prints homeowner data.

This product rule does not add a country selector, geocoding, a Northern Ireland grant workflow, a database migration, or regional configuration to Clada OS.

## What Next

Future SolarGRANT Pro features should include a feature specification and note whether any part of the work should become reusable Clada OS infrastructure.
