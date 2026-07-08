# Platform

| Field | Value |
| --- | --- |
| Document ID | PLAT-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This section defines Clada OS as the reusable business operating platform for Clada Systems.

It is the canonical platform architecture section of the Clada Operating Manual (COM). Product, design, engineering, feature, sprint, and ADR documents should use this section when deciding whether work belongs in Clada OS, a product module, a business domain, a shared service, infrastructure, an integration, or developer tooling.

## Scope

This section covers platform intent, capability ownership, module boundaries, platform APIs, dependency rules, lifecycle rules, and the decision framework for evolving Clada OS.

It does not implement application code, rename existing code, or change previously approved architecture decisions. Where existing implementation still uses SolarGRANT Pro or SEAI-specific naming, that remains acceptable when the code is describing the first product module.

The repository now contains both `docs/01-platform` and the earlier `docs/01-product` section. Renumbering product documentation may be useful in a future navigation cleanup, but this milestone intentionally avoids unrelated folder restructuring.

## Why

Clada Systems began with SolarGRANT Pro, but SolarGRANT Pro is not the platform. Without a clear platform section, future teams could duplicate module-specific logic, embed solar assumptions in reusable layers, or treat a first-market workflow as the architecture of the whole company.

Clada OS needs a durable model so future engineers and AI coding agents can understand what should be reused, what should remain product-specific, and how new products inherit platform functionality without copying it.

## What

Clada Systems uses this relationship model:

```text
Clada Systems
  -> Clada Operating Manual
  -> Clada OS
  -> Platform Capabilities
  -> Product Modules
  -> Customer Solutions
```

SolarGRANT Pro is the first product module built on Clada OS. It proves and exercises platform capabilities through Irish solar grant workflows, installer operations, document preparation, and human-reviewed submission support.

## How

Use this section before introducing a reusable capability, changing a product boundary, adding a shared service, or extracting module logic into Clada OS.

The operating sequence is:

1. Search the existing platform capability map.
2. Classify the work using the capability taxonomy.
3. Confirm one architectural owner.
4. Prefer extending an existing capability over creating a duplicate.
5. Define or update the platform API before implementation.
6. Preserve explicit human review for customer, compliance, finance, legal, and grant-application outputs.
7. Record material decisions in the platform ADR index and global ADR section.

## Documents

- [PLATFORM_VISION.md](PLATFORM_VISION.md): why Clada OS exists and what it must become.
- [PLATFORM_PRINCIPLES.md](PLATFORM_PRINCIPLES.md): mandatory platform architecture principles.
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md): current and intended capability ownership map.
- [BUSINESS_DOMAINS.md](BUSINESS_DOMAINS.md): business domain boundaries and ownership.
- [PLATFORM_LAYERS.md](PLATFORM_LAYERS.md): platform layers and allowed responsibility flow.
- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md): product module architecture and boundaries.
- [SHARED_SERVICES.md](SHARED_SERVICES.md): shared service definition, ownership, and examples.
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md): stable interface rules for shared capabilities.
- [CROSS_CUTTING_CONCERNS.md](CROSS_CUTTING_CONCERNS.md): concerns that apply across modules and layers.
- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md): how product modules compose platform capabilities.
- [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md): category definitions and classification rules.
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md): how to decide where a capability belongs.
- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md): dependency direction, allowed relationships, and prohibited coupling.
- [MODULE_LIFECYCLE.md](MODULE_LIFECYCLE.md): lifecycle stages for product modules.
- [PLATFORM_EVOLUTION_POLICY.md](PLATFORM_EVOLUTION_POLICY.md): how platform capabilities change over time.
- [PLATFORM_ADR_INDEX.md](PLATFORM_ADR_INDEX.md): platform decision index and recommended ADR candidates.

## Related Documents

- [../CONSTITUTION.md](../CONSTITUTION.md)
- [../THE_CLADA_WAY.md](../THE_CLADA_WAY.md)
- [../DOCUMENTATION_STANDARD.md](../DOCUMENTATION_STANDARD.md)
- [../01-product/README.md](../01-product/README.md)
- [../03-engineering/ARCHITECTURE_OVERVIEW.md](../03-engineering/ARCHITECTURE_OVERVIEW.md)
- [../05-decisions/README.md](../05-decisions/README.md)
- [../06-sprints/FOUNDATION_RELEASE_1_MILESTONE_3.md](../06-sprints/FOUNDATION_RELEASE_1_MILESTONE_3.md)
