# Cross-Cutting Concerns

| Field | Value |
| --- | --- |
| Document ID | PLAT-CONCERNS-001 |
| Status | Active |
| Owner | Clada Systems Architecture |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines cross-cutting concerns that apply across Clada OS capabilities, product modules, shared services, integrations, infrastructure, and developer tooling.

## Scope

This applies to platform and product architecture decisions. Cross-cutting concerns are not capability categories and should not be used to hide ownership.

## Why

Some requirements affect every layer of the system. Security, privacy, auditability, human review, accessibility, reliability, observability, and AI governance cannot be solved once in a single module.

Clada OS needs explicit cross-cutting rules so these concerns are designed into capabilities and APIs from the start.

## What

Cross-cutting concerns include:

| Concern | Applies to | Rule |
| --- | --- | --- |
| Security | All layers | Access must be intentional, least-privilege, and reviewable. |
| Privacy and data protection | Customer, document, communication, AI, integrations | Personal data must be collected, stored, shared, and retained deliberately. |
| Auditability | Workflow, AI, document, communications, finance, compliance | Material actions should leave enough evidence for review. |
| Human review | Customer, compliance, finance, legal, grant applications | Review checkpoints must be explicit before consequential outputs are finalized. |
| AI governance | AI assistance, document extraction, eligibility, summaries | AI output must be traceable, reviewable, and bounded by product promises. |
| Reliability | Runtime, integrations, workflows | Failures should be visible and recoverable. |
| Observability | Platform operations and support | Important workflows should produce useful support and operational signals. |
| Accessibility | User-facing product surfaces | Workflows should be usable by the intended users and avoid unnecessary barriers. |
| Module consistency | Product modules | Reusable platform behavior should feel consistent while allowing domain-specific language. |

## How

Apply cross-cutting concerns during planning:

1. Identify which concerns are relevant to the change.
2. Add them to the feature specification or ADR when they affect design.
3. Define any required audit event, review state, access rule, or retention rule.
4. Avoid burying compliance or safety behavior inside product copy.
5. Validate the concern during review, not after release.

## Examples

Document extraction is an AI-assisted workflow. It needs privacy controls for uploaded documents, audit events for extraction attempts, confidence or uncertainty output, and human review before customer or grant-facing decisions are finalized.

Lead intake is a customer-data workflow. It needs validation, consent-aware communications, secure storage, auditability, and clear handoff into customer records and workflow tracking.

## Related Documents

- [PLATFORM_PRINCIPLES.md](PLATFORM_PRINCIPLES.md)
- [PLATFORM_API_PHILOSOPHY.md](PLATFORM_API_PHILOSOPHY.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [../03-engineering/AI_ENGINEERING_RULES.md](../03-engineering/AI_ENGINEERING_RULES.md)
- [../engineering/security-and-gdpr.md](../engineering/security-and-gdpr.md)
