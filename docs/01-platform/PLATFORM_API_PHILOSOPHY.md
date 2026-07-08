# Platform API Philosophy

| Field | Value |
| --- | --- |
| Document ID | PLAT-API-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines how Clada OS should expose platform capabilities to product modules.

## Scope

This applies to HTTP routes, server actions, TypeScript service boundaries, validation schemas, event contracts, module configuration contracts, and future public or internal APIs.

## Why

Product modules must be able to consume Clada OS capabilities without depending on implementation details. API-first architecture protects modules from internal refactoring and protects the platform from accidental product-specific coupling.

## What

A platform API is a stable contract that lets a consumer use a capability without knowing how that capability is implemented.

Platform APIs should be:

- documented before broad use;
- owned by one platform capability;
- explicit about inputs, outputs, errors, and review states;
- versioned or migration-planned when breaking changes are unavoidable;
- provider-neutral unless the provider is the intentional subject of the API;
- safe for AI-assisted development to consume without private assumptions.

API forms may include:

| API form | Use |
| --- | --- |
| HTTP route | Module or external client needs network access. |
| Server-side service function | Internal app code needs typed platform behavior. |
| Validation schema | Inputs and outputs need a shared contract. |
| Event contract | Platform behavior needs traceable state changes. |
| Module configuration schema | Product modules need controlled customization. |
| Document template contract | Modules need repeatable document packaging. |

## How

Before exposing or changing a platform API:

1. Name the owning platform capability.
2. Define the consumer: product module, shared service, integration, tooling, or external client.
3. Document required inputs, outputs, error states, audit events, and human-review states.
4. Keep provider-specific details outside the module-facing contract.
5. Add compatibility guidance when changing an existing contract.
6. Link material API decisions from an ADR.

## Examples

A module-facing document review API should expose document status, confidence, evidence, required human review, and audit references. It should not expose raw OpenAI response shapes as the module contract.

A communications API should expose message intent, recipient, consent context, delivery channel preference, and audit metadata. It should not require product modules to know SMTP or Twilio-specific parameters.

## Related Documents

- [PLATFORM_PRINCIPLES.md](PLATFORM_PRINCIPLES.md)
- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md)
- [SHARED_SERVICES.md](SHARED_SERVICES.md)
- [CROSS_CUTTING_CONCERNS.md](CROSS_CUTTING_CONCERNS.md)
- [../04-features/FEATURE_SPEC_TEMPLATE.md](../04-features/FEATURE_SPEC_TEMPLATE.md)
