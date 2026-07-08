# Platform Layers

| Field | Value |
| --- | --- |
| Document ID | PLAT-LAYERS-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the architecture layers of Clada OS and the direction dependencies should flow.

## Scope

This applies to documentation, product planning, feature specifications, ADRs, and future implementation refactoring. It is not a mandate to split the current codebase into services during this milestone.

## Why

Clada OS needs clear layers so future teams can tell whether they are changing product composition, platform capability behavior, domain rules, shared implementation support, provider integrations, infrastructure, or delivery tooling.

Layer clarity prevents product modules from depending on platform internals and prevents platform code from absorbing module-specific assumptions.

## What

Clada OS uses these architecture layers:

| Layer | Responsibility | Should depend on |
| --- | --- | --- |
| Governance and COM | Authority, standards, decisions, lifecycle, and review rules. | Nothing lower as an authority source. |
| Product composition | Product modules and customer solutions assembled from platform capabilities. | Platform APIs and approved business domains. |
| Business domains | Business language, rules, terminology, and market-specific constraints. | Governance and platform contracts. |
| Platform capabilities | Reusable customer, workflow, document, communication, audit, AI, reporting, portal, and configuration behavior. | Shared services, integrations through interfaces, infrastructure through services. |
| Shared services | Reusable implementation support used by platform capabilities. | Integrations, infrastructure, and internal libraries. |
| Integrations | External provider boundaries such as email, SMS, AI providers, payment, grant portals, or CRM systems. | Provider APIs and platform contracts. |
| Infrastructure | Runtime, persistence, hosting, deployment target, secrets, and network foundations. | Platform operational requirements. |
| Developer tooling | Build, lint, migration, documentation validation, and delivery support. | Repository standards and runtime requirements. |

## How

Design from higher intent to lower implementation:

1. Start with the COM authority and the relevant product or platform document.
2. Decide whether the work changes product composition, domain meaning, or platform capability behavior.
3. Keep platform capability APIs stable even if shared service implementation changes.
4. Route provider-specific behavior through integration boundaries.
5. Keep infrastructure details behind shared services or explicit platform contracts.
6. Use ADRs for changes that alter layer boundaries or dependency direction.

## Examples

SolarGRANT Pro can compose a lead intake flow from platform intake, customer, communications, document, audit, and AI capabilities. It should not reach directly into a provider-specific email implementation when a platform communications interface exists.

An SEAI grant rule belongs in the SolarGRANT Pro business domain. A generic workflow transition rule belongs in the platform workflow capability.

## Related Documents

- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md)
- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [SHARED_SERVICES.md](SHARED_SERVICES.md)
- [../03-engineering/ARCHITECTURE_OVERVIEW.md](../03-engineering/ARCHITECTURE_OVERVIEW.md)
