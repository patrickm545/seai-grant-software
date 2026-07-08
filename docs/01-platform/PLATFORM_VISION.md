# Platform Vision

| Field | Value |
| --- | --- |
| Document ID | PLAT-VISION-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the long-term vision for Clada OS as a reusable operating platform for contractor-led service businesses.

## Scope

This vision applies to platform architecture, product module planning, capability extraction, and documentation-first development. It does not define individual product feature scope or implementation details.

## Why

Clada Systems needs a platform that can support more than one market without forcing every new product to rebuild lead intake, customer records, workflow tracking, document operations, communications, AI assistance, audit trails, and review controls.

SolarGRANT Pro gives Clada OS its first real operating environment. The platform must learn from that environment while avoiding the mistake of turning Irish solar grant assumptions into permanent platform assumptions.

## What

Clada OS is the reusable business operating platform owned by Clada Systems.

It exists to provide durable, documented, API-first capabilities that product modules can compose into market-specific workflows. The platform should support contractor-led businesses that need reliable customer intake, operational workflow management, document handling, communications, reporting, human review, and AI-assisted work.

The platform is successful when:

- product modules can consume shared capabilities without duplicating them;
- platform boundaries are documented before major implementation work;
- every reusable capability has one owner;
- module-specific rules remain inside modules or business domains;
- human review is explicit where outputs affect customers, compliance, finance, legal, or grant applications;
- AI is treated as a platform capability, not as the identity of a product;
- future engineers can understand the system from the COM without private context.

## How

When planning work, use this vision as a boundary test:

1. If the work would serve multiple product modules, evaluate it as a platform capability.
2. If the work is specific to one market, grant scheme, installer workflow, or customer promise, keep it inside the product module or business domain.
3. If the work is a reusable implementation helper, classify it as a shared service rather than a product capability.
4. If the work connects to an outside provider, classify the provider-specific boundary as an integration.
5. If the work changes how capabilities depend on each other, document the decision before implementation.

## Examples

SolarGRANT Pro should use platform customer records, workflow status tracking, document review, audit trails, and AI assistance. It should own SEAI grant terminology, solar-specific eligibility rules, installer-facing copy, grant-document templates, and module-specific customer promises.

A future HVAC module should reuse the same customer record, communications, workflow, document, audit, and AI capabilities. It should not copy SolarGRANT Pro eligibility rules or solar grant language.

## Related Documents

- [README.md](README.md)
- [PLATFORM_PRINCIPLES.md](PLATFORM_PRINCIPLES.md)
- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md)
- [../01-product/CLADA_OS_PRODUCT_MODEL.md](../01-product/CLADA_OS_PRODUCT_MODEL.md)
- [../CONSTITUTION.md](../CONSTITUTION.md)
