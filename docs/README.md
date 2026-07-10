# Clada Operating Manual

| Field | Value |
| --- | --- |
| Document ID | COM-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

The Clada Operating Manual (COM) is the permanent source of truth for Clada Systems. It governs how Clada OS is planned, designed, built, reviewed, released, and maintained.

The COM is not a side document. It is a production asset. Engineering work that changes product behaviour, architecture, operations, security posture, or customer commitments must either follow the COM or update it through the documented lifecycle.

## Authority

Documentation authority follows this order:

1. [Constitution](CONSTITUTION.md)
2. [The Clada Way](THE_CLADA_WAY.md)
3. Clada Operating Manual
4. [Feature specifications](04-features/README.md)
5. [Sprint documents](06-sprints/README.md)
6. Implementation

Code never overrides a documented architectural decision. If code and documentation conflict, update the documentation first or create an Architecture Decision Record (ADR) explaining the justified exception.

## Platform Terminology

- Clada Systems is the company.
- Clada OS is the platform.
- SolarGRANT Pro is the first product module on Clada OS.
- SEAI grant workflows are the initial market workflow, not the limit of the platform.

Avoid introducing new language that treats SolarGRANT Pro as the overall company or platform.

## Manual Map

- [SUMMARY.md](SUMMARY.md): complete table of contents and document map.
- [CONSTITUTION.md](CONSTITUTION.md): highest authority for mission, identity, and non-negotiables.
- [THE_CLADA_WAY.md](THE_CLADA_WAY.md): operating philosophy and principles.
- [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md): metadata, IDs, naming, ownership, status, and writing rules.
- [DOCUMENT_LIFECYCLE.md](DOCUMENT_LIFECYCLE.md): how documents are proposed, reviewed, activated, maintained, and archived.
- [OPERATING_PRINCIPLES.md](OPERATING_PRINCIPLES.md): daily operating rules for engineering and product work.
- [00-company](00-company/README.md): Company Handbook covering vision, mission, values, strategy, positioning, customers, competitors, and glossary.
- [01-platform](01-platform/README.md): Clada OS platform architecture, capability ownership, module composition, evolution policy, and Platform Release 1.x execution roadmap.
- [01-product](01-product/README.md): platform and module strategy.
- [02-design](02-design/README.md): product design standards.
- [03-engineering](03-engineering/README.md): architecture, engineering standards, and AI engineering rules.
- [04-features](04-features/README.md): feature specification process and templates.
- [05-decisions](05-decisions/README.md): ADR process and decisions.
- [06-sprints](06-sprints/README.md): sprint planning and current milestone.
- [07-research](07-research/README.md): research process and evidence standards.
- [99-archive](99-archive/README.md): retired documents and historical material.

## Supporting Foundation References

The repository also contains earlier foundation documents. They are retained as supporting context and should be reconciled into the COM hierarchy over time rather than deleted silently. Canonical company guidance now lives in [00-company](00-company/README.md).

- [company/vision.md](company/vision.md)
- [company/positioning.md](company/positioning.md)
- [product/clada-os-vision.md](product/clada-os-vision.md)
- [product/solargrant-pro-current-state.md](product/solargrant-pro-current-state.md)
- [product/roadmap.md](product/roadmap.md)
- [product/feature-decision-framework.md](product/feature-decision-framework.md)
- [design/design-system.md](design/design-system.md)
- [design/ui-ux-principles.md](design/ui-ux-principles.md)
- [engineering/architecture.md](engineering/architecture.md)
- [engineering/security-and-gdpr.md](engineering/security-and-gdpr.md)
- [sprints/sprint-0-foundation.md](sprints/sprint-0-foundation.md)

## Required Reading Before Code Changes

Before changing application code, read:

1. This document.
2. [CONSTITUTION.md](CONSTITUTION.md).
3. [THE_CLADA_WAY.md](THE_CLADA_WAY.md).
4. [01-platform/README.md](01-platform/README.md) for platform or module-boundary changes.
5. [01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md](01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md) before Platform Release 1.x implementation work.
6. [06-sprints/ACTIVE_SPRINT.md](06-sprints/ACTIVE_SPRINT.md).
7. Any linked feature specification.
8. Any linked ADR.
9. The relevant engineering or design standard.

Small maintenance changes may be lighter, but no change may violate constitutional principles, documented decisions, or security and privacy expectations.

## Definition Of Done For Documentation

A document is done when it has a clear purpose, owner, status, reviewed date, references, decision impact, and next action. It should help a future developer or AI coding agent act without relying on private conversation history.
