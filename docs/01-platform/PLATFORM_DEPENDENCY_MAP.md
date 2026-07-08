# Platform Dependency Map

| Field | Value |
| --- | --- |
| Document ID | PLAT-DEPENDENCY-MAP-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines dependency direction and allowed coupling between Clada OS architecture categories.

## Scope

This applies to future platform refactoring, feature design, ADRs, and implementation review. It describes intended architecture boundaries rather than claiming the current codebase already has perfect separation.

## Why

Dependencies determine whether Clada OS can support future products. If platform capabilities depend on SolarGRANT Pro details, every future module inherits solar assumptions. If modules depend on shared service internals, platform implementation changes become risky.

## What

The intended dependency direction is:

```text
Customer Solutions
  -> Product Modules
  -> Platform Capabilities
  -> Shared Services
  -> Integrations and Infrastructure
  -> Runtime providers
```

Business domains provide meaning to product modules and platform capabilities through documented rules. Developer tooling supports all layers but must not define runtime product behavior.

| Source | May depend on | Must not depend on |
| --- | --- | --- |
| Product Module | Platform APIs, approved business domains, module configuration | Platform internals, shared service internals, provider-specific clients unless explicitly approved |
| Platform Capability | Shared services, domain contracts, integration interfaces | Product module implementation details |
| Shared Service | Infrastructure and integration interfaces | Product module rules or user-facing product promises |
| Business Domain | Governance, product/module context, platform contracts | Provider implementation details |
| Integration | Provider APIs and platform integration contracts | Product UI flows or module copy |
| Infrastructure | Runtime and operational requirements | Business-domain rules |
| Developer Tooling | Repository standards and runtime requirements | Customer-facing behavior as an authority source |

## How

Use this map during design and review:

1. Identify the source and target of the dependency.
2. Confirm the dependency flows downward or through an approved contract.
3. Move module-specific terms out of platform APIs.
4. Move provider-specific details behind integration interfaces.
5. Move repeated implementation support into shared services only when it simplifies the architecture.
6. Create an ADR for new cross-layer dependencies or intentional exceptions.

## Examples

Allowed: SolarGRANT Pro calls a platform document review API.

Not allowed: A platform document review capability imports SolarGRANT Pro grant wording to decide generic document readiness.

Allowed: A platform notification service uses an SMS integration.

Not allowed: A product module directly embeds Twilio-specific delivery behavior when a platform communications interface exists.

## Related Documents

- [PLATFORM_LAYERS.md](PLATFORM_LAYERS.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [MODULE_ARCHITECTURE.md](MODULE_ARCHITECTURE.md)
- [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md)
- [../03-engineering/ARCHITECTURE_OVERVIEW.md](../03-engineering/ARCHITECTURE_OVERVIEW.md)
