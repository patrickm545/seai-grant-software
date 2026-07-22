# Platform Release 1.5 - Unified Lead Workspace

| Field | Value |
| --- | --- |
| Document ID | FEAT-PLATFORM-1.5-WORKSPACE |
| Status | Approved |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Platform Release 1.5 and pilot feedback |
| Last reviewed | 2026-07-22 |

## Summary

Create one canonical SolarGRANT Pro workspace for each lead, with a persistent lead summary and local navigation for Overview, Documents, Activity, Tasks, and Notes. This is the primary installer working environment and a composition of existing Clada OS capabilities, not a new platform aggregate.

## Problem

Lead work is fragmented across inconsistent routes, shells, sections, tables, and actions. Installers cannot reliably scan the current state and next action, particularly on a phone, without context switching.

## Evidence

- Product UX audit findings PUX-015, PUX-017, PUX-018, PUX-019, PUX-020, PUX-026, PUX-027, and PUX-030.
- Existing lead detail already contains customer, property, workflow, follow-up, notes, document, quote, portal, and pack controls.
- Canonical design principles require operational clarity, professional trust, accessibility, and durable daily use.

## Product Scope

In scope:

- one canonical authenticated lead route and shared installer shell;
- persistent lead header with identity, stage, readiness context, owner when reliable, and next action;
- Overview, Documents, Activity, Tasks, and Notes navigation;
- direct contact actions and approved workflow actions;
- stable deep links, breadcrumbs/back navigation, responsive layout, and truthful states;
- safe redirects from superseded lead routes.
- a stable `New Lead` action that enters the separately specified manual creation flow and redirects successful creation back to this workspace.

Out of scope:

- global application redesign;
- project-management dashboard;
- quote revision UI;
- customer portal redesign;
- new business rules, workflow architecture, or authentication model.

## Platform Classification

SolarGRANT Pro module feature consuming Clada OS identity, permissions, workflow, audit, documents, and work-item capabilities. The shared shell may teach future contractor workspace patterns, but no platform UI abstraction is created in this release.

## User Workflow

1. Installer enters a lead from dashboard, lead list, search, or a stable link.
2. Server resolves trusted organisation/membership context and loads only the owned lead.
3. Header shows the customer, current workflow state, key readiness signal, and next action.
4. Installer moves between lead-local sections without losing lead context.
5. Mutations show pending, success, validation, conflict, or recoverable error feedback.
6. Browser back/forward and direct section links preserve predictable navigation.

Manual creation is specified separately: an authorised installer may select `New Lead`, complete the minimum approved fields, and arrive at this canonical workspace with incomplete qualification state shown truthfully.

## Design Requirements

- The current state and next action are understandable within ten seconds.
- Primary actions are stage- and permission-aware; unavailable actions explain why without leaking security detail.
- Advanced exports, privacy/erasure controls, and internal diagnostics use progressive disclosure.
- At 390 px, the installer can navigate sections, contact the customer, add a note, create/complete a task, review document state, and execute a permitted stage change without horizontal table scrolling.
- Use semantic landmarks/headings, visible focus, keyboard operation, labelled status, non-colour cues, and minimum touch targets.
- Loading preserves shell dimensions; empty and error states are truthful and actionable.
- No synthetic metrics, records, tasks, or activities.

## Architecture Notes

- Workspace queries require server-derived organisation context and `lead.read`.
- Reuse organisation-scoped access helpers or move touched protected reads behind a focused workspace query service.
- Return bounded view models rather than raw Prisma records.
- Load expensive/paginated sections independently where practical.
- Existing workflow mutations remain behind the workflow service.
- Canonical route selection must include redirects and regression tests before legacy route removal.
- The workspace stores no duplicate summary entity.

## Risks

- A single page becomes slow or monolithic.
- Route migration breaks bookmarks.
- Product UI begins bypassing platform services.
- Mobile behaviour is treated as later polish.
- Too many stage/readiness labels create conflicting status.

Mitigate with section boundaries, bounded queries, canonical redirects, explicit view models, service enforcement, and mobile acceptance gates.

## Acceptance Criteria

- One canonical URL opens an organisation-owned lead workspace.
- Cross-tenant and unauthorised requests are denied safely.
- All five sections are lead-local and deep-linkable.
- The header displays truthful current state and next-action context.
- Desktop and 390 px critical journeys pass without horizontal table dependence.
- Loading, empty, partial, conflict, and error states are designed and tested.
- Existing lead actions retain their service, permission, audit, and transaction rules.
- A manually created lead opens at the same canonical URL and is clearly distinguished from a completed homeowner intake without creating a second workspace type.

## Verification Plan

- route and redirect tests;
- tenant/permission integration tests;
- component tests for view-model and state rendering;
- browser smoke at desktop and 390 px;
- keyboard, focus, zoom, screen-reader-name, contrast, and touch-target checks;
- query-count/latency evidence with representative pilot data;
- regression tests for current lead, workflow, portal, and pack actions.

## Rollout Plan

Ship the canonical shell and overview before moving each lead-local section. Keep legacy redirects during the pilot. Roll out to one provisioned organisation, verify navigation and support paths, then enable for remaining pilot organisations.

## Documentation Updates

- Release 1.5 Master Specification and sprint plan;
- [Manual Lead Creation](FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md);
- SolarGRANT Pro module/current-state documentation after implementation;
- pilot onboarding/support runbook;
- architecture overview only if service boundaries materially change.
