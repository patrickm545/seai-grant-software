# Platform Evolution Policy

| Field | Value |
| --- | --- |
| Document ID | PLAT-EVOLUTION-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines how Clada OS platform capabilities evolve over time.

## Scope

This applies to capability creation, extension, extraction, stabilization, deprecation, and removal. It also applies to platform API changes and material dependency changes.

## Why

Clada OS must grow through real product learning without becoming a pile of one-off module behavior. Platform evolution needs enough discipline to protect reuse and enough restraint to avoid speculative abstraction.

## What

Platform capabilities evolve through these states:

| State | Meaning |
| --- | --- |
| Candidate | A repeated need has been observed but not accepted as platform behavior. |
| Proposed | A documented proposal exists with owner, category, API, and rationale. |
| Active | The capability is authoritative and may be consumed by product modules. |
| Stabilizing | The capability exists but API or ownership is still being refined. |
| Deprecated | The capability remains available while consumers migrate away. |
| Superseded | A newer capability or API replaces the old one. |
| Removed | The capability is no longer available and historical references remain in docs. |

## How

Evolve capabilities with this process:

1. Observe the need in a product module or operational workflow.
2. Confirm whether an existing platform capability can be extended.
3. Document the capability proposal and category.
4. Define the owner and API contract.
5. Identify cross-cutting concerns and human-review requirements.
6. Create an ADR for material platform boundary changes.
7. Implement the smallest coherent change in a future implementation milestone.
8. Validate consumers and update documentation.
9. Deprecate old APIs with migration guidance rather than silent breakage.

Versioning should be practical. Internal APIs can use documented migration notes when consumer count is small. External or module-wide APIs need stronger compatibility guidance.

## Examples

A second product module needing customer document collection is evidence for strengthening the platform document capability. It is not evidence that SolarGRANT Pro document names should become global platform concepts.

Changing the AI provider behind an existing platform AI API should not force product modules to rewrite workflow code. Changing what AI outputs mean to human reviewers may require an ADR because it affects trust and review behavior.

## Related Documents

- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [PLATFORM_ADR_INDEX.md](PLATFORM_ADR_INDEX.md)
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [../DOCUMENT_LIFECYCLE.md](../DOCUMENT_LIFECYCLE.md)
