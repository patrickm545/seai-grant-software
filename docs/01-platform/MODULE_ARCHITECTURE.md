# Module Architecture

| Field | Value |
| --- | --- |
| Document ID | PLAT-MODULE-ARCH-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines how product modules should be structured on top of Clada OS.

## Scope

This applies to SolarGRANT Pro and future product modules. It covers ownership, module responsibilities, platform consumption, and extraction signals.

It does not require immediate codebase restructuring or force premature module extraction.

## Why

Product modules need freedom to solve market-specific problems without redefining Clada OS. At the same time, modules must not duplicate platform capabilities or hard-code reusable behavior inside one product.

Clear module architecture lets SolarGRANT Pro remain specific to Irish solar grants while helping Clada OS discover reusable capabilities.

## What

A product module packages platform capabilities for a specific market workflow, customer segment, or operational problem.

A module may own:

- market terminology and user-facing copy;
- module-specific forms and validation rules;
- business-domain rules and eligibility criteria;
- workflow configuration and state labels;
- document templates and checklists;
- dashboard views and role-specific workflows;
- module-specific customer promises;
- module-specific integrations when no platform boundary exists yet.

A module must not own:

- reusable customer record architecture;
- shared audit behavior;
- generic document collection mechanics;
- generic workflow state mechanics;
- generic communications history;
- AI review and traceability governance;
- shared security, privacy, or compliance posture.

## How

Build modules by composition:

1. Identify the customer workflow the module serves.
2. List the platform capabilities the workflow should consume.
3. Identify module-specific domain language and rules.
4. Define module configuration through documented interfaces.
5. Keep market-specific logic out of platform internals.
6. Promote repeated module behavior into platform capabilities only after evidence exists.
7. Record extraction decisions in ADRs when the boundary is material.

## Examples

SolarGRANT Pro owns SEAI grant readiness language, Irish solar installer workflows, grant document checklists, and installer-facing module screens. It should consume platform lead intake, customer records, document review, audit trails, communications, AI assistance, and reporting.

A future plumbing compliance module may own plumbing-specific certificates, job categories, and customer copy while consuming the same platform customer, workflow, document, audit, and communication capabilities.

## Related Documents

- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md)
- [MODULE_LIFECYCLE.md](MODULE_LIFECYCLE.md)
- [BUSINESS_DOMAINS.md](BUSINESS_DOMAINS.md)
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [../01-product/SOLARGRANT_PRO_MODULE.md](../01-product/SOLARGRANT_PRO_MODULE.md)
