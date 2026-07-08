# Module Lifecycle

| Field | Value |
| --- | --- |
| Document ID | PLAT-MODULE-LIFECYCLE-001 |
| Status | Active |
| Owner | Clada Systems Product and Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines lifecycle stages for product modules built on Clada OS.

## Scope

This applies to SolarGRANT Pro and future modules. It covers module maturity, documentation expectations, platform extraction signals, and retirement.

## Why

Product modules should not all receive the same architectural treatment. Early experiments need speed and focus. Active modules need reliable boundaries. Mature modules should feed reusable lessons back into Clada OS.

Lifecycle stages help teams avoid both premature abstraction and long-term duplication.

## What

Product modules use these lifecycle stages:

| Stage | Meaning | Documentation expectations |
| --- | --- | --- |
| Candidate | Potential module being researched. | Research notes and problem statement. |
| Experiment | Narrow workflow tested with limited scope. | Feature spec, scope limits, success criteria. |
| Alpha | Usable module with active learning and changing boundaries. | Module README, domain notes, known platform extraction candidates. |
| Active | Supported module with explicit customer workflows. | Module architecture, feature specs, support expectations, platform dependencies. |
| Mature | Stable module with proven reusable patterns. | Extraction decisions, ADRs, updated platform capability map. |
| Deprecated | Module no longer receiving major investment. | Deprecation plan, data handling, customer communication. |
| Archived | Module retired from active use. | Archive record and historical references. |

SolarGRANT Pro is the first active product module and the primary learning environment for Clada OS during Foundation Release 1.0.

## How

At each module review:

1. Confirm the current lifecycle stage.
2. Identify module-specific behavior that should remain local.
3. Identify repeated behavior that may become a platform capability.
4. Update the platform capability map when extraction decisions are made.
5. Keep module documentation aligned with product promises and architecture boundaries.
6. Use ADRs for material promotions, deprecations, or dependency changes.

## Examples

If SolarGRANT Pro document readiness logic becomes useful to another module, the reusable document readiness behavior may move toward a platform document capability. SEAI-specific document requirements should remain in the SolarGRANT Pro domain.

A future HVAC module may begin as an experiment with minimal platform extraction. If it proves recurring workflow, document, and communication patterns, those patterns should strengthen Clada OS.

## Related Documents

- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md)
- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md)
- [PLATFORM_EVOLUTION_POLICY.md](PLATFORM_EVOLUTION_POLICY.md)
- [../01-product/SOLARGRANT_PRO_MODULE.md](../01-product/SOLARGRANT_PRO_MODULE.md)
- [../06-sprints/README.md](../06-sprints/README.md)
