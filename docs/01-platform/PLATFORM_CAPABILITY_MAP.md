# Platform Capability Map

| Field | Value |
| --- | --- |
| Document ID | PLAT-CAP-MAP-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document maps Clada OS capabilities and adjacent categories so future work has a clear owner and location.

## Scope

This map covers platform capabilities, shared services, business domains, product modules, infrastructure, integrations, and developer tooling known during Foundation Release 1.0, Milestone 3.

It is a documentation baseline, not a claim that every item already exists as clean implementation code.

## Why

Clada OS needs one map of what belongs where. Without it, future products could duplicate lead handling, document review, AI assistance, audit logging, communications, or workflow state management instead of consuming platform capabilities.

## What

Every capability or capability-adjacent concern must belong to exactly one category. Cross-cutting concerns are documented separately because they apply across categories and do not own product behavior by themselves.

| Item | Category | Architectural owner | Reasoning |
| --- | --- | --- | --- |
| Lead intake orchestration | Platform Capability | Clada OS Platform | Multiple modules need structured lead and inquiry capture. |
| Customer and contact record | Platform Capability | Clada OS Platform | Customer identity and history must be reusable across modules. |
| Workflow status tracking | Platform Capability | Clada OS Platform | Operational state exists across contractor workflows. |
| Document collection and review | Platform Capability | Clada OS Platform | Many contractor workflows require customer documents and review. |
| Audit trail | Platform Capability | Clada OS Platform | Trust, traceability, and reviewability are shared platform needs. |
| Communications history | Platform Capability | Clada OS Platform | Customer communication context should not be duplicated by modules. |
| AI assistance orchestration | Platform Capability | Clada OS Platform | AI behavior, confidence, review, and traceability must be shared. |
| Reporting and operational metrics | Platform Capability | Clada OS Platform | Modules need consistent visibility into workflow performance. |
| Module configuration | Platform Capability | Clada OS Platform | Modules need controlled configuration without changing platform internals. |
| Customer portal foundation | Platform Capability | Clada OS Platform | Secure customer-facing workflow surfaces can serve multiple modules. |
| Contractor dashboard foundation | Platform Capability | Clada OS Platform | Reusable operational dashboard patterns should be platform-owned. |
| SEAI grant rules | Business Domain | SolarGRANT Pro Domain | These rules are specific to Irish solar grants. |
| Solar installer workflow language | Business Domain | SolarGRANT Pro Domain | Domain language should not define the entire platform. |
| SolarGRANT Pro | Product Module | SolarGRANT Pro Product | The first module composes platform capabilities for Irish solar grant operations. |
| Application pack view for SEAI workflows | Product Module | SolarGRANT Pro Product | The pack is module packaging around platform document and audit capabilities. |
| Email delivery adapter | Integration | Clada OS Integrations | Provider-specific delivery is an external boundary. |
| SMS delivery adapter | Integration | Clada OS Integrations | Provider-specific delivery is an external boundary. |
| OpenAI provider adapter | Integration | Clada OS Integrations | Provider-specific AI access is not the platform AI capability itself. |
| Postgres database | Infrastructure | Clada OS Infrastructure | Persistence technology supports capabilities but does not define them. |
| Vercel hosting target | Infrastructure | Clada OS Infrastructure | Hosting supports deployment and runtime. |
| Prisma data access helpers | Shared Service | Clada OS Engineering | Data access implementation supports capabilities through internal services. |
| Validation schemas | Shared Service | Clada OS Engineering | Reusable validation supports capability contracts. |
| Documentation standards | Developer Tooling | Clada Systems Engineering | Standards help teams build and review but are not runtime capabilities. |
| Lint, build, and migration commands | Developer Tooling | Clada Systems Engineering | Tooling supports delivery and verification. |

## How

Use this map before adding a feature specification or implementation boundary:

1. Find the closest existing item.
2. If the item exists, extend it through its owner and interface.
3. If the item does not exist, classify it with [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md).
4. If the classification affects architecture, add or update an ADR.
5. Update this map when the decision becomes authoritative.

## Examples

Adding "roofing quote intake" should extend platform lead intake and customer records. Roofing-specific quote terminology should live in the future roofing module or business domain.

Adding a second SMS provider should update the SMS integration boundary. It should not create a separate communications capability.

## Related Documents

- [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [SHARED_SERVICES.md](SHARED_SERVICES.md)
- [BUSINESS_DOMAINS.md](BUSINESS_DOMAINS.md)
- [PRODUCT_COMPOSITION.md](PRODUCT_COMPOSITION.md)
