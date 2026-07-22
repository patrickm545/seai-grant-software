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

The current runtime supports homeowner-created leads but does not support authenticated Manual Lead Creation. The Platform Release 1.5 documentation amendment proposes name-plus-phone/email minimum capture into the existing `Lead`, followed by redirect to the canonical workspace. The prior Release 1.5 approval is superseded, CTO/CEO re-approval is pending, and no implementation has begun.

The current `Lead` still requires the full homeowner qualification data contract. Proposed ADR-0021 must be Accepted before implementation can introduce explicit creation origin and truthful progressive unknown fields. Placeholder property, grant, eligibility, or consent values are not an acceptable interim implementation.

The current baseline contains uploaded `LeadDocument` evidence but not the governed Release 1.4 generated-document runtime. Under the Proposed sequence, Customer Document Centre is PR 7 and remains blocked until that separate Release 1.4 implementation is reviewed and merged. Release 1.5 must not create a substitute.

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
