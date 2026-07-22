# Release Specifications

| Field | Value |
| --- | --- |
| Document ID | GOV-REL-SPEC-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-22 |

This section stores permanent Master Release Specifications for Clada OS platform releases.

Do not use chat conversation as the durable source of release scope. A future platform release may be discussed in chat, but implementation may not begin until its approved Master Release Specification exists here.

## Purpose

Master Release Specifications define:

- executive summary;
- business context;
- strategic objectives;
- scope;
- out of scope;
- platform responsibilities;
- product responsibilities;
- architecture;
- domain model;
- database design;
- permissions;
- security;
- services;
- APIs;
- transactions;
- concurrency;
- threat analysis;
- failure modes;
- testing;
- validation;
- migration;
- sprint breakdown;
- deliverables;
- acceptance criteria;
- known deferrals;
- technical debt;
- future releases;
- CTO review;
- CEO approval;
- release sign-off.

## Naming Convention

Use explicit release names:

- `PLATFORM_RELEASE_1_4_[SHORT_NAME].md`
- `PLATFORM_RELEASE_1_5_[SHORT_NAME].md`
- `PLATFORM_RELEASE_2_0_[SHORT_NAME].md`

Use uppercase words separated by underscores to match existing sprint and release documentation conventions.

## Relationship To Release Governance

Release Governance is defined in [../release-governance](../release-governance/README.md).

Every Master Release Specification must follow [../release-governance/RELEASE_SPECIFICATION_TEMPLATE.md](../release-governance/RELEASE_SPECIFICATION_TEMPLATE.md).

## Relationship To The Clada Operating Manual

This section is part of the Clada Operating Manual. The COM remains the source of truth for how Clada Systems plans, designs, builds, reviews, releases, and maintains Clada OS.

Release specifications must link to relevant roadmap entries, feature specifications, ADRs, sprint records, validation evidence, and release sign-off notes.

## Current Specifications

- [PLATFORM_RELEASE_1_4_MASTER_SPECIFICATION.md](PLATFORM_RELEASE_1_4_MASTER_SPECIFICATION.md): Approved Master Specification for Platform Release 1.4 - Document Foundation; its implementation sign-off remains pending in that document on the current baseline.
- [PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md](PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md): Proposed amended Master Specification for Platform Release 1.5 - Lead Workspace, Manual Lead Creation and Document Management; prior approval is superseded, CTO/CEO re-approval is pending, PR 7 retains the Release 1.4 dependency, and implementation has not begun.

Draft specifications do not authorise implementation. Approved specifications authorise only the implementation scope and sequence explicitly recorded in their approval and sprint sections.
