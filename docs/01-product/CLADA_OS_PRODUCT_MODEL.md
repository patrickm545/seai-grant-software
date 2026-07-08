# Clada OS Product Model

| Field | Value |
| --- | --- |
| Document ID | PROD-CLADA-OS-001 |
| Status | Active |
| Owner | Clada Systems Product |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

Clada OS is the long-term platform for contractor-led businesses. It should support repeatable operational workflows across multiple industries while staying grounded in the first market: Irish solar.

For the canonical platform capability taxonomy, ownership model, and dependency rules, use [../01-platform/README.md](../01-platform/README.md).

## Platform Capabilities

Potential Clada OS capabilities include:

- lead intake and qualification
- customer records and communication history
- workflow status tracking
- document collection and review
- pricing and estimate support
- audit trails
- portal experiences
- human-reviewed automation
- installer or contractor dashboards
- compliance-aware data handling

These capabilities should become platform-level only when there is evidence they can serve more than one module or workflow.

## Module Model

A product module packages platform capabilities for a specific market workflow. The module may have its own terminology, forms, validation rules, integrations, templates, and dashboards.

SolarGRANT Pro is the first module. Future modules may serve electrical, HVAC, plumbing, roofing, construction, landscaping, renewable energy, or other contractor-led markets.

## Product Guardrails

- Do not over-generalise before market evidence exists.
- Do not hard-code solar assumptions into reusable platform concepts without documenting the trade-off.
- Preserve human review where automation affects customer submissions, eligibility, compliance, or business-critical records.
- Prefer workflow clarity over novelty.

## What Next

Future feature specs should name whether the proposed work strengthens Clada OS, SolarGRANT Pro, or both.
