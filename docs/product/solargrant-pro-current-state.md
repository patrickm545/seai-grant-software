# SolarGRANT Pro Current State

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
- Structured lead detail pages
- Quote and proposal workflow
- Grant checklist and document tracking
- Customer communication history
- Reporting and business insights
