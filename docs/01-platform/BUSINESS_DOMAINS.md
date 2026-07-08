# Business Domains

| Field | Value |
| --- | --- |
| Document ID | PLAT-DOMAINS-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines business domains inside Clada OS architecture and explains how they differ from platform capabilities and product modules.

## Scope

This applies to domain modeling, terminology, rules, validation, workflow interpretation, and product-specific subject matter.

It does not define the implementation location of every current function. Current code may still combine module, domain, and platform concerns until future documented refactoring separates them.

## Why

Platform reuse only works when business-specific rules stay visible. If SEAI grant rules, installer language, or solar document expectations are treated as platform facts, future modules will inherit the wrong assumptions.

Business domains let Clada OS support specialist workflows while keeping reusable capabilities clean.

## What

A business domain is a subject-matter boundary that defines business language, rules, constraints, and decision criteria.

Current and expected domains include:

| Domain | Status | Owner | Notes |
| --- | --- | --- | --- |
| Contractor operations | Emerging platform domain | Clada OS Platform | Common operating model across contractor-led service businesses. |
| Customer and lead management | Emerging platform domain | Clada OS Platform | Shared concepts for inquiries, contacts, qualification, and follow-up. |
| Document operations | Emerging platform domain | Clada OS Platform | Shared concepts for required documents, collection, review, and readiness. |
| Communications | Emerging platform domain | Clada OS Platform | Shared concepts for message history, notifications, and consent-aware communication. |
| Workflow management | Emerging platform domain | Clada OS Platform | Shared concepts for operational states, transitions, blockers, and ownership. |
| Grants and compliance | Module-led domain | SolarGRANT Pro Product | Initial rules are SEAI-specific and should not be generalized prematurely. |
| Solar installation operations | Module-led domain | SolarGRANT Pro Product | Installer and solar workflow language belongs to the first module. |
| Pricing and estimates | Emerging platform domain | Clada OS Platform | Reusable only where the pricing model can serve multiple contractor workflows. |

## How

Use a business domain when the work defines meaning, rules, or terminology rather than reusable platform mechanics.

Domain decisions should:

1. Name the domain owner.
2. Separate module-specific terms from platform terms.
3. Keep provider or regulation-specific rules out of generic platform APIs unless intentionally abstracted.
4. Link domain changes to feature specs or ADRs when they affect customer promises, compliance, finance, legal, or grant applications.
5. Prefer explicit vocabulary over generic labels that hide business meaning.

## Examples

"Customer" can be a platform concept. "SEAI applicant" is a SolarGRANT Pro or grants-and-compliance domain concept.

"Document required for workflow readiness" can be a platform concept. "MPRN confirmation for an Irish solar grant" is a SolarGRANT Pro domain rule.

## Related Documents

- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md)
- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md)
- [../01-product/SOLARGRANT_PRO_MODULE.md](../01-product/SOLARGRANT_PRO_MODULE.md)
