# Architecture

| Field | Value |
| --- | --- |
| Document ID | ENG-LEGACY-ARCH-002 |
| Status | Superseded |
| Owner | Clada Systems Engineering |
| Review cycle | Review when architecture overview changes |
| Last reviewed | 2026-07-08 |

This legacy architecture note has been superseded by the canonical [Architecture Overview](../03-engineering/ARCHITECTURE_OVERVIEW.md). It remains as supporting context until all architecture guidance is reconciled into the Clada Operating Manual.

## Purpose

This document gives Codex and developers a stable reference before changing the application.

## Current known stack

The app uses Node, npm, Prisma, Postgres, and Vercel deployment.

## Architecture principles

- Preserve existing working lead funnel functionality.
- Keep Clada OS platform logic separate from solar-specific wording where possible.
- Prefer reusable Clada OS capabilities over one-off pages when reuse is justified.
- Keep database changes deliberate and documented.
- Avoid large unrelated rewrites inside small sprints.
- Keep business logic readable and easy to test.

## Route principles

Public routes should be simple and conversion-focused.

Business routes should support daily operations, lead management, and workflow tracking.

Future app structure should make room for shared Clada OS capabilities and SolarGRANT Pro module-specific workflows.

## Data principles

Core entities should be designed for long-term reuse.

Likely core entities include Lead, Customer, Property, Quote, Workflow Status, Note, Document, Activity, and User.

Solar-specific fields should be grouped clearly so the platform can later support other contractor verticals.

## Sprint rule

Every sprint must state which files, routes, data models, and behaviours are allowed to change.
