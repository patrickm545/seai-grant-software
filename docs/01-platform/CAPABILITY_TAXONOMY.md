# Capability Taxonomy

| Field | Value |
| --- | --- |
| Document ID | PLAT-CAP-TAX-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the official capability categories used by Clada OS.

## Scope

This taxonomy applies to new feature specifications, ADRs, platform documentation, module planning, and future implementation boundaries.

## Why

Clada OS needs category discipline. If a team cannot tell whether a boundary is a platform capability, shared service, business domain, product module, infrastructure, integration, or developer tool, ownership and reuse will drift.

Every capability or capability-adjacent item must belong to exactly one category.

## What

Use these categories.

| Category | Definition | Owner pattern | Example |
| --- | --- | --- | --- |
| Platform Capability | Reusable business behavior provided by Clada OS and consumed by product modules. | Clada OS Platform | Customer records, workflow tracking, audit trail, document review. |
| Shared Service | Internal reusable implementation support used by capabilities. | Clada Systems Engineering | Data access service, validation service, notification service. |
| Business Domain | Business language, rules, terminology, and constraints for a subject area. | Product or platform domain owner | SEAI grant rules, contractor operations, document operations. |
| Product Module | Market-specific product package that composes platform capabilities and domain rules. | Product owner | SolarGRANT Pro. |
| Infrastructure | Runtime, persistence, hosting, deployment, secrets, and network foundations. | Infrastructure owner | Postgres, Vercel, environment variables. |
| Integration | External provider or third-party system boundary. | Integration owner | OpenAI, Twilio, SMTP, future grant portal connector. |
| Developer Tooling | Tools and workflows used to build, validate, document, and operate the repository. | Engineering owner | Lint, build, migration scripts, documentation validation. |

Cross-cutting concerns are not categories. They are requirements that apply across categories.

## How

Classify by primary ownership and consumer:

1. If product modules consume it as reusable business behavior, classify it as a Platform Capability.
2. If it supports implementation behind capabilities, classify it as a Shared Service.
3. If it defines subject-matter meaning or rules, classify it as a Business Domain.
4. If it packages capabilities for a market, classify it as a Product Module.
5. If it provides runtime foundation, classify it as Infrastructure.
6. If it connects to an external provider or system, classify it as an Integration.
7. If it helps teams build, validate, or operate the repository, classify it as Developer Tooling.

When an item appears to fit more than one category, choose the category of the boundary being changed, then document adjacent dependencies.

## Examples

"AI document extraction" as module-facing behavior is a Platform Capability. "OpenAI API call code" is an Integration. "Prompt evaluation scripts" are Developer Tooling. "Solar grant document requirements" are a Business Domain.

"Lead qualification" as reusable intake behavior is a Platform Capability. "SEAI eligibility threshold" is a Business Domain. "SolarGRANT Pro grant readiness screen" is Product Module behavior.

## Related Documents

- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [CROSS_CUTTING_CONCERNS.md](CROSS_CUTTING_CONCERNS.md)
- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md)
- [../DOCUMENTATION_STANDARD.md](../DOCUMENTATION_STANDARD.md)
