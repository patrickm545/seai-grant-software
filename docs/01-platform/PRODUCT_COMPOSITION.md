# Product Composition

| Field | Value |
| --- | --- |
| Document ID | PLAT-PRODUCT-COMP-001 |
| Status | Active |
| Owner | Clada Systems Product and Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines how customer-facing products are composed from Clada OS capabilities.

## Scope

This applies to SolarGRANT Pro and future products built by Clada Systems. It covers the relationship between company, COM, platform, capabilities, modules, and customer solutions.

## Why

Future products must consume Clada OS rather than duplicate it. Product composition gives teams a practical model for combining reusable capabilities with module-specific business rules and customer experiences.

## What

Clada Systems uses this composition model:

```text
Clada Systems
  -> owns and maintains
Clada Operating Manual
  -> governs
Clada OS
  -> provides
Platform Capabilities
  -> composed by
Product Modules
  -> delivered as
Customer Solutions
```

SolarGRANT Pro is the first implementation of this model.

| Level | Meaning | SolarGRANT Pro example |
| --- | --- | --- |
| Clada Systems | Company and accountable owner. | Company building the contractor operating platform. |
| COM | Source of truth for decisions and standards. | Documentation governing platform and module changes. |
| Clada OS | Reusable operating platform. | Shared intake, customer, workflow, document, AI, audit, communication, and reporting capabilities. |
| Platform Capabilities | Reusable behavior exposed through stable interfaces. | Document review, customer records, workflow state, audit events. |
| Product Modules | Market-specific package of capabilities and domains. | SolarGRANT Pro. |
| Customer Solutions | Deployed workflows that solve customer problems. | Installer-facing grant readiness and lead operations workflow. |

## How

When composing a product:

1. Define the customer workflow and market context.
2. Identify required platform capabilities.
3. Identify domain rules and module-specific language.
4. Use platform APIs rather than copying implementation logic.
5. Configure or extend platform capabilities where possible.
6. Keep module-specific promises and rules inside the module.
7. Feed reusable learning back into the platform capability map.

## Examples

SolarGRANT Pro composes customer intake, lead qualification, document collection, AI-assisted analysis, audit trails, installer dashboards, and communications into an Irish solar grant workflow.

A future roofing operations module may compose customer intake, quote management, document collection, workflow tracking, communications, reporting, and audit trails into a roofing-specific workflow.

## Related Documents

- [PLATFORM_VISION.md](PLATFORM_VISION.md)
- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md)
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [../01-product/CLADA_OS_PRODUCT_MODEL.md](../01-product/CLADA_OS_PRODUCT_MODEL.md)
