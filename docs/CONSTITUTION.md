# Clada Systems Constitution

| Field | Value |
| --- | --- |
| Document ID | GOV-CONSTITUTION-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Quarterly, with changes requiring explicit ADR |
| Last reviewed | 2026-07-08 |

This constitution is the highest authority in the repository. It defines the durable intent behind Clada Systems, Clada OS, and the first product module, SolarGRANT Pro.

## Mission

Clada Systems builds the operating system for contractor-led businesses.

The first entry market is the Irish solar industry. The first product module is SolarGRANT Pro. The long-term platform is Clada OS, a modular operating system that can support operational workflows across solar, electrical, HVAC, plumbing, roofing, construction, landscaping, renewable energy, and adjacent contractor-led industries.

## Identity

- Clada Systems is the company.
- Clada OS is the platform.
- SolarGRANT Pro is the first product module.
- Solar grant assistance is the initial workflow, not the company identity.

Repository language, architecture, and documentation must preserve this distinction.

## Non-Negotiables

1. Customer reality comes first. The platform exists to improve real contractor operations.
2. Documentation is a production asset. It must be maintained with the same care as code.
3. Simplicity wins. Complexity must be justified by customer value or long-term maintainability.
4. Trust is a feature. Reliability, security, privacy, consistency, and professionalism are product requirements.
5. Architecture must support long-term platform expansion beyond solar.
6. AI assists the product and the team. AI is not the product.
7. Code implements documented decisions. Undocumented major changes are incomplete.

## Platform Principle

Build reusable Clada OS capabilities before building one-off SolarGRANT Pro implementations, unless a focused module implementation is the simplest justified step.

Reusable does not mean abstract for its own sake. A capability becomes platform-level when it is likely to serve more than one contractor workflow, customer type, or product module.

## Decision Authority

When a conflict exists, authority is resolved in this order:

1. Constitution
2. The Clada Way
3. Operating Manual
4. Architecture Decision Records
5. Feature specifications
6. Sprint documents
7. Implementation

Implementation that conflicts with a higher-authority document must be corrected, documented, or escalated through an ADR.

## Change Process

Changing this constitution requires:

1. A written rationale.
2. A proposed amendment.
3. An ADR describing the trade-off.
4. Review by Clada Systems leadership.
5. Updates to all dependent documentation.

No automated agent may change constitutional intent without explicit human instruction.

## What Next

Use this constitution as the first check before product, design, architecture, and implementation decisions. If a proposed change does not support the mission, improve trust, or strengthen maintainability, it should not proceed.
