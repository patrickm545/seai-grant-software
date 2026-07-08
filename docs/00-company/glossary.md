# Company Glossary

| Field | Value |
| --- | --- |
| Document ID | COMP-GLOSSARY-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-08 |

This document defines controlled vocabulary for Clada Systems, Clada OS, SolarGRANT Pro, and the Clada Operating Manual. Use these terms consistently across documentation, code comments, feature specifications, ADRs, sprint documents, product copy, and AI-generated work.

## Why This Exists

Terminology is architecture. If the repository uses unclear language, future decisions will become unclear.

This glossary prevents the company, platform, module, workflow, and documentation system from being confused with each other. It supports [ADR-0001](../05-decisions/ADR-0001-clada-os-terminology.md), which established the core terminology for Clada OS.

## Controlled Terms

### Clada Systems

The company.

Use when referring to the organisation, leadership, strategy, commercial direction, or company-level decisions.

Do not use Clada Systems as the product name.

### Clada OS

The platform.

Use when referring to reusable platform capabilities, shared product architecture, cross-module concepts, or the long-term operational software platform for contractor-led businesses.

Do not use Clada OS to describe solar-specific rules unless the document is explaining how a SolarGRANT Pro workflow may become a reusable platform capability.

### SolarGRANT Pro

The first product module on Clada OS.

Use when referring to Irish solar installers, SEAI grant-related workflows, solar-specific lead qualification, module-specific screens, or module-specific customer language.

Do not describe SolarGRANT Pro as the full company or platform.

### Module

A focused product experience built on Clada OS for a specific market, workflow, or customer domain.

SolarGRANT Pro is the first module.

### Platform Capability

A reusable Clada OS capability that may support more than one module or workflow.

Examples may include intake, qualification, document review, audit trails, customer records, status tracking, and human-reviewed automation.

Do not call a feature a platform capability until reuse is plausible and the boundary is documented.

### Feature

A discrete product capability delivered to users or internal operators.

Features should be described in feature specifications when they meaningfully affect product behaviour, workflow, risk, or architecture.

### Workflow

A sequence of operational steps that moves work from one state to another.

Examples include lead qualification, document collection, installer review, customer follow-up, and submission preparation support.

### Sprint

A bounded delivery period with a stated objective, scope, exclusions, and definition of done.

Sprint documents live in the [Sprint Framework](../06-sprints/README.md).

### ADR

Architecture Decision Record.

Use an ADR to document material decisions that affect architecture, platform boundaries, terminology, data handling, security, automation posture, or long-term maintainability.

ADRs live in [docs/05-decisions](../05-decisions/README.md).

### Clada Operating Manual

The permanent source of truth for how Clada Systems plans, designs, builds, reviews, releases, and maintains Clada OS.

The manual begins at [docs/README.md](../README.md).

### Operating Manual

Short form of Clada Operating Manual. Use only when the Clada context is already clear.

### Project Atlas

The foundation programme establishing Clada Systems' documentation, governance, platform terminology, and operating model.

Project Atlas work should improve the company operating system before or alongside product implementation.

### Foundation Release 1.0

The release programme for establishing the Clada Operating Manual and the first durable company, product, design, engineering, decision, sprint, and research structures.

### Documentation First Development

The practice of documenting meaningful decisions before or with implementation.

Documentation First Development applies to product behaviour, architecture, platform boundaries, customer commitments, data handling, privacy, security, automation, and major workflow changes.

It does not require long documents for trivial edits.

### Customer Reality

The principle that real customer operations should guide product decisions more than internal assumptions, abstract process design, or technical preference.

### Trust As A Product Feature

The principle that reliability, privacy, auditability, consistency, professional communication, clear status, and human review are part of the product experience.

### Human-Reviewed Automation

Automation that assists users while preserving explicit human review for decisions that affect customer commitments, compliance, submissions, eligibility, or business-critical records.

Use this term instead of implying unrestricted automation.

### Contractor-Led Business

A business where skilled trade, installation, field service, or project delivery work drives operations.

Examples may include solar, electrical, HVAC, plumbing, roofing, construction, landscaping, retrofit, renewable energy, and adjacent service businesses.

### Primary Customer

The customer segment Clada Systems is actively building for now.

For the current strategy, the primary customer is the Irish solar installation business using SolarGRANT Pro.

### Secondary Customer

A person or group meaningfully affected by the product but not necessarily the buyer.

For SolarGRANT Pro, homeowners are a secondary customer because their experience influences installer trust and adoption.

### Future Expansion Customer

A potential future customer segment that may be served by Clada OS after product-market fit in the first market.

Future expansion customers should inform strategy and architecture but should not create implementation scope until approved.

### Product-Market Fit

Evidence that a defined customer segment repeatedly adopts, values, and depends on the product enough to justify continued investment and expansion.

In this repository, product-market fit should be assessed for SolarGRANT Pro before implementing future industry modules.

### Installer

A solar installation business or operational user within that business. Use "installer" carefully when the context may refer either to the company or a field technician.

### Homeowner

The end customer served by a solar installer through SolarGRANT Pro workflows.

### Lead

A potential customer or project opportunity requiring qualification, follow-up, and operational context.

### Qualification

The process of deciding whether a lead is suitable for the next step based on customer information, site context, grant-related criteria, business fit, and operational readiness.

### Document Review

The collection, checking, and status management of documents required for a workflow.

Document review may be assisted by automation but should remain human-reviewed where accuracy affects customer commitments, submissions, or compliance.

### Audit Trail

A record of meaningful actions, status changes, reviews, or decisions that helps users understand what happened and why.

### Operating Data

Business information used to run workflows, including leads, customers, documents, statuses, communication history, tasks, assignments, and review outcomes.

### SEAI

Sustainable Energy Authority of Ireland.

Use only when referring to the Irish solar grant context or related SolarGRANT Pro workflows.

### Grant Workflow

A SolarGRANT Pro workflow related to eligibility, document preparation, review, or support for grant-related customer work.

Do not use grant workflow as a synonym for Clada OS.

### Extraction Candidate

A module-specific feature or pattern that may become a reusable Clada OS platform capability after evidence shows the pattern is repeatable.

### Experiment

A narrow, intentionally limited test of a product, workflow, or technical idea.

Experiments should not be treated as platform direction until reviewed and documented.

### AI Coding Agent

An AI system assisting with code, documentation, research, or repository operations.

AI coding agents must follow the [AI Engineering Rules](../03-engineering/AI_ENGINEERING_RULES.md), preserve Clada OS terminology, and avoid changing constitutional intent without explicit human instruction.

## Preferred Usage

Use:

- "Clada Systems builds Clada OS."
- "SolarGRANT Pro is the first product module."
- "This feature strengthens SolarGRANT Pro and may become a Clada OS extraction candidate."
- "The workflow requires human-reviewed automation."

Avoid:

- "SolarGRANT Pro is the platform."
- "Clada OS is a solar grant checker."
- "Fully automated grant decisions."
- "Generic SaaS for contractors."
- "AI-first operating system."

## Related Documents

- [Company Handbook](README.md)
- [Positioning](positioning.md)
- [Clada OS Product Model](../01-product/CLADA_OS_PRODUCT_MODEL.md)
- [SolarGRANT Pro Module](../01-product/SOLARGRANT_PRO_MODULE.md)
- [ADR-0001](../05-decisions/ADR-0001-clada-os-terminology.md)
- [AI Engineering Rules](../03-engineering/AI_ENGINEERING_RULES.md)
