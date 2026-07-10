# Platform ADR Index

| Field | Value |
| --- | --- |
| Document ID | PLAT-ADR-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-10 |

## Purpose

This document indexes architecture decisions that define or materially affect Clada OS platform architecture.

## Scope

This index points to ADRs in [../05-decisions](../05-decisions/README.md) that affect platform terminology, platform capabilities, product module boundaries, APIs, AI governance, dependency rules, infrastructure, or major shared services.

It does not replace the global ADR index.

## Why

Platform decisions need to be easy to find from the platform section. Future engineers and AI coding agents should not have to search the entire repository to understand the decisions that govern Clada OS boundaries.

## What

Current platform ADRs:

| ADR | Status | Platform relevance |
| --- | --- | --- |
| [ADR-0001: Establish Clada OS Terminology](../05-decisions/ADR-0001-clada-os-terminology.md) | Active | Establishes Clada Systems as company, Clada OS as platform, and SolarGRANT Pro as first product module. |
| [ADR-0002: Organisation Is The Initial Tenant Boundary](../05-decisions/ADR-0002-organisation-tenant-model.md) | Active | Defines organisation as the first tenant and operational ownership boundary. |
| [ADR-0003: Minimal Actor And Membership Model](../05-decisions/ADR-0003-actor-and-membership-model.md) | Active | Defines the first user, membership, human actor, service actor, and system actor concepts. |
| [ADR-0004: Adapt Existing Admin Authentication Into Identity Context](../05-decisions/ADR-0004-existing-authentication-integration.md) | Active | Keeps current authentication while mapping valid sessions into platform user context. |
| [ADR-0005: Tenant-Aware Data Access Defaults To Denial](../05-decisions/ADR-0005-tenant-aware-data-access.md) | Active | Establishes default-deny tenant scoping for organisation-owned data. |
| [ADR-0006: Assign Existing SolarGRANT Pro Data To Installer Organisations](../05-decisions/ADR-0006-existing-data-migration.md) | Active | Defines the safe migration rule for existing installer and lead data. |

Recommended future ADR candidates:

| Candidate | Trigger |
| --- | --- |
| Platform API boundary ADR | Required before a major module-facing platform API becomes stable across modules. |
| AI governance ADR | Required before AI output directly affects customer, compliance, finance, legal, or grant-application decisions beyond current human-reviewed support. |
| Workflow engine ADR | Required before extracting workflow state management into a reusable engine or standalone service. |
| Integration strategy ADR | Required before adding provider abstraction across email, SMS, CRM, grant portals, or AI providers. |

## How

Add an ADR to this index when it:

1. Defines platform terminology or boundaries.
2. Promotes module behavior into a platform capability.
3. Creates or changes a shared platform API.
4. Alters dependency direction between modules, platform capabilities, shared services, integrations, or infrastructure.
5. Changes AI, review, audit, security, privacy, or compliance posture.
6. Introduces or removes a major dependency.

The global ADR file remains the source record. This platform index is the platform-specific navigation layer.

## Examples

If SolarGRANT Pro document review becomes a reusable Clada OS document capability, write an ADR explaining the extraction boundary, API, domain-specific exclusions, and migration path.

If Clada OS adds direct grant portal automation, write an ADR before implementation because it affects customer consent, auditability, human review, legal/compliance posture, and integration boundaries.

## Related Documents

- [../05-decisions/README.md](../05-decisions/README.md)
- [../05-decisions/ADR_TEMPLATE.md](../05-decisions/ADR_TEMPLATE.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [PLATFORM_EVOLUTION_POLICY.md](PLATFORM_EVOLUTION_POLICY.md)
- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md)
