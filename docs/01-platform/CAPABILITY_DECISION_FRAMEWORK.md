# Capability Decision Framework

| Field | Value |
| --- | --- |
| Document ID | PLAT-CAP-DECISION-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the decision process for adding, extending, or moving capabilities in Clada OS.

## Scope

This applies before introducing new platform capabilities, product module capabilities, shared services, integrations, infrastructure dependencies, or developer tooling.

## Why

The easiest way to create architectural debt is to add a capability in the first place that seems convenient. Clada OS needs a repeatable decision framework so teams search first, classify correctly, assign ownership, preserve APIs, and document trade-offs.

## What

Capability decisions must answer:

1. Why does this capability or boundary need to exist?
2. What category owns it?
3. What existing capability can be extended instead?
4. What API or contract will consumers use?
5. What data, audit, privacy, security, and human-review rules apply?
6. What implementation layer should own the change?
7. What documentation or ADR must be updated?

## How

Use this decision flow:

1. Define the user or operational problem.
2. Search [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md).
3. Classify the work using [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md).
4. Identify the architectural owner.
5. Decide whether to extend, configure, extract, or create.
6. Define the API or contract.
7. Identify cross-cutting concerns.
8. Decide whether an ADR is required.
9. Update affected COM documents.
10. Only then implement or schedule implementation.

Use this outcome table:

| Outcome | Use when | Required documentation |
| --- | --- | --- |
| Extend existing capability | Existing owner and API can support the need. | Update capability doc or feature spec. |
| Configure existing capability | Module-specific variation can be expressed through configuration. | Update module or configuration docs. |
| Extract platform capability | Repeated module behavior has proven reusable value. | ADR plus capability map update. |
| Keep module-specific | Need is market-specific or unproven. | Module doc or feature spec. |
| Create shared service | Reusable implementation support reduces meaningful complexity. | Shared service doc or ADR if material. |
| Add integration | External provider boundary is required. | Integration notes and security/privacy review. |
| Change infrastructure | Runtime or persistence foundation changes. | ADR and engineering docs. |

## Examples

If SolarGRANT Pro needs a new "grant application readiness" status, first decide whether this is a generic workflow status, a module-specific status label, or a domain rule. A generic workflow state belongs to the platform workflow capability. A grant-specific label belongs to SolarGRANT Pro.

If two modules need document extraction, extract a platform document AI capability. Keep each module's required document list in its own business domain.

## Related Documents

- [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md)
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [PLATFORM_EVOLUTION_POLICY.md](PLATFORM_EVOLUTION_POLICY.md)
- [PLATFORM_ADR_INDEX.md](PLATFORM_ADR_INDEX.md)
