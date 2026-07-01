# Architecture

## Purpose

This document gives Codex and developers a stable reference before changing the application.

## Current known stack

The app uses Node, npm, Prisma, Postgres, and Vercel deployment.

## Architecture principles

- Preserve existing working lead funnel functionality.
- Keep Clada OS platform logic separate from solar-specific wording where possible.
- Prefer reusable modules over one-off pages.
- Keep database changes deliberate and documented.
- Avoid large unrelated rewrites inside small sprints.
- Keep business logic readable and easy to test.

## Route principles

Public routes should be simple and conversion-focused.

Business routes should support daily operations, lead management, and workflow tracking.

Future app structure should make room for shared Clada OS modules and solar-specific modules.

## Data principles

Core entities should be designed for long-term reuse.

Likely core entities include Lead, Customer, Property, Quote, Workflow Status, Note, Document, Activity, and User.

Solar-specific fields should be grouped clearly so the platform can later support other contractor verticals.

## Sprint rule

Every sprint must state which files, routes, data models, and behaviours are allowed to change.
