# SolarGRANT Pro Current State

| Field | Value |
| --- | --- |
| Document ID | PROD-SGP-CURRENT-001 |
| Status | Active |
| Owner | Clada Systems Product |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-22 |

## Purpose

This document records what currently exists so future sprints do not accidentally break working functionality.

## Current product identity

SolarGRANT Pro is the first Clada OS product module. It serves Irish solar installers by improving homeowner lead capture, lead qualification, grant-related sales workflows, and installer follow-up.

## Existing functionality

Based on the current README and project history, the app currently includes:

- Homeowner-facing solar grant and lead capture funnel
- Lead qualification fields for sales teams
- Preferred callback time
- Electricity bill band
- Customer timeline
- Roof type
- Battery interest
- Lead temperature scoring
- Installer admin dashboard
- Lead detail view
- Result or thank-you flow after submission
- Optional email notification support
- Prisma and Postgres data layer
- Vercel deployment target

## Platform Release 1.5 Boundary

Merged PR #35 establishes `/installer-review-emerald/leads/[leadId]` as the canonical authenticated installer lead workspace. It adds a persistent, tenant-safe summary and deep-linkable Overview, Documents, Activity, Tasks, and Notes navigation. The Overview continues to compose the existing lead-detail capabilities; the other sections use bounded truthful placeholders until their approved implementation PRs. Legacy `/admin/leads/[leadId]` and `/admin/dashboard/leads/[leadId]` detail URLs redirect to the canonical route, while materially different application-pack routes remain available.

The PR 2 draft branch activates `/installer-review-emerald/leads/new` for roles with `lead.create`. It accepts name plus phone/email and optional address, Eircode, approved source, follow-up, membership assignee, and append-only internal note; creates the existing lead/workflow/activity/audit records atomically; and redirects to the canonical workspace. Manual records have explicit origin and trusted creator attribution, no portal invitation or messaging, and null qualification/consent facts. The branch is pending review/merge and Production privacy approval.

The PR 1 workspace shell read requires `lead.read`, derives organisation and membership context from the authenticated server session, scopes the projected lead query to that trusted organisation, and returns no related document, activity, task, note, audit, or binary payload. Existing workflow, portal, pack, document-review, follow-up, and note mutations retain their established protected services and transaction/audit behaviour.

The PR 2 migration makes only genuinely progressive facts nullable while the public homeowner Zod contract remains strict. Accepted ADR-0021 governs explicit origin, derived action-specific completeness, truthful unknown fields, field/consumer inspection, permissions, migration, privacy, and stop conditions. Placeholder property, grant, eligibility, or consent values are not used.

The current baseline contains uploaded `LeadDocument` evidence but not the governed Release 1.4 generated-document runtime. Under the Approved sequence, Customer Document Centre is PR 7 and remains blocked until that separate Release 1.4 implementation is reviewed and merged. Release 1.5 must not create a substitute.

## Product risks

Do not remove or weaken the existing lead funnel while building Clada OS.

Do not overcomplicate the homeowner form. The form should remain easy to complete and should not feel like a long technical survey.

Do not turn the product into a generic CRM before the solar workflow is strong.

## Upgrade direction

The current product should evolve from a grant checker into a full SolarGRANT Pro installer workflow module on Clada OS.

The next upgrades should focus on:

- Cleaner app shell
- Stronger admin dashboard
- Better lead pipeline
- Authenticated minimum Manual Lead Creation without weakening homeowner intake
- Structured lead detail pages
- Quote and proposal workflow
- Grant checklist and document tracking
- Customer communication history
- Reporting and business insights
