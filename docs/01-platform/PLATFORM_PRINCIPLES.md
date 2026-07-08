# Platform Principles

| Field | Value |
| --- | --- |
| Document ID | PLAT-PRINCIPLES-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the mandatory architecture principles for Clada OS.

## Scope

These principles apply to platform capabilities, product modules, shared services, integrations, infrastructure choices, developer tooling, feature specifications, and ADRs.

## Why

Platform architecture fails when shared functionality grows accidentally. Clada OS must be deliberate about what is reusable, who owns it, how modules consume it, and when automation must remain reviewable by humans.

These principles prevent duplication, unclear ownership, undocumented implementation drift, and product-specific assumptions leaking into the platform.

## What

Clada OS follows these principles.

### Platform Before Product

Platform capabilities exist independently of products. Products consume platform capabilities through documented interfaces.

### Documentation First Development

Architecture is documented before implementation. Code implements documented decisions; it does not silently redefine them.

### Capability Ownership

Every capability has one architectural owner. Capabilities must not exist in multiple places under different names.

### Reuse Before Creation

Before introducing a new capability, search the existing platform capability map, extend before duplicating, and document the decision.

### API First

Shared capabilities expose stable interfaces. Product modules consume interfaces and must not depend on implementation details.

### AI Native

AI is a platform capability. It supports workflows across modules and is governed by shared safety, audit, review, and provider-boundary rules.

### Human Review

Human review remains explicit where outputs influence customers, compliance, finance, legal, or grant applications.

## How

Apply the principles in this order:

1. Start with the capability taxonomy before naming a new boundary.
2. Confirm whether the work belongs to Clada OS, a product module, a business domain, a shared service, infrastructure, an integration, or developer tooling.
3. Identify the owner before implementation.
4. Define the API or contract before exposing the capability to a module.
5. Add human-review checkpoints before outputs become customer-visible or compliance-relevant.
6. Record significant architecture decisions in an ADR.

## Examples

A document extraction workflow should not be implemented separately in every module. The reusable extraction, confidence handling, audit event, and review pattern belong in Clada OS. A solar-specific checklist of SEAI document names belongs in SolarGRANT Pro or its business domain.

An OpenAI API client is not itself the AI capability. The platform AI capability defines workflow behavior, review requirements, output traceability, and module-facing interfaces. The OpenAI client is an integration boundary used by that capability.

## Related Documents

- [CAPABILITY_TAXONOMY.md](CAPABILITY_TAXONOMY.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [CROSS_CUTTING_CONCERNS.md](CROSS_CUTTING_CONCERNS.md)
- [../03-engineering/AI_ENGINEERING_RULES.md](../03-engineering/AI_ENGINEERING_RULES.md)
